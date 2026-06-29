# openNBA — User Stories

**Version:** 0.1
**Status:** Draft
**Date:** June 2026
**Linked PRD:** [PRD.md](PRD.md)
**Linked Requirements:** [requirements.md](requirements.md)

> Stories follow the format: **As a [user], I want to [action] so that [outcome].**
> Each story includes acceptance criteria (AC) and a linked requirement ID.
> Sizing: **XS** (< 0.5d) | **S** (0.5–1d) | **M** (2–3d) | **L** (4–5d) | **XL** (> 5d)

---

## Table of Contents

- [Epic 1: NBA Feed & Prioritization](#epic-1-nba-feed--prioritization)
- [Epic 2: Lapsed Prescriber Re-Engagement](#epic-2-lapsed-prescriber-re-engagement)
- [Epic 3: Offer & Content Recommendations](#epic-3-offer--content-recommendations)
- [Epic 4: Mock-to-Production Toggle](#epic-4-mock-to-production-toggle)
- [Epic 5: RSM Dashboard & Oversight](#epic-5-rsm-dashboard--oversight)
- [Epic 6: Authentication & Access Control](#epic-6-authentication--access-control)
- [Epic 7: Observability & Admin](#epic-7-observability--admin)
- [Phase 0 Sprint Candidates](#phase-0-sprint-candidates)

---

## Epic 1: NBA Feed & Prioritization

---

### US-001 — Daily Priority Feed
**As an** MR,
**I want to** open the app and immediately see a ranked list of HCPs I should contact today,
**so that** I don't waste time manually deciding who to visit.

**Size:** M | **Linked FR:** FR-001, FR-031, FR-035

**Acceptance Criteria:**
- [ ] The home screen displays HCP cards sorted by NBA priority score (descending).
- [ ] Each card shows: HCP name, specialty, territory, days since last visit, prescriber tier, urgency badge (High / Medium / Low).
- [ ] The feed loads within 2 seconds (P95) on a 4G connection.
- [ ] An empty state is shown if no HCPs meet the prioritization threshold.

---

### US-002 — On-Demand Feed Refresh
**As an** MR,
**I want to** pull-to-refresh the NBA feed,
**so that** I can get updated recommendations after logging a visit or dismissing a card.

**Size:** S | **Linked FR:** FR-032

**Acceptance Criteria:**
- [ ] Pull-to-refresh triggers a new agent run for the MR.
- [ ] A loading indicator is shown while the agent is running.
- [ ] The feed updates within 60 seconds of the refresh trigger.
- [ ] The MR is shown a "Last updated: [timestamp]" label.

---

### US-003 — Urgency Badge Visual Differentiation
**As an** MR,
**I want to** instantly see which HCPs are most critical at a glance,
**so that** I can triage my day without reading every card in detail.

**Size:** XS | **Linked FR:** FR-035

**Acceptance Criteria:**
- [ ] HCPs with gap > 60 days AND tier 1–2 show a "High" badge in red.
- [ ] HCPs with gap 45–60 days OR tier 3 show a "Medium" badge in amber.
- [ ] All others show a "Low" badge in green.
- [ ] Badge thresholds are driven by `VerticalConfig` (not hardcoded).

---

### US-004 — Offline Feed Access
**As an** MR,
**I want to** view my NBA feed even when I have no internet connection,
**so that** I can prepare for visits while travelling in low-coverage areas.

**Size:** M | **Linked FR:** FR-033

**Acceptance Criteria:**
- [ ] The last 24 hours of NBA feed is cached in the service worker.
- [ ] When offline, the app shows the cached feed with a "Last synced: [time]" banner.
- [ ] Actions taken offline (dismiss, snooze) are queued and synced when connectivity returns.
- [ ] The app does not show a blank screen when offline.

---

## Epic 2: Lapsed Prescriber Re-Engagement

---

### US-005 — Gap Alert Notification
**As an** MR,
**I want to** receive an in-app alert when an HCP I haven't visited in 60+ days needs re-engagement,
**so that** I never lose track of high-value prescribers.

**Size:** S | **Linked FR:** FR-011, FR-012

**Acceptance Criteria:**
- [ ] An alert card appears in the feed for every HCP with gap ≥ 60 days.
- [ ] The card shows: HCP name, specialty, territory, days since last visit, prescriber tier.
- [ ] The gap threshold is configurable per vertical (default: 60 days).
- [ ] An alert badge (red dot) appears on the app icon when new gap alerts are present.

---

### US-006 — Contextual HCP Detail Panel
**As an** MR,
**I want to** tap an HCP card and see a concise summary of my last interaction with them,
**so that** I can walk in prepared without digging through old notes.

**Size:** M | **Linked FR:** FR-013

**Acceptance Criteria:**
- [ ] Tapping the card expands a detail panel without leaving the feed screen.
- [ ] The panel shows an LLM-generated interaction summary (≤3 sentences).
- [ ] The panel shows the HCP's prescriber tier and primary therapy area.
- [ ] The panel loads within 1.5 seconds (P95).
- [ ] If the LLM is unavailable, a template-based fallback summary is shown instead.

---

### US-007 — Personalized Talking Points
**As an** MR,
**I want to** see 3 tailored talking points for each HCP before a visit,
**so that** I can start the conversation with relevant clinical context.

**Size:** M | **Linked FR:** FR-013, FR-006

**Acceptance Criteria:**
- [ ] Exactly 3 talking points are displayed per HCP card.
- [ ] Talking points are generated by the LLM based on HCP specialty, therapy area, and current campaign context.
- [ ] No HCP name or NPI appears in the LLM prompt (de-identification enforced).
- [ ] Talking points are specific enough to reference the correct therapy area (validated by QA with sample data).
- [ ] Fallback: 3 template-based bullets shown if LLM is unavailable.

---

### US-008 — Smart Scheduling Suggestion
**As an** MR,
**I want to** see the best times to visit an HCP based on their historical availability,
**so that** I can maximize my visit acceptance rate.

**Size:** M | **Linked FR:** FR-007

**Acceptance Criteria:**
- [ ] The detail panel shows up to 3 recommended time windows (day + time slot).
- [ ] Recommendations are based on the HCP's historical visit acceptance patterns (last 12 months).
- [ ] If visit history < 5 data points, the suggestion defaults to general business hours (Mon–Fri, 10:00–12:00).
- [ ] Each suggestion shows an estimated acceptance probability (e.g., "~70% based on history").

---

### US-009 — MR Action Buttons
**As an** MR,
**I want to** take one of four actions on each HCP card (schedule, log call, dismiss, snooze),
**so that** I can manage my pipeline efficiently without leaving the NBA feed.

**Size:** S | **Linked FR:** FR-014, FR-015, FR-016

**Acceptance Criteria:**
- [ ] Four action buttons are present on each card: `Schedule Visit`, `Log Call`, `Dismiss`, `Snooze 7 days`.
- [ ] Tapping `Schedule Visit` opens a calendar deep-link pre-populated with the HCP's name and suggested time.
- [ ] Tapping `Log Call` marks the HCP as contacted and writes a visit stub to the action log.
- [ ] Tapping `Dismiss` or `Snooze` logs a feedback event and removes the card from the feed.
- [ ] A snoozed HCP reappears after 7 days with a refreshed context panel.
- [ ] All actions are reflected optimistically in the UI within 200ms.

---

### US-010 — RSM Escalation Flag
**As an** RSM,
**I want to** see which high-priority HCPs my MRs have not acted on within 48 hours,
**so that** I can intervene and coach before prescribing relationships are at risk.

**Size:** S | **Linked FR:** FR-017

**Acceptance Criteria:**
- [ ] An escalation flag is surfaced on the RSM dashboard for each P0/P1 HCP with no MR action in 48h.
- [ ] The flag shows: MR name, HCP name, tier, gap days, and hours since alert was surfaced.
- [ ] The RSM can mark an escalation as "acknowledged" to dismiss it from the dashboard.

---

## Epic 3: Offer & Content Recommendations

---

### US-011 — Contextual Asset Recommendation
**As an** MR,
**I want to** see the single most relevant content asset for each HCP visit,
**so that** I bring the right material without having to search the full catalog.

**Size:** M | **Linked FR:** FR-008, FR-019, FR-020

**Acceptance Criteria:**
- [ ] One content asset (detail aid, journal reprint, or CME invite) is displayed per HCP card.
- [ ] The asset is matched to the HCP's specialty and the active campaign therapy area.
- [ ] HCP eligibility is evaluated before the asset is attached (OPA rule check passes).
- [ ] The MR can tap the asset to open it in a preview pane.
- [ ] If no eligible asset exists, the card shows "No asset available" — never a blank.

---

### US-012 — Native Offer Catalog Management
**As an** Admin,
**I want to** add, edit, and deactivate offers in the native catalog without code deployments,
**so that** the offer library stays current as campaigns change.

**Size:** M | **Linked FR:** FR-042, FR-019

**Acceptance Criteria:**
- [ ] The admin console provides a CRUD interface for offers.
- [ ] Each offer has: title, type (asset / sample / event), therapy area, eligibility rules (OPA Rego snippet), asset URL, expiry date.
- [ ] Deactivated offers are no longer attached to new NBA cards within 15 minutes.
- [ ] Changes are versioned (created_at, updated_at, updated_by).

---

## Epic 4: Mock-to-Production Toggle

---

### US-013 — Mock Mode Demo Readiness
**As a** Sales Engineer (Nagarro),
**I want to** spin up the full platform on synthetic data with a single config change,
**so that** I can demo openNBA to Sun Pharma stakeholders within 2 days of setup.

**Size:** M | **Linked FR:** FR-024, FR-025, FR-026, FR-027

**Acceptance Criteria:**
- [ ] Setting `DATA_MODE=MOCK` in `.env` and running `docker compose up` starts all services.
- [ ] The NBA feed populates with synthetic HCP cards within 5 minutes of startup.
- [ ] The mock dataset includes at least 500 HCPs, 5 therapy areas, 18 months visit history, 30%+ gap rate.
- [ ] All agent workflows, LLM calls, and action buttons work identically to LIVE mode.
- [ ] No external CRM or cloud dependencies are required in MOCK mode.

---

### US-014 — Production Transition Checklist
**As an** Admin,
**I want to** run a guided pre-flight checklist before switching to LIVE data,
**so that** I don't accidentally go live with misconfigured connectors or unmapped schema fields.

**Size:** M | **Linked FR:** FR-028, FR-029, FR-040, FR-041

**Acceptance Criteria:**
- [ ] The admin console shows a "Switch to LIVE" button with a pre-flight gate.
- [ ] The checklist validates: CRM connector reachability, HCP schema field mapping completeness, data validation suite pass rate (≥95%).
- [ ] Each checklist item shows Pass / Fail / Warning status with a remediation hint.
- [ ] The switch to LIVE mode takes effect within 60 seconds (hot reload, no downtime).
- [ ] The toggle is reversible (LIVE → MOCK) without data loss.

---

### US-015 — Configurable Synthetic Data Generator
**As a** Sales Engineer (Nagarro),
**I want to** customize the mock dataset parameters before a client demo,
**so that** the synthetic data mirrors the client's specific therapy areas and MR org structure.

**Size:** S | **Linked FR:** FR-026

**Acceptance Criteria:**
- [ ] A seed config file (`seed.config.yaml`) accepts: `num_hcps`, `num_mrs`, `therapy_areas`, `gap_rate`, `history_months`.
- [ ] Running `python seed_generator.py --config seed.config.yaml` regenerates all Parquet seed files.
- [ ] The generator completes in under 2 minutes for default parameters (500 HCPs).

---

## Epic 5: RSM Dashboard & Oversight

---

### US-016 — Territory Gap Coverage Heat Map
**As an** RSM,
**I want to** see a visual map of HCP visit gaps across my territory,
**so that** I can quickly spot geographic areas where my team is underperforming.

**Size:** L | **Linked FR:** FR-036

**Acceptance Criteria:**
- [ ] The RSM dashboard includes a heat map showing gap coverage by MR and geography.
- [ ] Color coding: green (< 30 day avg gap), amber (30–60 days), red (> 60 days).
- [ ] Clicking a region drills down to the list of HCPs in that area with gap details.

---

### US-017 — Team NBA Compliance Rate
**As an** RSM,
**I want to** see what percentage of NBA recommendations my team has acted on this week,
**so that** I can identify MRs who are not using the platform and coach them.

**Size:** S | **Linked FR:** FR-037

**Acceptance Criteria:**
- [ ] The dashboard shows a per-MR NBA compliance rate (% of cards acted on within 48h).
- [ ] The metric is filterable by date range (this week / this month / custom).
- [ ] MRs below 40% compliance are highlighted with a warning indicator.

---

### US-018 — MR → HCP Drill-Down
**As an** RSM,
**I want to** click on an MR and see their full HCP action history,
**so that** I can have informed coaching conversations about specific accounts.

**Size:** M | **Linked FR:** FR-038

**Acceptance Criteria:**
- [ ] Clicking an MR row opens a panel showing their HCP list with last visit date, NBA card status, and action taken.
- [ ] The panel is sortable by gap days, tier, and last action date.

---

## Epic 6: Authentication & Access Control

---

### US-019 — MR Login via SSO
**As an** MR,
**I want to** log into the app using my company credentials (SSO),
**so that** I don't have to manage a separate username and password.

**Size:** M | **Linked FR:** NFR-014

**Acceptance Criteria:**
- [ ] The login screen has a "Sign in with Company SSO" button.
- [ ] The OIDC flow redirects to Keycloak (or client IdP) and returns a JWT.
- [ ] The MR is automatically scoped to their assigned territory and HCP portfolio.
- [ ] Tokens expire after 8 hours; silent refresh extends the session while the app is active.

---

### US-020 — Role-Based Access Control
**As a** System Administrator,
**I want to** assign MR, RSM, and Admin roles to users,
**so that** each user only sees data and features appropriate to their role.

**Size:** S | **Linked FR:** NFR-015

**Acceptance Criteria:**
- [ ] Three roles are defined: `mr`, `rsm`, `admin`.
- [ ] MRs see only their own portfolio and NBA feed.
- [ ] RSMs see their team's data and escalation flags; cannot see other teams.
- [ ] Admins have access to all data and the admin console.
- [ ] Role assignments are managed in Keycloak and enforced at the BFF middleware layer.

---

## Epic 7: Observability & Admin

---

### US-021 — Agent Pipeline Health Dashboard
**As an** Admin,
**I want to** see the health of each agent's daily run (success rate, latency, token cost),
**so that** I can detect and fix pipeline issues before MRs notice degraded recommendations.

**Size:** M | **Linked FR:** FR-043, NFR-032

**Acceptance Criteria:**
- [ ] The admin console shows a table of recent agent runs: MR, timestamp, status (success/fail/partial), total HCPs processed, LLM token cost.
- [ ] Failed runs show the error message and the specific agent step that failed.
- [ ] A Grafana dashboard link is provided for deeper time-series analysis.

---

### US-022 — Audit Log Viewer
**As a** Compliance Officer,
**I want to** view a complete audit log of all HCP data access events,
**so that** I can demonstrate regulatory compliance during audits.

**Size:** S | **Linked FR:** NFR-017

**Acceptance Criteria:**
- [ ] Every HCP data read or write generates an immutable audit event: `user_id`, `hcp_id`, `event_type`, `timestamp`, `ip_address`.
- [ ] The admin console provides a searchable audit log UI (filter by user, HCP, date range).
- [ ] Audit logs cannot be deleted by any user role (append-only enforced at the database level).

---

## Phase 0 Sprint Candidates

The following stories are recommended for the 4–6 week Phase 0 (Mock Demo) sprint:

| Story | Title | Size | Priority |
|---|---|---|---|
| US-013 | Mock Mode Demo Readiness | M | P0 |
| US-015 | Configurable Synthetic Data Generator | S | P0 |
| US-001 | Daily Priority Feed | M | P0 |
| US-003 | Urgency Badge Visual Differentiation | XS | P0 |
| US-005 | Gap Alert Notification (in-app) | S | P0 |
| US-006 | Contextual HCP Detail Panel | M | P0 |
| US-007 | Personalized Talking Points | M | P0 |
| US-009 | MR Action Buttons | S | P0 |
| US-011 | Contextual Asset Recommendation | M | P0 |
| US-019 | MR Login via SSO (Keycloak basic) | M | P0 |
| US-020 | Role-Based Access Control | S | P0 |

**Deferred to Phase 1+:** US-002, US-004, US-008, US-010, US-012, US-014, US-016, US-017, US-018, US-021, US-022
