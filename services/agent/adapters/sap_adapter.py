"""
SAPAdapter stub — returns mock data until SAP integration is implemented.
TODO: Implement SAP REST API calls in Phase 1.
"""

from __future__ import annotations

from typing import Any

import structlog

from models import Offer

logger = structlog.get_logger(__name__)


class SAPAdapter:
    """
    Stub adapter for SAP offer catalog.
    Returns mock data in Phase 0.
    """

    async def fetch_offers(
        self,
        specialty: str,
        campaign: str | None = None,
    ) -> list[Offer]:
        logger.warning("sap_adapter_stub", specialty=specialty, campaign=campaign)
        return []

    async def check_eligibility(
        self,
        hcp_id: str,
        offer_id: str,
        context: dict[str, Any] | None = None,
    ) -> bool:
        return True
