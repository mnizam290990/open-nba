"""
AgentOrchestrator — wires all agents into a LangGraph pipeline.

Pipeline: Harvester → Gap Detection → Scoring → Context Synthesis → Offer Recommendation

Features:
- Per-step retry (3 attempts, exponential backoff: 1s, 2s, 4s)
- Hard 10-minute timeout per MR pipeline run
- On step failure: mark card as partially_enriched, continue
- Async execution with run_id for status polling
- No concurrent execution per MR (queued)
"""

from __future__ import annotations

import asyncio
import time
import uuid
from typing import Any

import structlog
from tenacity import AsyncRetrying, stop_after_attempt, wait_exponential

from agents.gap_detection import run_gap_detection
from agents.offer_recommendation import run_offer_recommendation
from agents.scoring_engine import run_scoring_engine
from agents.signal_harvester import run_signal_harvester
from config import get_settings
from models import PipelineState
from providers.base import DataProvider

logger = structlog.get_logger(__name__)


class AgentOrchestrator:
    def __init__(self, provider: DataProvider) -> None:
        self._provider = provider
        self._status: dict[str, dict[str, Any]] = {}
        self._active_runs: dict[str, str] = {}  # mr_id → run_id
        self._queue: asyncio.Queue[tuple[str, str]] = asyncio.Queue()
        self._worker_task: asyncio.Task | None = None

    def _ensure_worker(self) -> None:
        if self._worker_task is None or self._worker_task.done():
            loop = asyncio.get_event_loop()
            self._worker_task = loop.create_task(self._worker())

    async def enqueue_run(self, mr_id: str) -> str:
        run_id = str(uuid.uuid4())
        self._status[run_id] = {"run_id": run_id, "status": "QUEUED"}
        await self._queue.put((mr_id, run_id))
        self._ensure_worker()
        logger.info("pipeline_queued", mr_id=mr_id, run_id=run_id)
        return run_id

    def get_status(self, run_id: str) -> dict[str, Any] | None:
        return self._status.get(run_id)

    async def _worker(self) -> None:
        while True:
            mr_id, run_id = await self._queue.get()
            try:
                await self._execute_run(mr_id, run_id)
            except Exception as exc:
                logger.error("pipeline_worker_error", run_id=run_id, error=str(exc))
                self._status[run_id] = {
                    "run_id": run_id,
                    "status": "FAILED",
                    "error_message": str(exc),
                }
            finally:
                self._active_runs.pop(mr_id, None)
                self._queue.task_done()

    async def _execute_run(self, mr_id: str, run_id: str) -> None:
        settings = get_settings()
        timeout = settings.pipeline_timeout_seconds

        self._active_runs[mr_id] = run_id
        self._status[run_id]["status"] = "RUNNING"
        self._status[run_id]["started_at"] = time.time()

        logger.info("pipeline_start", mr_id=mr_id, run_id=run_id)

        state = PipelineState(
            mr_id=mr_id,
            run_id=run_id,
            tenant_id="00000000-0000-0000-0000-000000000001",
        )

        offers = await self._provider.get_offers(state.tenant_id)

        steps = [
            ("signal_harvester", lambda s: run_signal_harvester(s, self._provider)),
            ("gap_detection", lambda s: run_gap_detection(s)),
            ("scoring_engine", lambda s: run_scoring_engine(s)),
            ("context_synthesis", lambda s: _noop_context(s)),
            ("offer_recommendation", lambda s: run_offer_recommendation(s, offers)),
        ]

        try:
            state = await asyncio.wait_for(
                self._run_steps(state, steps),
                timeout=float(timeout),
            )
        except asyncio.TimeoutError:
            logger.error("pipeline_timeout", mr_id=mr_id, run_id=run_id)
            self._status[run_id].update({
                "status": "TIMEOUT",
                "error_message": f"Pipeline exceeded {timeout}s timeout",
                "cards_generated": len(state.nba_cards),
            })
            return

        is_partial = any(c.is_partially_enriched for c in state.nba_cards)
        final_status = "PARTIALLY_ENRICHED" if is_partial else "COMPLETED"

        self._status[run_id].update({
            "status": final_status,
            "cards_generated": len(state.nba_cards),
            "step_results": state.step_results,
        })

        logger.info(
            "pipeline_complete",
            mr_id=mr_id,
            run_id=run_id,
            status=final_status,
            cards=len(state.nba_cards),
        )

    async def _run_steps(
        self,
        state: PipelineState,
        steps: list[tuple[str, Any]],
    ) -> PipelineState:
        for step_name, step_fn in steps:
            try:
                async for attempt in AsyncRetrying(
                    stop=stop_after_attempt(3),
                    wait=wait_exponential(multiplier=1, min=1, max=4),
                    reraise=True,
                ):
                    with attempt:
                        t0 = time.time()
                        state = await step_fn(state)
                        logger.info(
                            "pipeline_step_complete",
                            step=step_name,
                            mr_id=state.mr_id,
                            latency_ms=int((time.time() - t0) * 1000),
                        )
            except Exception as exc:
                logger.error(
                    "pipeline_step_failed",
                    step=step_name,
                    mr_id=state.mr_id,
                    error=str(exc),
                )
                state = state.model_copy(update={
                    "errors": state.errors + [f"{step_name}: {exc}"],
                    "nba_cards": [
                        c.model_copy(update={"is_partially_enriched": True, "failed_steps": c.failed_steps + [step_name]})
                        for c in state.nba_cards
                    ] if state.nba_cards else state.nba_cards,
                })

        return state


async def _noop_context(state: PipelineState) -> PipelineState:
    """
    Placeholder for ContextSynthesisAgent in mock mode (no LLM key required).
    Returns scored HCPs as NBA cards with template content.
    """
    from models import NBACard, UrgencyLevel
    from agents.context_synthesis import TEMPLATE_TALKING_POINTS, TEMPLATE_SUMMARY

    signal_map = {s.hcp_id: s for s in state.signals}
    nba_cards = [
        NBACard(
            hcp_id=scored.hcp_id,
            mr_id=state.mr_id,
            priority_score=scored.priority_score,
            urgency_level=scored.urgency_level,
            days_since_last_visit=signal_map[scored.hcp_id].days_since_last_visit
            if scored.hcp_id in signal_map else None,
            summary=TEMPLATE_SUMMARY,
            talking_points=TEMPLATE_TALKING_POINTS,
            offer=None,
            is_partially_enriched=False,
            tenant_id=state.tenant_id,
        )
        for scored in state.scored_hcps
    ]
    return state.model_copy(update={"nba_cards": nba_cards})
