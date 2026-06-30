# Agent Pipeline — openNBA

## Pipeline Graph

```
POST /agent/run/{mr_id}
        │
        ▼
AgentOrchestrator.enqueue_run(mr_id)
        │ (queued, returns run_id immediately)
        ▼
        ┌─────────────────────────────────────────────────────┐
        │                 LangGraph Pipeline                    │
        │                                                      │
        │  SignalHarvesterAgent                                │
        │    ↓                                                 │
        │  GapDetectionAgent                                   │
        │    ↓                                                 │
        │  NBAScoringEngine                                    │
        │    ↓                                                 │
        │  ContextSynthesisAgent (LLM)                        │
        │    ↓                                                 │
        │  OfferRecommendationAgent                            │
        │    ↓                                                 │
        │  [NBA Cards written to database]                     │
        └─────────────────────────────────────────────────────┘
        │
GET /agent/status/{run_id}  ← poll from frontend
```

---

## Step-by-Step Descriptions

### 1. SignalHarvesterAgent

**Input:** `mr_id`, `tenant_id`
**Output:** `List[HCPSignal]`

- Fetches all active HCP profiles assigned to the MR
- Fetches visit logs (18 months history) per HCP
- Deduplicates visit records: keeps the row with the latest `created_at` per `visit_date`
- Routes records missing `hcp_id` or `specialty` to `dead_letter_queue`
- Computes `days_since_last_visit` and `acceptance_rate` per HCP

### 2. GapDetectionAgent

**Input:** `List[HCPSignal]`
**Output:** `List[GapSignal]`

- Flags any HCP whose `days_since_last_visit > gap_threshold_days` (default: 60)
- Threshold is loaded from `VerticalConfig` YAML — hot-reloadable without restart
- HCPs with no visit history are treated as infinite gap (always flagged)
- Inactive HCPs are already excluded by step 1

### 3. NBAScoringEngine

**Input:** `List[HCPSignal]`, `List[GapSignal]`
**Output:** `List[ScoredHCP]` (sorted descending by `priority_score`)

- Computes `priority_score` (0–100) using weighted formula (see `docs/SCORING.md`)
- Derives `urgency_level`: HIGH (≥70) / MEDIUM (≥40) / LOW (<40)
- Weights loaded from `configs/pharma.yaml`

### 4. ContextSynthesisAgent (LLM)

**Input:** `List[ScoredHCP]`, signals for context
**Output:** `List[NBACard]` (with `summary` + `talking_points`)

- De-identifies HCP context before every LLM call (name → `[HCP_NAME]`, etc.)
- Generates a ≤ 3-sentence summary and exactly 3 talking points
- Retry policy: one retry with a simplified prompt on malformed output
- On second failure: uses template fallback and sets `is_partially_enriched = True`
- Hallucination guardrail: strips any sentence referencing a drug name not in the offer catalog

### 5. OfferRecommendationAgent

**Input:** `List[NBACard]`, `List[Offer]`
**Output:** `List[NBACard]` (with `offer` attached)

- Matches HCP specialty + tier to the offer catalog
- Evaluates eligibility rules via OPA (or rule-based equivalent in Phase 0)
- Attaches exactly one offer per card (best specialty match)
- If OPA is unreachable: denies all offers, surfaces "Offers temporarily unavailable"
- If no match: `offer = None` (UI shows "No offer available")

---

## Retry Policy

```yaml
pipeline:
  timeout_seconds: 600
  max_retries: 3
  retry_backoff_seconds: [1, 2, 4]  # Exponential backoff
```

Each step retries up to 3 times. If a step fails after 3 attempts:
- The step is skipped
- Affected NBA cards are marked `is_partially_enriched = True`
- The pipeline continues with the next step
- Cards are still surfaced on the MR feed with available data

---

## Partial-Enrichment States

| Scenario | Card State | MR Sees |
|---|---|---|
| All steps successful | `is_partially_enriched: false` | Full card with AI content |
| ContextSynthesis failed | `is_partially_enriched: true`, `failed_steps: ["context_synthesis"]` | Card with template talking points + "Partial data" badge |
| OfferRecommendation failed | `is_partially_enriched: true` | Card without offer + "Partial data" badge |
| SignalHarvester failed | Card not created (moved to dead_letter_queue) | HCP not shown in feed |

---

## Error Paths

See `docs/TODO.md` Phase 10 section for the full EH-001 through EH-017 error handling catalogue.

Key behaviours:
- **EH-003** Pipeline timeout (10 min): terminate run, preserve last good priority list
- **EH-004** Step failure after 3 retries: skip step, mark `partially_enriched`
- **EH-005** Concurrent run requested: queue the new request, execute after current run completes
- **EH-006** CRM payload missing required fields: dead-letter, continue processing
- **EH-007** Duplicate visit records: deduplicate by `created_at`, log event

---

## Adding a New Agent Step

1. Create `services/agent/agents/my_new_agent.py` with an `async def run_my_new_agent(state: PipelineState) -> PipelineState` function
2. Add unit tests in `services/agent/tests/test_my_new_agent.py`
3. Register the step in `services/agent/pipeline/orchestrator.py` → `steps` list
4. Update this document with the new step description
5. Update `docs/SCORING.md` if the step affects scoring
