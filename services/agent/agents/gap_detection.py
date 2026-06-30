"""
GapDetectionAgent — flags HCPs whose last visit exceeds the configured threshold.
Threshold is loaded from VerticalConfig and is hot-reloadable.
"""

from __future__ import annotations

import structlog

from config import get_settings
from models import GapSignal, HCPSignal, PipelineState

logger = structlog.get_logger(__name__)


def _get_gap_threshold() -> int:
    """Read threshold from settings (refreshed each call for hot-reload)."""
    return get_settings().gap_threshold_days


async def run_gap_detection(state: PipelineState) -> PipelineState:
    """LangGraph node: flag HCPs with visit gaps."""
    threshold = _get_gap_threshold()
    logger.info(
        "gap_detection_start",
        mr_id=state.mr_id,
        threshold_days=threshold,
        signals=len(state.signals),
    )

    gap_signals: list[GapSignal] = []

    for signal in state.signals:
        days = signal.days_since_last_visit
        if days is None:
            # No visit history — treat as infinite gap
            days = 9999

        is_flagged = days > threshold

        gap_signals.append(
            GapSignal(
                hcp_id=signal.hcp_id,
                mr_id=signal.mr_id,
                days_since_last_visit=days,
                is_gap_flagged=is_flagged,
                gap_threshold_days=threshold,
                tenant_id=signal.tenant_id,
            )
        )

    flagged_count = sum(1 for g in gap_signals if g.is_gap_flagged)

    updated = state.model_copy(update={
        "gap_signals": gap_signals,
        "step_results": {
            **state.step_results,
            "gap_detection": {
                "total_evaluated": len(gap_signals),
                "flagged": flagged_count,
                "threshold_days": threshold,
            },
        },
    })

    logger.info(
        "gap_detection_complete",
        mr_id=state.mr_id,
        flagged=flagged_count,
        total=len(gap_signals),
    )
    return updated
