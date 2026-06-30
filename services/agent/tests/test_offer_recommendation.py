"""
Unit tests for OfferRecommendationAgent.
Covers: successful match, no match, OPA unavailable.
"""

import pytest
from datetime import date, timedelta

from models import (
    GapSignal,
    HCPSignal,
    NBACard,
    Offer,
    PipelineState,
    PrescriberTier,
    ScoredHCP,
    TherapyArea,
    UrgencyLevel,
)


def _make_offer(therapy_area: TherapyArea, title: str, **rules) -> Offer:
    return Offer(
        offer_id=f"offer-{title}",
        type="SAMPLE",
        therapy_area=therapy_area,
        title=title,
        eligibility_rules=dict(rules, specialty=therapy_area.value),
        expiry_date=date.today() + timedelta(days=90),
    )


def _make_state_with_card(hcp_id: str, specialty: TherapyArea, tier: PrescriberTier) -> PipelineState:
    signal = HCPSignal(
        hcp_id=hcp_id,
        mr_id="mr-001",
        specialty=specialty,
        tier=tier,
        territory="T",
        days_since_last_visit=30,
        tenant_id="tenant-001",
    )
    card = NBACard(
        hcp_id=hcp_id,
        mr_id="mr-001",
        priority_score=75.0,
        urgency_level=UrgencyLevel.HIGH,
        days_since_last_visit=30,
        tenant_id="tenant-001",
    )
    return PipelineState(
        mr_id="mr-001",
        run_id="run-001",
        tenant_id="tenant-001",
        signals=[signal],
        nba_cards=[card],
    )


@pytest.mark.asyncio
async def test_offer_matched_for_specialty():
    from agents.offer_recommendation import run_offer_recommendation

    state = _make_state_with_card("hcp-001", TherapyArea.CARDIOLOGY, PrescriberTier.TIER_2)
    offers = [
        _make_offer(TherapyArea.CARDIOLOGY, "Cardio Sample"),
        _make_offer(TherapyArea.ONCOLOGY, "Onco Detail"),
    ]
    result = await run_offer_recommendation(state, offers)

    assert result.nba_cards[0].offer is not None
    assert result.nba_cards[0].offer.therapy_area == TherapyArea.CARDIOLOGY


@pytest.mark.asyncio
async def test_no_offer_when_specialty_mismatch():
    from agents.offer_recommendation import run_offer_recommendation

    state = _make_state_with_card("hcp-001", TherapyArea.NEUROLOGY, PrescriberTier.TIER_2)
    offers = [
        _make_offer(TherapyArea.CARDIOLOGY, "Cardio Sample"),
    ]
    result = await run_offer_recommendation(state, offers)

    assert result.nba_cards[0].offer is None


@pytest.mark.asyncio
async def test_opa_unavailable_denies_all_offers(monkeypatch):
    """When OPA is unavailable, no offers should be attached."""
    import agents.offer_recommendation as mod
    monkeypatch.setattr(mod, "OPA_AVAILABLE", False)

    state = _make_state_with_card("hcp-001", TherapyArea.CARDIOLOGY, PrescriberTier.TIER_1)
    offers = [_make_offer(TherapyArea.CARDIOLOGY, "Cardio Sample")]
    result = await mod.run_offer_recommendation(state, offers)

    assert result.nba_cards[0].offer is None
    monkeypatch.setattr(mod, "OPA_AVAILABLE", True)


@pytest.mark.asyncio
async def test_tier_restriction_respected():
    """Offer with minTier=TIER_1 should not be given to TIER_3 HCP."""
    from agents.offer_recommendation import run_offer_recommendation

    state = _make_state_with_card("hcp-001", TherapyArea.CARDIOLOGY, PrescriberTier.TIER_3)
    offers = [
        Offer(
            offer_id="o1",
            type="SAMPLE",
            therapy_area=TherapyArea.CARDIOLOGY,
            title="Premium Cardio Sample",
            eligibility_rules={"specialty": "CARDIOLOGY", "minTier": "TIER_1"},
            expiry_date=date.today() + timedelta(days=90),
        )
    ]
    result = await run_offer_recommendation(state, offers)

    assert result.nba_cards[0].offer is None
