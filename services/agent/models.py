"""
Shared Pydantic models for the agent service.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class TherapyArea(str, Enum):
    CARDIOLOGY = "CARDIOLOGY"
    ONCOLOGY = "ONCOLOGY"
    DIABETOLOGY = "DIABETOLOGY"
    NEUROLOGY = "NEUROLOGY"
    RESPIRATORY = "RESPIRATORY"


class PrescriberTier(str, Enum):
    TIER_1 = "TIER_1"
    TIER_2 = "TIER_2"
    TIER_3 = "TIER_3"


class UrgencyLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class HCPProfile(BaseModel):
    hcp_id: str
    name: str
    specialty: TherapyArea
    tier: PrescriberTier
    territory: str
    npi: str | None = None
    is_active: bool = True
    tenant_id: str


class VisitLog(BaseModel):
    visit_id: str
    hcp_id: str
    mr_id: str
    visit_date: date
    outcome: str
    notes: str | None = None
    created_at: datetime


class HCPSignal(BaseModel):
    """Normalised signal produced by the SignalHarvesterAgent."""

    hcp_id: str
    mr_id: str
    specialty: TherapyArea
    tier: PrescriberTier
    territory: str
    last_visit_date: date | None = None
    days_since_last_visit: int | None = None
    visit_count_18m: int = 0
    acceptance_rate: float = 0.0
    recent_notes: list[str] = Field(default_factory=list)
    tenant_id: str


class GapSignal(BaseModel):
    """Output of GapDetectionAgent — signals with flagged gaps."""

    hcp_id: str
    mr_id: str
    days_since_last_visit: int
    is_gap_flagged: bool
    gap_threshold_days: int
    tenant_id: str


class ScoredHCP(BaseModel):
    """Output of the NBA Scoring Engine."""

    hcp_id: str
    mr_id: str
    priority_score: float = Field(ge=0.0, le=100.0)
    urgency_level: UrgencyLevel
    score_components: dict[str, float] = Field(default_factory=dict)
    tenant_id: str


class Offer(BaseModel):
    offer_id: str
    type: str
    therapy_area: TherapyArea
    title: str
    eligibility_rules: dict[str, Any] = Field(default_factory=dict)
    asset_url: str | None = None
    expiry_date: date | None = None


class NBACard(BaseModel):
    """Final output card produced by the pipeline."""

    hcp_id: str
    mr_id: str
    priority_score: float
    urgency_level: UrgencyLevel
    days_since_last_visit: int | None
    summary: str | None = None
    talking_points: list[str] = Field(default_factory=list)
    offer: Offer | None = None
    is_partially_enriched: bool = False
    failed_steps: list[str] = Field(default_factory=list)
    tenant_id: str


class PipelineState(BaseModel):
    """Shared state passed between LangGraph nodes."""

    mr_id: str
    run_id: str
    tenant_id: str
    signals: list[HCPSignal] = Field(default_factory=list)
    gap_signals: list[GapSignal] = Field(default_factory=list)
    scored_hcps: list[ScoredHCP] = Field(default_factory=list)
    nba_cards: list[NBACard] = Field(default_factory=list)
    dead_letter_queue: list[dict[str, Any]] = Field(default_factory=list)
    step_results: dict[str, Any] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)
