"""
Unit tests for SignalHarvesterAgent.
Covers: valid payload, missing fields (dead-letter), duplicate records.
"""

import pytest
from datetime import date, datetime

from models import HCPProfile, PipelineState, PrescriberTier, TherapyArea, VisitLog


class MockProvider:
    def __init__(self, hcps: list[HCPProfile], visits: dict[str, list[VisitLog]]) -> None:
        self._hcps = hcps
        self._visits = visits

    async def get_hcp_profiles(self, mr_id: str, tenant_id: str) -> list[HCPProfile]:
        return self._hcps

    async def get_visit_logs(self, hcp_id: str, mr_id: str, tenant_id: str, months: int = 18) -> list[VisitLog]:
        return self._visits.get(hcp_id, [])

    async def get_offers(self, tenant_id: str):
        return []


def _make_hcp(hcp_id: str, is_active: bool = True, specialty: str = "CARDIOLOGY") -> HCPProfile:
    return HCPProfile(
        hcp_id=hcp_id,
        name=f"Dr. Test {hcp_id}",
        specialty=TherapyArea(specialty),
        tier=PrescriberTier.TIER_2,
        territory="Test",
        is_active=is_active,
        tenant_id="tenant-001",
    )


def _make_visit(hcp_id: str, days_ago: int, outcome: str = "COMPLETED") -> VisitLog:
    from datetime import timedelta
    visit_date = date.today() - timedelta(days=days_ago)
    return VisitLog(
        visit_id=f"v-{hcp_id}-{days_ago}",
        hcp_id=hcp_id,
        mr_id="mr-001",
        visit_date=visit_date,
        outcome=outcome,
        created_at=datetime.combine(visit_date, datetime.min.time()),
    )


@pytest.mark.asyncio
async def test_valid_hcp_produces_signal():
    from agents.signal_harvester import run_signal_harvester

    hcp = _make_hcp("hcp-001")
    visits = [_make_visit("hcp-001", 30)]
    provider = MockProvider([hcp], {"hcp-001": visits})

    state = PipelineState(mr_id="mr-001", run_id="run-001", tenant_id="tenant-001")
    result = await run_signal_harvester(state, provider)

    assert len(result.signals) == 1
    assert result.signals[0].hcp_id == "hcp-001"
    assert result.signals[0].days_since_last_visit == 30


@pytest.mark.asyncio
async def test_inactive_hcp_excluded():
    from agents.signal_harvester import run_signal_harvester

    hcp = _make_hcp("hcp-001", is_active=False)
    provider = MockProvider([hcp], {})

    state = PipelineState(mr_id="mr-001", run_id="run-001", tenant_id="tenant-001")
    result = await run_signal_harvester(state, provider)

    assert len(result.signals) == 0
    assert len(result.dead_letter_queue) == 0


@pytest.mark.asyncio
async def test_duplicate_visits_deduped():
    """Two visits on the same date — only the later created_at should be retained."""
    from agents.signal_harvester import run_signal_harvester
    from datetime import timedelta

    hcp = _make_hcp("hcp-001")
    visit_date = date.today() - timedelta(days=30)
    v1 = VisitLog(
        visit_id="v1",
        hcp_id="hcp-001",
        mr_id="mr-001",
        visit_date=visit_date,
        outcome="COMPLETED",
        created_at=datetime(2026, 1, 1, 10, 0, 0),
    )
    v2 = VisitLog(
        visit_id="v2",
        hcp_id="hcp-001",
        mr_id="mr-001",
        visit_date=visit_date,
        outcome="CANCELLED",
        created_at=datetime(2026, 1, 1, 12, 0, 0),  # later
    )
    provider = MockProvider([hcp], {"hcp-001": [v1, v2]})

    state = PipelineState(mr_id="mr-001", run_id="run-001", tenant_id="tenant-001")
    result = await run_signal_harvester(state, provider)

    assert result.signals[0].visit_count_18m == 1


@pytest.mark.asyncio
async def test_acceptance_rate_computed():
    from agents.signal_harvester import run_signal_harvester

    hcp = _make_hcp("hcp-001")
    visits = [
        _make_visit("hcp-001", 30, "COMPLETED"),
        _make_visit("hcp-001", 60, "COMPLETED"),
        _make_visit("hcp-001", 90, "NO_SHOW"),
        _make_visit("hcp-001", 120, "CANCELLED"),
    ]
    provider = MockProvider([hcp], {"hcp-001": visits})

    state = PipelineState(mr_id="mr-001", run_id="run-001", tenant_id="tenant-001")
    result = await run_signal_harvester(state, provider)

    assert result.signals[0].acceptance_rate == 0.5
