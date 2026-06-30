# Mock Data — openNBA

## Overview

openNBA ships with a configurable seed script that generates realistic synthetic data — no client data required for the Phase 0 demo.

---

## Default Parameters

| Parameter | Default | Description |
|---|---|---|
| `NUM_HCPS` | 500 | Number of synthetic HCP profiles |
| `NUM_MRS` | 25 | Number of synthetic MR users |
| `HISTORY_MONTHS` | 18 | Visit log history window |
| `GAP_RATE` | 0.35 | Fraction of HCPs with a 60+ day visit gap |
| `TENANT_ID` | `00000000-...` | Demo tenant UUID |

---

## Prescriber Tier Distribution

| Tier | Percentage | tier_score |
|---|---|---|
| TIER_1 | 20% | 100 |
| TIER_2 | 50% | 60 |
| TIER_3 | 30% | 30 |

---

## Therapy Area Distribution

Evenly distributed across: Cardiology, Oncology, Diabetology, Neurology, Respiratory.

---

## Visit Gap Guarantee

At least `GAP_RATE × NUM_HCPS` HCPs are guaranteed to have their most recent visit ≥ 65 days ago (5 days above the default threshold). This ensures the demo feed always shows urgency-flagged cards.

---

## Customising Seed Parameters

Set the `DATA_SEED_PARAMS` environment variable as a JSON string:

```bash
DATA_SEED_PARAMS='{"NUM_HCPS":100,"NUM_MRS":5,"HISTORY_MONTHS":6,"GAP_RATE":0.5}' pnpm db:seed
```

Or edit `.env`:

```env
DATA_SEED_PARAMS={"NUM_HCPS":100,"NUM_MRS":5,"GAP_RATE":0.5}
```

---

## Running the Seed

```bash
# Seed with defaults
pnpm db:seed

# Seed with custom parameters
DATA_SEED_PARAMS='{"NUM_HCPS":50}' pnpm db:seed

# Reset (truncate all tables) and re-seed
pnpm db:reset && pnpm db:seed
```

---

## Adapting for a New Vertical

1. Modify `THERAPY_AREAS` in `packages/db/src/seed.ts` to match the new vertical's therapy areas.
2. Update `OFFER_DATA` with therapy-area-specific offer catalog entries.
3. Adjust `NUM_HCPS`, `NUM_MRS`, and `GAP_RATE` to match the pilot scope.
4. Update `configs/<vertical>.yaml` with adjusted `therapy_area_priority` values.

---

## CI Smoke Test

A CI step seeds a SQLite in-memory database and asserts row counts:

```bash
pnpm db:seed --mode=ci-smoke
```

Assertions:
- `users` table has ≥ NUM_MRS + 3 rows
- `hcp_profiles` table has exactly NUM_HCPS rows
- `visit_logs` table has ≥ NUM_HCPS rows (some HCPs may have no history)
- `offer_catalog` table has ≥ 5 rows
