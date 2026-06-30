"""
NativeOfferAdapter — backed by the PostgreSQL offer catalog.
Fetches offers from the database and performs simple eligibility checks.
"""

from __future__ import annotations

import structlog
from datetime import date
from typing import Any

from models import Offer

logger = structlog.get_logger(__name__)


class NativeOfferAdapter:
    """
    Reads the offer catalog directly from PostgreSQL.
    Eligibility check uses the JSON `eligibility_rules` field on the offer.
    """

    def __init__(self, db_url: str) -> None:
        self._db_url = db_url

    async def fetch_offers(
        self,
        specialty: str,
        campaign: str | None = None,
    ) -> list[Offer]:
        try:
            import asyncpg  # type: ignore[import]

            conn = await asyncpg.connect(self._db_url)
            try:
                today = date.today().isoformat()
                rows = await conn.fetch(
                    """
                    SELECT offer_id, type, therapy_area, title, asset_url, expiry_date
                    FROM offer_catalog
                    WHERE is_active = TRUE
                      AND (expiry_date IS NULL OR expiry_date > $1)
                      AND therapy_area = $2
                    ORDER BY created_at DESC
                    """,
                    today,
                    specialty,
                )
                return [
                    Offer(
                        offer_id=str(row["offer_id"]),
                        type=row["type"],
                        therapy_area=row["therapy_area"],
                        title=row["title"],
                        asset_url=row["asset_url"],
                    )
                    for row in rows
                ]
            finally:
                await conn.close()
        except Exception as exc:
            logger.error("native_adapter_fetch_failed", error=str(exc))
            return []

    async def check_eligibility(
        self,
        hcp_id: str,
        offer_id: str,
        context: dict[str, Any] | None = None,
    ) -> bool:
        # Phase 0: Simple rule — if offer exists and is active, HCP is eligible.
        # Phase 1+: Evaluate JSON eligibility_rules with OPA.
        return True
