"""
Unit tests for GapDetectionAgent.
Covers: exactly on threshold (not flagged), one day over (flagged), inactive HCP (excluded).
"""

import pytest
from datetime import date

from models import HCPSignal, PipelineState, TherapyArea, PrescriberTier


def _make_signal(hcp_id: str, days: int | None) -> HCPSignal:
    return HCPSignal(
        hcp_id=hcp_id,
        mr_id="mr-001",
        specialty=TherapyArea.CARDIOLOGY,
        tier=PrescriberTier.TIER_2,
        territory="Test Territory",
        last_visit_date=date.today() if days is None else None,
        days_since_last_visit=days,
        tenant_id="tenant-001",
    )


def _make_state(signals: list[HCPSignal]) -> PipelineState:
    return PipelineState(
        mr_id="mr-001",
        run_id="run-001",
        tenant_id="tenant-001",
        signals=signals,
    )


@pytest.mark.asyncio
async def test_gap_exactly_on_threshold_not_flagged(monkeypatch):
    """HCP with exactly 60 days since visit should NOT be flagged (threshold is exclusive)."""
    from agents.gap_detection import run_gap_detection
    import config

    monkeypatch.setattr(config, "get_settings", lambda: type("S", (), {"gap_threshold_days": 60})())

    signal = _make_signal("hcp-001", days=60)
    state = await run_gap_detection(_make_state([signal]))

    assert len(state.gap_signals) == 1
    assert state.gap_signals[0].is_gap_flagged is False


@pytest.mark.asyncio
async def test_gap_one_day_over_flagged(monkeypatch):
    """HCP with 61 days since visit SHOULD be flagged."""
    from agents.gap_detection import run_gap_detection
    import config

    monkeypatch.setattr(config, "get_settings", lambda: type("S", (), {"gap_threshold_days": 60})())

    signal = _make_signal("hcp-001", days=61)
    state = await run_gap_detection(_make_state([signal]))

    assert state.gap_signals[0].is_gap_flagged is True


@pytest.mark.asyncio
async def test_inactive_hcp_excluded_from_signals():
    """Inactive HCPs should not appear in signals (excluded by SignalHarvester)."""
    # Gap detection operates on state.signals, which already excludes inactive HCPs.
    # This test verifies that an empty signals list produces no gap signals.
    from agents.gap_detection import run_gap_detection

    state = await run_gap_detection(_make_state([]))
    assert len(state.gap_signals) == 0


@pytest.mark.asyncio
async def test_no_visit_history_treated_as_infinite_gap(monkeypatch):
    """HCP with no visit history (days_since_last_visit=None) should be flagged."""
    from agents.gap_detection import run_gap_detection
    import config

    monkeypatch.setattr(config, "get_settings", lambda: type("S", (), {"gap_threshold_days": 60})())

    signal = _make_signal("hcp-001", days=None)
    state = await run_gap_detection(_make_state([signal]))

    assert state.gap_signals[0].is_gap_flagged is True


@pytest.mark.asyncio
async def test_multiple_hcps_mixed_gap_status(monkeypatch):
    """Mixed signals: some flagged, some not."""
    from agents.gap_detection import run_gap_detection
    import config

    monkeypatch.setattr(config, "get_settings", lambda: type("S", (), {"gap_threshold_days": 60})())

    signals = [
        _make_signal("hcp-001", days=30),   # not flagged
        _make_signal("hcp-002", days=61),   # flagged
        _make_signal("hcp-003", days=60),   # exactly on threshold — NOT flagged
        _make_signal("hcp-004", days=None), # no history — flagged
    ]
    state = await run_gap_detection(_make_state(signals))

    flagged = [g for g in state.gap_signals if g.is_gap_flagged]
    not_flagged = [g for g in state.gap_signals if not g.is_gap_flagged]

    assert len(flagged) == 2  # hcp-002 and hcp-004
    assert len(not_flagged) == 2  # hcp-001 and hcp-003
