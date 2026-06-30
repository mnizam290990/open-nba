"""
Unit tests for the NBA Scoring Engine.
Covers: all-high inputs, all-low inputs, zero-history fallback.
"""

import pytest

from models import (
    GapSignal,
    HCPSignal,
    PipelineState,
    PrescriberTier,
    TherapyArea,
    UrgencyLevel,
)


def _make_scored_state(
    hcp_id: str,
    days: int,
    tier: PrescriberTier,
    specialty: TherapyArea,
    acceptance_rate: float = 0.8,
) -> PipelineState:
    signal = HCPSignal(
        hcp_id=hcp_id,
        mr_id="mr-001",
        specialty=specialty,
        tier=tier,
        territory="Test",
        days_since_last_visit=days,
        acceptance_rate=acceptance_rate,
        tenant_id="tenant-001",
    )
    gap_signal = GapSignal(
        hcp_id=hcp_id,
        mr_id="mr-001",
        days_since_last_visit=days,
        is_gap_flagged=days > 60,
        gap_threshold_days=60,
        tenant_id="tenant-001",
    )
    return PipelineState(
        mr_id="mr-001",
        run_id="run-001",
        tenant_id="tenant-001",
        signals=[signal],
        gap_signals=[gap_signal],
    )


@pytest.mark.asyncio
async def test_all_high_inputs_produces_high_urgency():
    """Tier-1 ONCOLOGY HCP with 180-day gap → HIGH urgency."""
    from agents.scoring_engine import run_scoring_engine

    state = _make_scored_state(
        "hcp-001",
        days=180,
        tier=PrescriberTier.TIER_1,
        specialty=TherapyArea.ONCOLOGY,
        acceptance_rate=0.2,
    )
    result = await run_scoring_engine(state)

    assert len(result.scored_hcps) == 1
    hcp = result.scored_hcps[0]
    assert hcp.urgency_level == UrgencyLevel.HIGH
    assert hcp.priority_score >= 70.0


@pytest.mark.asyncio
async def test_all_low_inputs_produces_low_urgency():
    """Tier-3 RESPIRATORY HCP with 10-day gap → LOW urgency."""
    from agents.scoring_engine import run_scoring_engine

    state = _make_scored_state(
        "hcp-001",
        days=10,
        tier=PrescriberTier.TIER_3,
        specialty=TherapyArea.RESPIRATORY,
        acceptance_rate=0.9,
    )
    result = await run_scoring_engine(state)

    hcp = result.scored_hcps[0]
    assert hcp.urgency_level == UrgencyLevel.LOW
    assert hcp.priority_score < 40.0


@pytest.mark.asyncio
async def test_zero_history_acceptance_rate_default():
    """HCP with no visit history (acceptance_rate=0.0) should still produce a score."""
    from agents.scoring_engine import run_scoring_engine

    state = _make_scored_state(
        "hcp-001",
        days=90,
        tier=PrescriberTier.TIER_2,
        specialty=TherapyArea.CARDIOLOGY,
        acceptance_rate=0.0,
    )
    result = await run_scoring_engine(state)

    assert len(result.scored_hcps) == 1
    assert result.scored_hcps[0].priority_score > 0


@pytest.mark.asyncio
async def test_scores_sorted_descending():
    """Multiple HCPs should be sorted by priority_score descending."""
    from agents.scoring_engine import run_scoring_engine
    from models import PipelineState

    signals = []
    gap_signals = []
    for i, (days, tier) in enumerate([
        (10, PrescriberTier.TIER_3),
        (180, PrescriberTier.TIER_1),
        (60, PrescriberTier.TIER_2),
    ]):
        hcp_id = f"hcp-{i}"
        signals.append(HCPSignal(
            hcp_id=hcp_id,
            mr_id="mr-001",
            specialty=TherapyArea.CARDIOLOGY,
            tier=tier,
            territory="T",
            days_since_last_visit=days,
            tenant_id="tenant-001",
        ))
        gap_signals.append(GapSignal(
            hcp_id=hcp_id,
            mr_id="mr-001",
            days_since_last_visit=days,
            is_gap_flagged=days > 60,
            gap_threshold_days=60,
            tenant_id="tenant-001",
        ))

    state = PipelineState(
        mr_id="mr-001", run_id="run-001", tenant_id="tenant-001",
        signals=signals, gap_signals=gap_signals,
    )
    result = await run_scoring_engine(state)

    scores = [s.priority_score for s in result.scored_hcps]
    assert scores == sorted(scores, reverse=True)
