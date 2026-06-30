"""
LiveDataProvider — connects to the production PostgreSQL database.
Wired up in Phase 5 CRM integration.
"""

from __future__ import annotations

from models import HCPProfile, Offer, VisitLog


class LiveDataProvider:
    """
    TODO (Phase 5): Implement real CRM + database queries.
    Raises NotImplementedError until wired up.
    """

    async def get_hcp_profiles(self, mr_id: str, tenant_id: str) -> list[HCPProfile]:
        raise NotImplementedError(
            "LiveDataProvider.get_hcp_profiles is not yet implemented. "
            "Set DATA_MODE=MOCK to use synthetic data."
        )

    async def get_visit_logs(
        self,
        hcp_id: str,
        mr_id: str,
        tenant_id: str,
        months: int = 18,
    ) -> list[VisitLog]:
        raise NotImplementedError(
            "LiveDataProvider.get_visit_logs is not yet implemented."
        )

    async def get_offers(self, tenant_id: str) -> list[Offer]:
        raise NotImplementedError(
            "LiveDataProvider.get_offers is not yet implemented."
        )
