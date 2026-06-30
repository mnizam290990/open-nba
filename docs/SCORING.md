# Priority Scoring — openNBA

## Overview

The NBA Scoring Engine computes a `priority_score` (0–100) for each HCP in an MR's portfolio. The score drives the card sort order on the MR feed and determines the urgency badge.

---

## Formula

```
priority_score = w_gap       × gap_score(days, threshold)
               + w_tier      × tier_score(prescriber_tier)
               + w_therapy   × therapy_score(specialty)
               + w_acceptance × acceptance_score(acceptance_rate)
```

All four components are normalised to 0–100 before weighting.

---

## Component Definitions

### gap_score(days, threshold)

Sigmoid-like function that increases with days since last visit. Saturates at ~200 days.

```
gap_score = 50 + 50 × (1 − exp(−max(0, days − threshold) / 30))
```

| Days since visit | gap_score |
|---|---|
| ≤ threshold (60d) | ≤ 50 |
| 90d | ~80 |
| 180d | ~99 |

### tier_score

| Prescriber Tier | tier_score |
|---|---|
| TIER_1 | 100 |
| TIER_2 | 60 |
| TIER_3 | 30 |

### therapy_score

| Therapy Area | therapy_score |
|---|---|
| ONCOLOGY | 100 |
| CARDIOLOGY | 85 |
| DIABETOLOGY | 70 |
| NEUROLOGY | 55 |
| RESPIRATORY | 40 |

### acceptance_score

```
acceptance_score = (1 − acceptance_rate) × 100
```

Higher score = lower historical acceptance rate (re-engagement is harder → higher priority).

If no visit history exists, `acceptance_rate = 0.0` (defaults to maximum priority contribution).

---

## Default Weights (`configs/pharma.yaml`)

```yaml
scoring:
  weights:
    gap:        0.40   # Visit gap is the most significant signal
    tier:       0.30   # Prescriber tier drives commercial value
    therapy:    0.15   # Therapy area priority per business strategy
    acceptance: 0.15   # Historical visit acceptance (inverse)
```

**Weights must sum to 1.0.**

---

## Urgency Level Derivation

| priority_score | urgency_level |
|---|---|
| ≥ 70 | HIGH |
| ≥ 40 | MEDIUM |
| < 40 | LOW |

---

## Re-Weighting Schedule (Feedback Loop)

The scoring weights are updated weekly based on MR feedback aggregated in the `mr_feedback` table.

**Schedule:** Every Monday at 00:00 UTC (Render cron or Supabase scheduled function).

**Algorithm:**
1. Aggregate all `mr_feedback` rows for the past 7 days.
2. For each weight dimension, compute the correlation between the weight component and the `outcome` (action taken within 48h = positive).
3. Adjust weight by `learning_rate × correlation_delta`, clamped to `±max_weight_change_per_cycle`.
4. Re-normalise weights to sum to 1.0.
5. Write updated weights back to `configs/pharma.yaml` (or a DB config row for hot-reload).

**Minimum samples:** Re-weighting only runs if at least 5 feedback rows exist for the MR. Otherwise, default weights are preserved.

---

## VerticalConfig Keys

All scoring parameters live in `configs/pharma.yaml` under the `scoring:` key. To customise for a new vertical:

1. Copy `configs/pharma.yaml` → `configs/<vertical>.yaml`
2. Adjust weights, threshold, and therapy area priorities
3. Set `VERTICAL_CONFIG=<vertical>` environment variable
4. Redeploy the agent service
