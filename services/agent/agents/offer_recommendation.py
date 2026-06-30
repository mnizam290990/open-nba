"""
OfferRecommendationAgent — matches HCP specialty + campaign to offer catalog.
- Attaches exactly one offer per HCP card.
- Returns None if no match or OPA engine is unreachable.
- Falls back to "Offers temporarily unavailable" if OPA is down.
"""

from __future__ import annotations

import structlog
from models import NBACard, Offer, PipelineState

logger = structlog.get_logger(__name__)

OPA_AVAILABLE = True  # Will be set to False if OPA is unreachable


def _opa_check_eligibility(hcp_tier: str, hcp_specialty: str, offer: Offer) -> bool:
    """
    Evaluate HCP eligibility against offer rules.
    Phase 0: uses a simple rule-based check (OPA stub).
    """
    rules = offer.eligibility_rules

    if "specialty" in rules and rules["specialty"] != hcp_specialty:
        return False

    tier_order = {"TIER_1": 1, "TIER_2": 2, "TIER_3": 3}
    if "minTier" in rules:
        min_tier = tier_order.get(rules["minTier"], 3)
        hcp_tier_val = tier_order.get(hcp_tier, 3)
        if hcp_tier_val > min_tier:
            return False

    return True


def _match_offer(hcp_specialty: str, hcp_tier: str, offers: list[Offer]) -> Offer | None:
    """Return the best matching offer for an HCP, or None."""
    global OPA_AVAILABLE

    if not OPA_AVAILABLE:
        logger.warning("opa_unavailable_denying_offers")
        return None

    candidates = []
    for offer in offers:
        try:
            if _opa_check_eligibility(hcp_tier, hcp_specialty, offer):
                candidates.append(offer)
        except Exception as exc:
            logger.warning("opa_check_failed", offer_id=offer.offer_id, error=str(exc))
            OPA_AVAILABLE = False
            return None

    if not candidates:
        return None

    specialty_exact = [o for o in candidates if o.therapy_area.value == hcp_specialty]
    return specialty_exact[0] if specialty_exact else candidates[0]


async def run_offer_recommendation(
    state: PipelineState,
    offers: list[Offer],
) -> PipelineState:
    """LangGraph node: attach a recommended offer to each NBA card."""
    signal_map = {s.hcp_id: s for s in state.signals}

    enriched_cards: list[NBACard] = []
    for card in state.nba_cards:
        signal = signal_map.get(card.hcp_id)
        if signal:
            matched_offer = _match_offer(
                hcp_specialty=signal.specialty.value,
                hcp_tier=signal.tier.value,
                offers=offers,
            )
        else:
            matched_offer = None

        enriched_cards.append(card.model_copy(update={"offer": matched_offer}))

    updated = state.model_copy(update={
        "nba_cards": enriched_cards,
        "step_results": {
            **state.step_results,
            "offer_recommendation": {
                "cards_with_offer": sum(1 for c in enriched_cards if c.offer is not None),
                "cards_without_offer": sum(1 for c in enriched_cards if c.offer is None),
                "opa_available": OPA_AVAILABLE,
            },
        },
    })

    logger.info(
        "offer_recommendation_complete",
        mr_id=state.mr_id,
        matched=sum(1 for c in enriched_cards if c.offer),
    )
    return updated
