"""
NBA Scoring Engine — computes priority_score (0–100) per HCP.

Formula (weighted sum):
  score = w_gap * gap_score
        + w_tier * tier_score
        + w_therapy * therapy_score
        + w_acceptance * acceptance_score

Weights are loaded from configs/pharma.yaml (VerticalConfig).
"""

from __future__ import annotations

import math
import structlog
import yaml
from pathlib import Path

from models import GapSignal, HCPSignal, PipelineState, PrescriberTier, ScoredHCP, UrgencyLevel

logger = structlog.get_logger(__name__)

_CONFIG_PATH = Path(__file__).parent.parent / "configs" / "pharma.yaml"

_DEFAULT_WEIGHTS = {
    "gap": 0.40,
    "tier": 0.30,
    "therapy": 0.15,
    "acceptance": 0.15,
}

_TIER_SCORES = {
    PrescriberTier.TIER_1: 100.0,
    PrescriberTier.TIER_2: 60.0,
    PrescriberTier.TIER_3: 30.0,
}

_THERAPY_PRIORITY = {
    "ONCOLOGY": 100.0,
    "CARDIOLOGY": 85.0,
    "DIABETOLOGY": 70.0,
    "NEUROLOGY": 55.0,
    "RESPIRATORY": 40.0,
}


def _load_weights() -> dict[str, float]:
    try:
        with open(_CONFIG_PATH) as f:
            config = yaml.safe_load(f)
            return config.get("scoring", {}).get("weights", _DEFAULT_WEIGHTS)
    except FileNotFoundError:
        return _DEFAULT_WEIGHTS


def _gap_score(days: int, threshold: int) -> float:
    """Sigmoid-like score that increases with gap days. Saturates at ~200 days."""
    if days <= 0:
        return 0.0
    over = max(0, days - threshold)
    return min(100.0, 50.0 + 50.0 * (1 - math.exp(-over / 30.0)))


def _urgency(score: float) -> UrgencyLevel:
    if score >= 70:
        return UrgencyLevel.HIGH
    if score >= 40:
        return UrgencyLevel.MEDIUM
    return UrgencyLevel.LOW


def _compute_score(
    signal: HCPSignal,
    gap_signal: GapSignal,
    weights: dict[str, float],
) -> tuple[float, dict[str, float]]:
    gap_s = _gap_score(gap_signal.days_since_last_visit, gap_signal.gap_threshold_days)
    tier_s = _TIER_SCORES.get(signal.tier, 30.0)
    therapy_s = _THERAPY_PRIORITY.get(signal.specialty.value, 50.0)
    acceptance_s = (1.0 - signal.acceptance_rate) * 100.0

    raw = (
        weights.get("gap", 0.4) * gap_s
        + weights.get("tier", 0.3) * tier_s
        + weights.get("therapy", 0.15) * therapy_s
        + weights.get("acceptance", 0.15) * acceptance_s
    )
    total_score = min(100.0, max(0.0, raw))

    components = {
        "gap_score": round(gap_s, 2),
        "tier_score": round(tier_s, 2),
        "therapy_score": round(therapy_s, 2),
        "acceptance_score": round(acceptance_s, 2),
        "raw": round(raw, 2),
    }
    return round(total_score, 2), components


async def run_scoring_engine(state: PipelineState) -> PipelineState:
    """LangGraph node: compute priority scores for all HCPs."""
    weights = _load_weights()
    logger.info("scoring_engine_start", mr_id=state.mr_id, hcps=len(state.gap_signals))

    gap_map = {g.hcp_id: g for g in state.gap_signals}
    signal_map = {s.hcp_id: s for s in state.signals}

    scored: list[ScoredHCP] = []
    for hcp_id, gap_signal in gap_map.items():
        signal = signal_map.get(hcp_id)
        if signal is None:
            continue
        score, components = _compute_score(signal, gap_signal, weights)
        scored.append(
            ScoredHCP(
                hcp_id=hcp_id,
                mr_id=state.mr_id,
                priority_score=score,
                urgency_level=_urgency(score),
                score_components=components,
                tenant_id=state.tenant_id,
            )
        )

    scored.sort(key=lambda x: x.priority_score, reverse=True)

    updated = state.model_copy(update={
        "scored_hcps": scored,
        "step_results": {
            **state.step_results,
            "scoring_engine": {
                "hcps_scored": len(scored),
                "high": sum(1 for s in scored if s.urgency_level == UrgencyLevel.HIGH),
                "medium": sum(1 for s in scored if s.urgency_level == UrgencyLevel.MEDIUM),
                "low": sum(1 for s in scored if s.urgency_level == UrgencyLevel.LOW),
            },
        },
    })

    logger.info("scoring_engine_complete", mr_id=state.mr_id, scored=len(scored))
    return updated
