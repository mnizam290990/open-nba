"""
OfferAdapter Protocol — typed interface for offer catalog adapters.
Implement this Protocol to plug in a new offer source without changing
the core OfferRecommendationAgent.
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from models import Offer


@runtime_checkable
class OfferAdapter(Protocol):
    """
    Typed interface for offer catalog adapters.
    All implementations must satisfy this Protocol.
    """

    async def fetch_offers(
        self,
        specialty: str,
        campaign: str | None = None,
    ) -> list[Offer]:
        """
        Return active, non-expired offers that match the given specialty
        and optional campaign identifier.
        """
        ...

    async def check_eligibility(
        self,
        hcp_id: str,
        offer_id: str,
        context: dict[str, Any] | None = None,
    ) -> bool:
        """
        Return True if the HCP is eligible for the given offer.
        Must return False (not raise) if the rule engine is unreachable.
        """
        ...
