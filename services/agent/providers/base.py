"""
DataProvider abstract interface (Python Protocol).
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from models import HCPProfile, Offer, VisitLog


@runtime_checkable
class DataProvider(Protocol):
    """Abstract interface for all data providers."""

    async def get_hcp_profiles(self, mr_id: str, tenant_id: str) -> list[HCPProfile]:
        """Return all active HCP profiles assigned to an MR."""
        ...

    async def get_visit_logs(
        self,
        hcp_id: str,
        mr_id: str,
        tenant_id: str,
        months: int = 18,
    ) -> list[VisitLog]:
        """Return visit logs for an HCP/MR pair, sorted by date descending."""
        ...

    async def get_offers(self, tenant_id: str) -> list[Offer]:
        """Return active, non-expired offers for a tenant."""
        ...
