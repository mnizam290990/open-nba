"""
MockDataProvider — reads from local JSON fixtures or the seed database.
Used when DATA_MODE=MOCK.
"""

from __future__ import annotations

import json
import random
from datetime import date, datetime, timedelta
from pathlib import Path

from faker import Faker
from models import HCPProfile, Offer, PrescriberTier, TherapyArea, VisitLog

fake = Faker()
Faker.seed(42)

THERAPY_AREAS = list(TherapyArea)
TIERS = list(PrescriberTier)

TENANT_ID = "00000000-0000-0000-0000-000000000001"


def _make_hcps(mr_id: str, count: int = 20) -> list[HCPProfile]:
    random.seed(hash(mr_id) % (2**31))
    hcps = []
    for _ in range(count):
        tier_r = random.random()
        tier = PrescriberTier.TIER_1 if tier_r < 0.2 else (PrescriberTier.TIER_2 if tier_r < 0.7 else PrescriberTier.TIER_3)
        hcps.append(
            HCPProfile(
                hcp_id=str(fake.uuid4()),
                name=f"Dr. {fake.name()}",
                specialty=random.choice(THERAPY_AREAS),
                tier=tier,
                territory=fake.city(),
                npi=fake.numerify("##########"),
                is_active=True,
                tenant_id=TENANT_ID,
            )
        )
    return hcps


def _make_visits(hcp_id: str, mr_id: str, has_gap: bool) -> list[VisitLog]:
    visits = []
    base_days_ago = random.randint(65, 180) if has_gap else random.randint(5, 50)
    current_days_ago = base_days_ago
    num_visits = random.randint(1, 8)
    for i in range(num_visits):
        visit_date = date.today() - timedelta(days=current_days_ago)
        visits.append(
            VisitLog(
                visit_id=str(fake.uuid4()),
                hcp_id=hcp_id,
                mr_id=mr_id,
                visit_date=visit_date,
                outcome="COMPLETED",
                notes=fake.sentence(),
                created_at=datetime.combine(visit_date, datetime.min.time()),
            )
        )
        current_days_ago += random.randint(20, 60)
    return visits


class MockDataProvider:
    """Returns synthetic data. Does not require a live database."""

    def __init__(self, gap_rate: float = 0.35) -> None:
        self._gap_rate = gap_rate
        self._hcp_cache: dict[str, list[HCPProfile]] = {}
        self._gap_set: set[str] = set()

    async def get_hcp_profiles(self, mr_id: str, tenant_id: str) -> list[HCPProfile]:
        if mr_id not in self._hcp_cache:
            hcps = _make_hcps(mr_id, count=20)
            self._hcp_cache[mr_id] = hcps
            gap_count = max(1, int(len(hcps) * self._gap_rate))
            for hcp in random.sample(hcps, gap_count):
                self._gap_set.add(hcp.hcp_id)
        return self._hcp_cache[mr_id]

    async def get_visit_logs(
        self,
        hcp_id: str,
        mr_id: str,
        tenant_id: str,
        months: int = 18,
    ) -> list[VisitLog]:
        has_gap = hcp_id in self._gap_set
        return _make_visits(hcp_id, mr_id, has_gap=has_gap)

    async def get_offers(self, tenant_id: str) -> list[Offer]:
        return [
            Offer(
                offer_id=str(fake.uuid4()),
                type="SAMPLE",
                therapy_area=TherapyArea.CARDIOLOGY,
                title="CARDI-FORTE Sample Pack",
                eligibility_rules={"minTier": "TIER_2", "specialty": "CARDIOLOGY"},
                asset_url="https://assets.opennba.com/sample/cardi-forte.pdf",
                expiry_date=date.today() + timedelta(days=180),
            ),
            Offer(
                offer_id=str(fake.uuid4()),
                type="DETAIL_AID",
                therapy_area=TherapyArea.ONCOLOGY,
                title="Oncology Clinical Evidence Summary",
                eligibility_rules={"specialty": "ONCOLOGY"},
                asset_url="https://assets.opennba.com/detail-aid/onco-max.pdf",
                expiry_date=date.today() + timedelta(days=90),
            ),
            Offer(
                offer_id=str(fake.uuid4()),
                type="CME_INVITE",
                therapy_area=TherapyArea.DIABETOLOGY,
                title="Diabetology CME Symposium Invite",
                eligibility_rules={"specialty": "DIABETOLOGY"},
                expiry_date=date.today() + timedelta(days=60),
            ),
            Offer(
                offer_id=str(fake.uuid4()),
                type="REPRINTS",
                therapy_area=TherapyArea.NEUROLOGY,
                title="Neuro-CARE Reprint Pack",
                eligibility_rules={"specialty": "NEUROLOGY"},
                expiry_date=date.today() + timedelta(days=120),
            ),
            Offer(
                offer_id=str(fake.uuid4()),
                type="DIGITAL_ASSET",
                therapy_area=TherapyArea.RESPIRATORY,
                title="RespiFlow Digital Education Module",
                eligibility_rules={"specialty": "RESPIRATORY"},
                expiry_date=date.today() + timedelta(days=180),
            ),
        ]
