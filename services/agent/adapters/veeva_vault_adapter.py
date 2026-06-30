"""
VeevaVaultAdapter stub — returns mock data until Veeva Vault integration is implemented.
TODO: Implement Veeva Vault REST API calls in Phase 1.
"""

from __future__ import annotations

from typing import Any

import structlog

from models import Offer

logger = structlog.get_logger(__name__)

MOCK_VAULT_OFFERS = [
    Offer(
        offer_id="veeva-001",
        type="DETAIL_AID",
        therapy_area="CARDIOLOGY",
        title="[Veeva] Cardiology Detail Aid",
        asset_url=None,
    ),
]


class VeevaVaultAdapter:
    """
    Stub adapter for Veeva Vault CRM offer catalog.
    Returns mock data in Phase 0.
    """

    async def fetch_offers(
        self,
        specialty: str,
        campaign: str | None = None,
    ) -> list[Offer]:
        logger.warning("veeva_vault_adapter_stub", specialty=specialty, campaign=campaign)
        return [o for o in MOCK_VAULT_OFFERS if o.therapy_area == specialty]

    async def check_eligibility(
        self,
        hcp_id: str,
        offer_id: str,
        context: dict[str, Any] | None = None,
    ) -> bool:
        return True
