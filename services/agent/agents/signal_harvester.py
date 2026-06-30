"""
SignalHarvesterAgent — ingest visit logs, CRM events, HCP specialty metadata.
Normalises inputs into typed HCPSignal models.
Routes malformed records to dead_letter_queue.
"""

from __future__ import annotations

import structlog
from datetime import date

from models import HCPSignal, PipelineState, VisitLog
from providers.base import DataProvider

logger = structlog.get_logger(__name__)


def _days_since(visit_date: date | None) -> int | None:
    if visit_date is None:
        return None
    return (date.today() - visit_date).days


def _acceptance_rate(visits: list[VisitLog]) -> float:
    if not visits:
        return 0.0
    completed = sum(1 for v in visits if v.outcome == "COMPLETED")
    return round(completed / len(visits), 4)


async def run_signal_harvester(
    state: PipelineState,
    provider: DataProvider,
) -> PipelineState:
    """LangGraph node: harvest and normalise HCP signals."""
    logger.info("signal_harvester_start", mr_id=state.mr_id, run_id=state.run_id)

    hcps = await provider.get_hcp_profiles(state.mr_id, state.tenant_id)
    signals: list[HCPSignal] = []
    dead_letters = list(state.dead_letter_queue)

    for hcp in hcps:
        # Skip inactive HCPs
        if not hcp.is_active:
            continue

        visits = await provider.get_visit_logs(
            hcp_id=hcp.hcp_id,
            mr_id=state.mr_id,
            tenant_id=state.tenant_id,
        )

        # Validate required fields
        if not hcp.hcp_id or not hcp.specialty:
            logger.warning(
                "signal_harvester_dead_letter",
                reason="missing_required_fields",
                hcp_id=getattr(hcp, "hcp_id", "UNKNOWN"),
            )
            dead_letters.append({
                "source": "signal_harvester",
                "reason": "missing_required_fields",
                "record": hcp.model_dump(),
            })
            continue

        # Deduplicate visits: keep row with the latest created_at per visit_date
        seen: dict[date, VisitLog] = {}
        for v in visits:
            if v.visit_date not in seen or v.created_at > seen[v.visit_date].created_at:
                seen[v.visit_date] = v
        deduped_visits = sorted(seen.values(), key=lambda x: x.visit_date, reverse=True)

        last_visit = deduped_visits[0].visit_date if deduped_visits else None

        signal = HCPSignal(
            hcp_id=hcp.hcp_id,
            mr_id=state.mr_id,
            specialty=hcp.specialty,
            tier=hcp.tier,
            territory=hcp.territory,
            last_visit_date=last_visit,
            days_since_last_visit=_days_since(last_visit),
            visit_count_18m=len(deduped_visits),
            acceptance_rate=_acceptance_rate(deduped_visits),
            recent_notes=[v.notes for v in deduped_visits[:5] if v.notes],
            tenant_id=state.tenant_id,
        )
        signals.append(signal)

    updated = state.model_copy(update={
        "signals": signals,
        "dead_letter_queue": dead_letters,
        "step_results": {
            **state.step_results,
            "signal_harvester": {
                "hcps_processed": len(hcps),
                "signals_produced": len(signals),
                "dead_letters": len(dead_letters) - len(state.dead_letter_queue),
            },
        },
    })

    logger.info(
        "signal_harvester_complete",
        mr_id=state.mr_id,
        signals=len(signals),
        dead_letters=len(dead_letters),
    )
    return updated
