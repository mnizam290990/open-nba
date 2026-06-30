# openNBA — Implementation TODO

> **Goal:** Build the Phase 0 (pre-funding demo) of openNBA in small, deployable increments.
>
> **Stack:** Next.js 14 + TypeScript + Tailwind on Vercel · Python FastAPI + LangGraph on Render · PostgreSQL on Supabase/Neon · Weaviate Cloud (vector store)
>
> **Legend:** 🔒 Security step · 📝 Documentation step · 🧪 Test step · 🚀 Deploy milestone

---

## Phase 0 — Project Initialization & Hello World

> **Goal:** Get a deployable, publicly accessible skeleton live within the first session.

### 0.1 Repository Setup

- [ ] Create GitHub repository `opennba` with `main` as the default branch
- [ ] Add `.gitignore` covering Node, Python, `.env*`, build artifacts, and OS files
- [ ] Add `.env.example` listing every required variable name with empty values and inline comments 🔒
- [ ] Add `CODEOWNERS` file assigning a default reviewer to every path
- [ ] Enable GitHub branch protection on `main`: require PR + at least 1 reviewer approval + CI pass 🔒
- [ ] Write initial `README.md`: project overview, tech stack diagram, and local setup steps 📝

### 0.2 Monorepo Structure

- [ ] Create top-level directory layout:
  ```
  /apps/web          # Next.js 14 frontend + BFF API routes
  /services/agent    # Python FastAPI + LangGraph agent service
  /packages/db       # Shared DB schema, migrations, seed scripts
  /docs              # Requirements, ADRs, runbooks, API specs
  /infra             # Docker Compose (local), Helm charts (Phase 1+)
  ```
- [ ] Add root `package.json` with `workspaces` and unified `dev`, `build`, `lint`, `test` scripts
- [ ] Add `turbo.json` (Turborepo) or root `Makefile` for cross-package task orchestration
- [ ] Document monorepo structure and script conventions in `docs/ARCHITECTURE.md` 📝

### 0.3 Next.js Hello World

- [ ] Bootstrap `apps/web` with `pnpm create next-app` (TypeScript + Tailwind + App Router)
- [ ] Replace the default home page with a branded "openNBA — Powered by Nagarro" landing page
- [ ] Add favicon, `og:image` placeholder, and correct `<title>` meta tag
- [ ] Verify `pnpm dev` starts without errors at `http://localhost:3000`
- [ ] Add `Content-Security-Policy`, `X-Frame-Options: DENY`, and `X-Content-Type-Options: nosniff` headers in `next.config.ts` 🔒

### 0.4 First Deployment to Vercel 🚀

- [ ] Connect the GitHub repository to a new Vercel project
- [ ] Add `NEXTAUTH_SECRET` (generated, minimum 32 chars) and `NODE_ENV=production` in Vercel Environment Variables 🔒
- [ ] Confirm the automatic preview deployment URL is publicly accessible
- [ ] Record the Vercel URL in `README.md` under a "Live Demo" section 📝
- [ ] **Milestone: the app is live on Vercel and accessible to stakeholders**

### 0.5 CI/CD Bootstrap (GitHub Actions)

- [ ] Create `.github/workflows/ci.yml` with triggers on `push` (all branches) and `pull_request` targeting `main`
- [ ] Add CI steps: checkout → Node.js setup (use `.nvmrc`) → `pnpm install` → `pnpm lint` → `pnpm type-check`
- [ ] Configure ESLint (`eslint.config.mjs`) with Next.js and TypeScript recommended rule sets
- [ ] Configure Prettier (`.prettierrc`) and add a `pnpm format:check` CI step
- [ ] Verify the CI pipeline passes on the first push 🧪
- [ ] Add CI status badge to `README.md` 📝
- [ ] Document the CI pipeline stages, triggers, and failure behaviour in `docs/CI_CD.md` 📝

---

## Phase 1 — Database Schema & Mock Data

> **Goal:** Stand up PostgreSQL and seed realistic mock data so the UI has something meaningful to show.

### 1.1 Database Setup

- [ ] Create a free-tier PostgreSQL project on Supabase or Neon
- [ ] Add `DATABASE_URL` to `.env.example` (placeholder only) and to Vercel Environment Variables 🔒
- [ ] Install a pre-commit hook (e.g., `husky` + `detect-secrets`) to block committing any secret-shaped strings 🔒
- [ ] Document the database setup steps, connection string format, and free-tier limits in `docs/DATABASE.md` 📝

### 1.2 Schema Design & Migrations

- [ ] Set up Drizzle ORM (or Prisma) in `packages/db` for type-safe query generation
- [ ] Write versioned migration creating all core tables:
  - `hcp_profiles` — `hcp_id`, `name`, `specialty`, `tier`, `territory`, `npi`, `is_active`, `tenant_id`
  - `mr_profiles` — `mr_id`, `name`, `territory`, `rsm_id`, `tenant_id`
  - `visit_logs` — `visit_id`, `hcp_id`, `mr_id`, `visit_date`, `outcome`, `notes`, `created_at`, `tenant_id`
  - `nba_action_log` — `action_id`, `mr_id`, `hcp_id`, `action_type`, `timestamp`, `tenant_id`
  - `offer_catalog` — `offer_id`, `type`, `therapy_area`, `eligibility_rules` (JSONB), `asset_url`, `expiry_date`, `tenant_id`
  - `audit_log` — `event_id`, `event_type`, `user_id`, `resource_id`, `ip_address`, `timestamp` (append-only) 🔒
- [ ] Add `tenant_id` to every table now, even for single-tenant Phase 0, to avoid a schema migration post-funding 🔒
- [ ] Enable Row-Level Security (RLS) stubs on all tables in Supabase/PostgreSQL 🔒
- [ ] Run migrations and confirm schema is applied 🧪
- [ ] Add `pnpm db:migrate --check` (dry-run) as a CI step 🧪

### 1.3 Mock Data Seed Script

- [ ] Write `packages/db/seed.ts` with configurable parameters matching the PRD:
  - `NUM_HCPS=500`, `NUM_MRS=25`, `HISTORY_MONTHS=18`, `GAP_RATE=0.35`
  - Therapy areas: Cardiology, Oncology, Diabetology, Neurology, Respiratory
  - At least 35% of HCPs with a 60+ day visit gap
  - Prescriber tiers: Tier 1 (20%), Tier 2 (50%), Tier 3 (30%)
- [ ] Parameterise the seed via a `.env` variable `DATA_SEED_PARAMS` or a JSON config file
- [ ] Add `pnpm db:seed` and `pnpm db:reset` scripts
- [ ] Add a dry-run CI smoke test: seed a SQLite in-memory DB and assert row counts 🧪
- [ ] Document seed parameters and how to customise them in `docs/MOCK_DATA.md` 📝

### 1.4 BFF API — Data Access Foundation

- [ ] Create Next.js API route handlers (App Router) under `apps/web/app/api/v1/`:
  - `GET /api/v1/hcps` — paginated, sorted HCP list for the authenticated MR
  - `GET /api/v1/hcps/[hcp_id]` — single HCP detail
  - `GET /api/v1/offers` — active offer catalog
  - `GET /api/v1/health` — liveness probe returning `{ status: "ok", mode: DATA_MODE }`
- [ ] Add `DATA_MODE=MOCK|LIVE` environment variable; route handlers resolve the correct data source 🔒
- [ ] Validate all query parameters and request bodies with Zod schemas 🔒
- [ ] Return structured JSON errors — never raw stack traces to the client 🔒
- [ ] Create `docs/api/openapi.yml` with an OpenAPI 3.1 stub covering the above endpoints 📝

---

## Phase 2 — MR Frontend (NBA Feed) with Mock Data

> **Goal:** Build the complete MR UI against mock data so stakeholders can experience the product end-to-end.

### 2.1 App Shell & Navigation

- [ ] Create an authenticated app layout: top-bar on desktop, bottom navigation on mobile
- [ ] Implement role-aware navigation (MR feed, RSM dashboard, Admin console) — only show what the user's role permits
- [ ] Add global loading skeleton components so there are no blank screens during data fetches
- [ ] Verify responsive layout at 375 px (iPhone SE), 768 px, and 1280 px viewports

### 2.2 HCP Card Component

- [ ] Build `<HCPCard>` displaying: HCP name, specialty, territory, days since last visit, prescriber tier, urgency badge
- [ ] Derive urgency badge (`High` / `Medium` / `Low`) from mock priority score (score ≥ 70 → High, ≥ 40 → Medium, else Low)
- [ ] Add four action buttons: **Schedule Visit** · **Log Call** · **Dismiss** · **Snooze (7 days)**
- [ ] Sort cards by urgency score descending on the feed page
- [ ] Add `data-testid` attributes to every interactive element and every badge 🧪
- [ ] Add an accessible `aria-label` to each card describing the HCP and urgency level

### 2.3 HCP Detail Panel

- [ ] Build a slide-in panel (desktop) / full-screen sheet (mobile) triggered by tapping a card
- [ ] Display: LLM-generated summary (placeholder text for now), 3 talking points (mock), recommended offer asset, scheduling suggestion
- [ ] Add "No offer available" empty state with clear user-facing message
- [ ] Add `partially_enriched` badge when a card lacks talking points due to a pipeline step failure
- [ ] Add `data-testid` attributes to all panel elements 🧪

### 2.4 Pull-to-Refresh & Loading States

- [ ] Implement pull-to-refresh gesture on mobile to trigger an on-demand agent re-run
- [ ] Show an optimistic spinner immediately when an action button is pressed
- [ ] Add a React error boundary with a "Retry" button wrapping the feed

### 2.5 Progressive Web App (PWA)

- [ ] Add `public/manifest.json` (app name `openNBA`, icons at 192 px and 512 px, theme colour)
- [ ] Configure service worker via `next-pwa` (or a custom Workbox setup)
- [ ] Cache the last 24 hours of the NBA feed data for offline access
- [ ] Show an "You're offline — showing cached data" banner when network is unavailable
- [ ] Test PWA install prompt on Android Chrome and iOS Safari 🧪

### 2.6 Component Tests

- [ ] Install Vitest + React Testing Library in `apps/web`
- [ ] Write unit tests for `<HCPCard>`: urgency badge rendering, action button presence
- [ ] Write unit tests for the HCP detail panel: empty states, `partially_enriched` badge
- [ ] Write unit tests for the offline banner and pull-to-refresh trigger
- [ ] Add `pnpm test` to the CI pipeline and require tests to pass before merge 🧪
- [ ] Document the frontend testing strategy and coverage targets in `docs/TESTING.md` 📝

---

## Phase 3 — Authentication & RBAC

> **Goal:** Secure every route with proper authentication and role-based access control before any real data is introduced.

### 3.1 Authentication

- [ ] Install and configure Auth.js (NextAuth.js v5) in `apps/web`
- [ ] Add a Credentials provider with email + password (bcrypt hashing) for Phase 0 demo logins 🔒
- [ ] Add an OIDC provider stub (disabled by default) for Keycloak federation in Phase 1 🔒
- [ ] Store sessions in the PostgreSQL database (not cookies alone) to enable server-side revocation 🔒
- [ ] Set JWT access token expiry to 8 hours and refresh token expiry to 7 days 🔒
- [ ] Implement silent token refresh on any `401` response — redirect to login only on refresh failure 🔒
- [ ] Preserve the current page URL in `sessionStorage` when redirecting to login so the MR returns to their place 🔒

### 3.2 Role-Based Access Control (RBAC)

- [ ] Define roles in the `users` table: `MR`, `RSM`, `ADMIN`
- [ ] Create a `withAuth(requiredRole)` middleware factory for API route handlers 🔒
- [ ] Scope all MR data queries with `WHERE mr_id = session.user.id` — MRs can only see their own portfolio 🔒
- [ ] Scope RSM queries to their `rsm_id` team only 🔒
- [ ] Guard Admin Console routes at the layout level with a server-side session check 🔒
- [ ] Write RBAC unit tests: verify each role can only call its permitted endpoints 🧪

### 3.3 Security Hardening

- [ ] Add per-user API rate limiting: 5 requests per minute on `POST /api/v1/agent/run` 🔒
- [ ] Sanitise all string fields that will be interpolated into LLM prompts: strip control characters and injection patterns 🔒
- [ ] Add HTTP security headers CI check (`pnpm headers:check`) to verify CSP, X-Frame-Options etc. are set 🧪
- [ ] Add secret scanning step to CI using `truffleHog` or GitHub's built-in secret scanning 🔒
- [ ] Document the authentication flow, RBAC model, and rate-limit configuration in `docs/SECURITY.md` 📝

### 3.4 Audit Logging

- [ ] Insert an audit log row on every HCP data access event (read, action taken) 🔒
- [ ] Insert audit log rows for all auth events: login, logout, failed login, token refresh, token revocation 🔒
- [ ] Enforce an append-only policy on the `audit_log` table via a PostgreSQL trigger or Supabase policy 🔒
- [ ] Confirm no PII (HCP name, NPI) appears in any application log line 🔒

---

## Phase 4 — Python Agent Service

> **Goal:** Build the AI pipeline that powers priority scoring and content generation.

### 4.1 Service Initialisation

- [ ] Scaffold `services/agent/` with FastAPI, LangGraph, and `uv` for dependency management
- [ ] Add `pyproject.toml` with pinned versions for all direct dependencies
- [ ] Add `Dockerfile` using Python 3.12 slim base image, running as a non-root user with a read-only root filesystem 🔒
- [ ] Add `docker-compose.yml` in `/infra/local/` to run the agent service, PostgreSQL, and Weaviate together locally
- [ ] Deploy the Docker container to Render free tier using a `render.yaml` config file 🚀
- [ ] Add a `GET /health` liveness endpoint returning `{ status: "ok", version: "<git-sha>" }`
- [ ] Add Python service to GitHub Actions CI: `ruff lint` + `mypy` type checking 🧪
- [ ] Document local agent service setup, environment variables, and Render deployment steps in `docs/AGENT_SERVICE.md` 📝

### 4.2 Data Provider Abstraction

- [ ] Define a `DataProvider` abstract interface (Python Protocol) with methods for fetching HCP profiles, visit logs, and offers
- [ ] Implement `MockDataProvider` that reads from the seed database or local JSON fixtures
- [ ] Implement `LiveDataProvider` stub that raises `NotImplementedError` (wired up in Phase 5 integration)
- [ ] Resolve the correct provider at startup based on `DATA_MODE` environment variable 🔒
- [ ] Write unit tests verifying the correct provider is selected per `DATA_MODE` value 🧪

### 4.3 Signal Harvester Agent

- [ ] Implement `SignalHarvesterAgent` to ingest visit logs, CRM events, HCP specialty metadata, and calendar data
- [ ] Normalise all inputs into a typed `HCPSignal` Pydantic model
- [ ] Route records missing `hcp_id` or `visit_date` to a `dead_letter_queue` table; continue processing remaining records 🔒
- [ ] Deduplicate visit records: retain the row with the later `created_at`, log a `duplicate_visit_skipped` event
- [ ] Write unit tests for the harvester with both valid and malformed CRM payloads 🧪

### 4.4 Gap Detection Agent

- [ ] Implement `GapDetectionAgent` to flag any HCP whose last confirmed visit exceeds the configured gap threshold
- [ ] Read the threshold from `VerticalConfig` YAML (default: 60 days); make it hot-reloadable without restart
- [ ] Filter out HCPs flagged as inactive (`is_active = false`) within 24 hours of the flag being set
- [ ] Write unit tests covering: exactly-on-threshold (not flagged), one-day-over (flagged), and inactive HCP (excluded) 🧪

### 4.5 NBA Scoring Engine

- [ ] Implement the priority score formula incorporating: visit gap (days), prescriber tier, therapy area priority, historical visit acceptance rate
- [ ] Load weight coefficients from `VerticalConfig` YAML (`configs/pharma.yaml`)
- [ ] Output a `priority_score` (0–100) and a derived urgency level (`HIGH` / `MEDIUM` / `LOW`)
- [ ] Write and commit `configs/pharma.yaml` with default weights 📝
- [ ] Write unit tests covering: all-high inputs, all-low inputs, and zero-history (acceptance-rate defaults) 🧪
- [ ] Document the scoring formula and weight interpretation in `docs/SCORING.md` 📝

### 4.6 Context Synthesis Agent (LLM)

- [ ] Implement `ContextSynthesisAgent` that calls an LLM (AWS Bedrock Claude 3.5 Sonnet or OpenAI GPT-4o via API key)
- [ ] De-identify HCP context before every LLM call: replace `hcp_id`, `npi`, and `name` with anonymous tokens 🔒
- [ ] Generate a ≤ 3-sentence interaction summary and exactly 3 personalized talking points per HCP
- [ ] On malformed/non-JSON LLM output: retry once with a simplified prompt; on second failure, use template-based talking points and log `llm_output_invalid`
- [ ] Hallucination guardrail: strip any sentence referencing a drug name not present in the active offer catalog before display 🔒
- [ ] Log every LLM call: step name, token count (input + output), latency (ms), estimated USD cost
- [ ] Store the LLM API key in Render/Vercel environment variables only — never in code or logs 🔒
- [ ] Write unit tests with mocked LLM responses: valid JSON, malformed JSON, and hallucinated drug name 🧪

### 4.7 Offer Recommendation Agent

- [ ] Implement `OfferRecommendationAgent` to match HCP specialty + current campaign → offer catalog
- [ ] Attach exactly one offer per HCP card; surface "No offer available" if no match exists
- [ ] Evaluate HCP eligibility against OPA rules (or a rule-based equivalent for Phase 0) before attaching an offer
- [ ] If the OPA engine is unreachable: deny all offer attachments and surface "Offers temporarily unavailable" — do not surface wrong offers 🔒
- [ ] Write unit tests: successful match, no match, OPA unavailable 🧪

### 4.8 Agent Pipeline Orchestration

- [ ] Wire all agents into a LangGraph pipeline: Harvester → Gap Detection → Scoring → Context Synthesis → Offer Recommendation
- [ ] Implement per-step retry: up to 3 attempts with exponential backoff (1 s, 2 s, 4 s)
- [ ] Implement a hard 10-minute timeout per MR pipeline run; send a `pipeline_timeout` alert and preserve the last known good priority list
- [ ] On a step failing after 3 retries: skip that step, mark the card `partially_enriched`, and surface it with available data
- [ ] Expose `POST /agent/run/{mr_id}` endpoint; return a `run_id` immediately for async polling
- [ ] If a run is already in progress for the same `mr_id`: queue the new request and execute it immediately after (no concurrent execution per MR)
- [ ] Expose `GET /agent/status/{run_id}` for frontend polling
- [ ] Write integration tests running the full pipeline with mock data and asserting on output shape 🧪
- [ ] Document the pipeline graph, retry policy, and partial-enrichment states in `docs/AGENT_PIPELINE.md` 📝

---

## Phase 5 — MR Actions & Feedback Loop

> **Goal:** Make the NBA feed interactive and capture MR feedback to drive re-ranking.

### 5.1 Action API

- [ ] Add `POST /api/v1/actions` accepting `action_type`: `SCHEDULE_VISIT | LOG_CALL | DISMISS | SNOOZE`
- [ ] Validate all fields with a strict Zod schema; reject unknown action types with HTTP 400 🔒
- [ ] **SCHEDULE_VISIT**: reset the HCP's gap timer, move the HCP down the priority ranking
- [ ] **DISMISS** and **SNOOZE**: write a feedback event, trigger async agent re-ranking
- [ ] **SNOOZE**: suppress the card for exactly 7 days
- [ ] Write every action to `nba_action_log` with full audit trail including `user_id` and `ip_address` 🔒
- [ ] Return an optimistic `202 Accepted` immediately; process re-ranking asynchronously

### 5.2 Offline Action Queue

- [ ] Queue `DISMISS`, `SNOOZE`, and `LOG_CALL` actions in the service worker's IndexedDB when the device is offline
- [ ] Replay queued actions in FIFO order when network connectivity is restored
- [ ] If a queued action conflicts with a server-side state update: server state wins; notify the MR with an in-app message
- [ ] Write integration tests simulating offline → online transition with conflicting server state 🧪

### 5.3 Feedback Loop (Weekly Re-weighting)

- [ ] Create a `mr_feedback` table: `feedback_id`, `mr_id`, `hcp_id`, `action_type`, `outcome`, `week_of`
- [ ] Implement a weekly cron job (Render cron or Supabase scheduled function) to aggregate feedback and update scoring weights in `VerticalConfig`
- [ ] Document the feedback re-weighting algorithm and schedule in `docs/SCORING.md` 📝

---

## Phase 6 — Offer Catalog & Eligibility Engine

> **Goal:** Enable admin-managed offers with rules-based eligibility checks.

### 6.1 Native Offer Catalog

- [ ] Finalise the offer catalog JSON/YAML schema: `offer_id`, `type`, `therapy_area`, `eligibility_rules` (structured), `asset_url`, `expiry_date`
- [ ] Seed sample offers for all 5 therapy areas with realistic eligibility rules 📝
- [ ] Implement CRUD API routes under `/api/v1/admin/offers` (Admin role required) 🔒
- [ ] Validate `expiry_date` on read: surface "No offer available" if the offer has expired
- [ ] Write unit tests for expiry validation and CRUD endpoint authorisation 🧪

### 6.2 Offer Adapter Interface

- [ ] Define a typed `OfferAdapter` Python Protocol with `fetch_offers(specialty, campaign)` and `check_eligibility(hcp_id, offer_id)` signatures
- [ ] Implement `NativeOfferAdapter` backed by the PostgreSQL offer catalog
- [ ] Implement `VeevaVaultAdapter` stub and `SAPAdapter` stub (both return mock data with a `TODO` comment)
- [ ] Register adapters via a plugin registry; swapping adapters requires no core engine changes
- [ ] Document the adapter interface contract and how to add a new adapter in `docs/OFFER_ADAPTERS.md` 📝

---

## Phase 7 — RSM Dashboard

> **Goal:** Give RSMs real-time visibility into their team's NBA compliance.

### 7.1 Territory Overview

- [ ] Add `GET /api/v1/rsm/team` — list MRs in the RSM's territory with their last activity timestamp
- [ ] Add `GET /api/v1/rsm/compliance` — NBA compliance rate (% of P0/P1 HCP cards acted on within 48 hours)
- [ ] Build the RSM dashboard page: team overview cards with per-MR compliance score
- [ ] Add a compliance rate trend chart (last 4 weeks) using Recharts or Chart.js
- [ ] Add `data-testid` attributes to all dashboard metrics and chart elements 🧪

### 7.2 Drill-Down & Escalations

- [ ] Implement drill-down navigation: Territory → MR → HCP → Action History
- [ ] Surface an escalation flag on any P0/P1 HCP card with no MR action within 48 hours
- [ ] Ensure RSM queries are scoped to their `rsm_id` only — RSMs cannot see other teams' data 🔒
- [ ] Write unit tests verifying RSM data scoping 🧪

---

## Phase 8 — Admin Console

> **Goal:** Give administrators operational control without requiring code changes or deployments.

### 8.1 DATA_MODE Toggle

- [ ] Build an Admin Console page accessible only to the `ADMIN` role 🔒
- [ ] Add a `DATA_MODE` toggle (MOCK ↔ LIVE) with a mandatory pre-flight validation step before switching 🔒
- [ ] Pre-flight validation: run all schema-mapping checks and display a pass/fail report per field
- [ ] Block the MOCK → LIVE transition if any required field mapping fails; surface a field-level failure report
- [ ] Log every `DATA_MODE` change to the audit log including who triggered it and when 🔒

### 8.2 Production Transition Checklist

- [ ] Implement the production readiness checklist with automated pass/fail status for each item:
  - [ ] Schema mapping complete and all required fields mapped
  - [ ] CRM connector test passed (at least one successful read)
  - [ ] Data Processing Agreement (DPA) acknowledgement recorded 🔒
  - [ ] Offer catalog seeded with at least one active offer
  - [ ] At least one MR user account provisioned and verified
  - [ ] Audit log verified to be capturing events
- [ ] Surface checklist in the Admin Console UI with clear remediation hints for each failing item 📝

### 8.3 Agent Health Metrics

- [ ] Admin dashboard section: last pipeline run time per MR, success/failure rate (last 7 days), total LLM tokens consumed, estimated cost in USD
- [ ] Surface `pipeline_timeout` and `llm_output_invalid` event counts with drill-down to individual events

### 8.4 Offer Catalog Management (CRUD UI)

- [ ] Build a data table UI for the offer catalog with inline edit, add, and delete actions
- [ ] Validate form inputs on the client (Zod + React Hook Form) and server 🔒
- [ ] Confirm deletion with a modal warning if the offer is currently attached to active NBA cards

---

## Phase 9 — Comprehensive Testing Suite

> **Goal:** Reach coverage targets and validate all critical paths before any real HCP data is introduced.

### 9.1 Unit Tests — Agent Service (Python)

- [ ] Target: ≥ 80% line coverage across all agent modules
- [ ] Signal Harvester: valid payload, missing fields (dead-letter), duplicate records
- [ ] Gap Detection: exactly on threshold, one day over, inactive HCP
- [ ] Scoring Engine: all weight combinations, zero-history fallback
- [ ] Context Synthesis: valid LLM response, malformed response, hallucination guardrail
- [ ] Offer Recommendation: match, no match, OPA unavailable
- [ ] Run with `pytest --cov --cov-fail-under=80` in CI 🧪

### 9.2 Unit Tests — Frontend (TypeScript)

- [ ] Target: ≥ 80% line coverage across components and API route handlers
- [ ] `<HCPCard>`: urgency badge rendering per score range, all four action buttons present
- [ ] HCP detail panel: summary and talking points render, empty states, `partially_enriched` badge
- [ ] Offline queue: action is queued when offline, replayed on reconnect, conflict notification shown
- [ ] RBAC middleware: MR cannot call RSM or Admin endpoints
- [ ] Run with `pnpm test --coverage` in CI 🧪

### 9.3 Integration Tests

- [ ] Target: ≥ 60% coverage on agent service and offer service end-to-end paths
- [ ] Full pipeline run with mock PostgreSQL: assert correct number of NBA cards produced
- [ ] API endpoint contract tests: request shape → response shape for all `/api/v1/` routes
- [ ] `DATA_MODE=MOCK` vs `DATA_MODE=LIVE` (stubbed): assert identical output shape
- [ ] Run in CI on every PR after unit tests pass 🧪

### 9.4 Playwright End-to-End Tests (Smoke Suite)

Follow the SAF Playwright standards: `data-testid` locators only, no hardcoded waits, web-first assertions, `test.describe()` grouping, and `test.beforeEach()` navigation.

- [ ] Install Playwright and configure `playwright.config.ts` to run against the Vercel preview URL
- [ ] **E2E-001** — MR Login: MR logs in with valid credentials → NBA feed page loads → at least one HCP card is visible
- [ ] **E2E-002** — Card Actions: MR clicks **Dismiss** on a card → card disappears from the feed → audit log entry created
- [ ] **E2E-003** — Snooze: MR clicks **Snooze** → card disappears → card reappears after 7 days (assert via DB state)
- [ ] **E2E-004** — Detail Panel: MR taps an HCP card → detail panel opens → three talking points are visible
- [ ] **E2E-005** — RSM View: RSM logs in → RSM dashboard shows compliance rate metric → drill-down to MR detail works
- [ ] **E2E-006** — Admin Toggle: Admin logs in → Admin Console is visible → DATA_MODE toggle is present → pre-flight checklist appears on click
- [ ] **E2E-007** — RBAC Guard: MR attempts to navigate to `/admin` → redirected to feed with an "Access Denied" message
- [ ] **E2E-008** — Offline Banner: Service worker cache is active → disconnect network simulation → offline banner appears
- [ ] Run Playwright in CI on merges to `main`; publish the HTML report as a CI artifact 🧪
- [ ] Document Playwright setup, test IDs, and how to add new E2E tests in `docs/TESTING.md` 📝

### 9.5 Coverage Reporting & Gates

- [ ] Configure CI to fail if unit coverage drops below 80% or integration coverage below 60% 🧪
- [ ] Publish Vitest and pytest coverage HTML reports as CI artifacts
- [ ] Add coverage badge links to `README.md` 📝

---

## Phase 10 — Observability & Error Handling

> **Goal:** Detect failures before users do and handle every error case gracefully.

### 10.1 Structured Logging

- [ ] All services emit structured JSON logs with fields: `timestamp`, `level`, `trace_id`, `mr_id`, `event_type`, `message`
- [ ] Never log HCP names, NPI numbers, or any directly identifying fields 🔒
- [ ] Log pipeline step start/end and duration in milliseconds for every agent step
- [ ] Configure log level via `LOG_LEVEL` environment variable (default: `INFO` in production, `DEBUG` in dev)

### 10.2 LLM Call Tracing

- [ ] Integrate LangSmith (or a self-hosted equivalent) for LLM call tracing
- [ ] Capture for each LLM call: step name, model used, tokens in, tokens out, latency (ms), estimated USD cost, `mr_id` (no HCP PII)
- [ ] Store the LangSmith API key in environment variables only 🔒
- [ ] Add a weekly LLM cost summary to the Admin Console agent health view

### 10.3 Error Handling — All EH Requirements

- [ ] **EH-001** LLM malformed output → retry with simplified prompt → template fallback → log `llm_output_invalid` ✓ (Phase 4.6)
- [ ] **EH-002** Hallucination guardrail → strip uncatalogued drug references ✓ (Phase 4.6)
- [ ] **EH-003** Pipeline timeout → terminate run at 10 min, alert, preserve last good list ✓ (Phase 4.8)
- [ ] **EH-004** Agent step failure after 3 retries → skip step, mark `partially_enriched`, surface card ✓ (Phase 4.8)
- [ ] **EH-005** On-demand run requested mid-scheduled run → queue and run after; prevent concurrent execution ✓ (Phase 4.8)
- [ ] **EH-006** CRM payload missing required fields → dead-letter queue, continue processing ✓ (Phase 4.3)
- [ ] **EH-007** Duplicate visit records → deduplicate by `created_at`, log event ✓ (Phase 4.3)
- [ ] **EH-008** Inactive HCP flag set → remove from active priority list within 24 hours ✓ (Phase 4.4)
- [ ] **EH-009** CRM connector HTTP 5xx / timeout → fall back to last cached CRM snapshot (≤ 24 h old) → surface data-staleness warning in Admin Console
- [ ] **EH-010** MOCK → LIVE field mapping failure → block transition, show field-level report ✓ (Phase 8.1)
- [ ] **EH-011** No eligible offer for HCP → display "No offer available" placeholder; still surface gap alert, talking points, scheduling ✓ (Phase 4.7)
- [ ] **EH-012** Offer expires while MR is viewing card → remove expired asset on next page load; do not invalidate the already-scheduled visit
- [ ] **EH-013** OPA rule engine unavailable → deny all offers, surface "Offers temporarily unavailable" ✓ (Phase 4.7)
- [ ] **EH-014** MR account deactivated → remove open NBA cards within 1 hour; flag HCPs as "Unassigned" in RSM dashboard
- [ ] **EH-015** JWT expiry mid-session → silent refresh; redirect to login on refresh failure ✓ (Phase 3.1)
- [ ] **EH-016** Offline queued action conflicts with server state → server wins, notify MR ✓ (Phase 5.2)
- [ ] **EH-017** HCP in two MRs' portfolios → generate independent NBA cards per MR; visit by MR-A does not reset MR-B's gap timer unless configured in `VerticalConfig`
- [ ] Write a unit or integration test for each EH scenario not yet covered 🧪

### 10.4 Alerting (Phase 0)

- [ ] Configure Vercel built-in error monitoring for the Next.js app
- [ ] Register the Render agent service health endpoint with UptimeRobot (free tier) to alert on downtime
- [ ] Add a `pipeline_timeout` event counter to the Admin Console health view
- [ ] Document the on-call escalation path and response steps in `docs/RUNBOOK.md` 📝

---

## Phase 11 — CI/CD Hardening

> **Goal:** Move from a basic lint pipeline to a robust, security-gated PR workflow.

### 11.1 Full 5-Stage PR Gate

- [ ] Expand `.github/workflows/ci.yml` to run sequentially: `lint → unit tests → build image → image vulnerability scan → integration tests`
- [ ] Add `docker build` step for `services/agent` and assert the image is ≤ 500 MB 🔒
- [ ] Add image vulnerability scanning with Trivy; fail CI on any `CRITICAL` or `HIGH` CVE 🔒
- [ ] Add Dependabot config (`.github/dependabot.yml`) for both `npm` and `pip` ecosystems 🔒
- [ ] Block merge on any `CRITICAL` or `HIGH` severity CVE in direct dependencies 🔒

### 11.2 Branch Strategy & Merge Protection

- [ ] Enforce branch naming convention `feat/<ticket-id>-short-description` via a GitHub Actions name check
- [ ] Block all direct commits to `main` via branch protection rules 🔒
- [ ] Require at least 1 peer review approval and all CI checks to pass before merge 🔒
- [ ] Add `PULL_REQUEST_TEMPLATE.md` with a checklist: tests added, docs updated, no secrets committed, `data-testid` added to new UI elements 📝

### 11.3 Secrets Management in CI

- [ ] Audit all workflow YAML files: confirm every credential uses `${{ secrets.XXX }}` syntax and never appears in `run:` commands 🔒
- [ ] Enable GitHub secret scanning (GitHub Advanced Security free tier or `truffleHog` action) on all PRs 🔒
- [ ] Add `detect-secrets` pre-commit hook to the developer onboarding setup
- [ ] Document secret rotation procedure (how to rotate, who is notified, how to verify) in `docs/SECURITY.md` 📝

### 11.4 Preview Deployments & Smoke Tests

- [ ] Confirm Vercel automatically creates a preview deployment for every PR
- [ ] Add a GitHub Actions step to post the Vercel preview URL as a PR comment
- [ ] Run the Playwright E2E smoke suite (Phase 9.4) against the preview deployment URL as the final CI stage 🧪

---

## Phase 12 — Documentation & Developer Handoff

> **Goal:** Make the project understandable and maintainable by any Nagarro engineer.

### 12.1 Architecture Documentation

- [ ] `docs/ARCHITECTURE.md` — system context diagram, component responsibilities, request data flow, Phase 0 vs Phase 1 topology differences 📝
- [ ] `docs/AGENT_PIPELINE.md` — LangGraph agent graph, step-by-step descriptions, retry policy, partial-enrichment states, error paths 📝
- [ ] `docs/API.md` — link to `docs/api/openapi.yml`, auth requirements per endpoint, rate limit table 📝
- [ ] `docs/SCORING.md` — priority score formula, weight coefficients per `VerticalConfig` key, re-weighting schedule 📝
- [ ] `docs/MOCK_DATA.md` — seed parameter descriptions, how to regenerate, how to customise for a new vertical 📝

### 12.2 Operational Documentation

- [ ] `docs/RUNBOOK.md` — how to restart services on Render and Vercel, how to roll back a Vercel deployment, alert response steps, escalation contacts 📝
- [ ] `docs/DATABASE.md` — schema ER diagram, migration commands, how to connect locally, backup/restore procedure for Supabase/Neon 📝
- [ ] `docs/SECURITY.md` — auth flow sequence diagram, RBAC permission matrix, audit log schema, secret rotation procedure, pre-commit hook setup 📝
- [ ] `docs/CI_CD.md` — pipeline stage diagram, branch strategy, how to add a new CI step, Vercel promotion steps 📝

### 12.3 Architecture Decision Records (ADRs)

- [ ] `docs/ADR/001-monorepo-structure.md` — why Turborepo, considered alternatives 📝
- [ ] `docs/ADR/002-database-choice.md` — why Supabase/Neon PostgreSQL for Phase 0 📝
- [ ] `docs/ADR/003-agent-framework.md` — why LangGraph, considered alternatives 📝
- [ ] `docs/ADR/004-auth-library.md` — why Auth.js v5, Keycloak federation plan for Phase 1 📝
- [ ] `docs/ADR/005-data-mode-toggle.md` — how `DATA_MODE` works and why it's a single env variable 📝

### 12.4 Developer Onboarding

- [ ] `CONTRIBUTING.md` — local setup instructions, code style guide, PR checklist, how to run tests 📝
- [ ] Update root `README.md` with a live demo link, screenshots or a demo GIF, and a quick-start section 📝
- [ ] Add an `onboarding-check` Makefile target that verifies all required tools are installed (Node, pnpm, Python, Docker, uv)

---

## Phase 13 — Phase 1 Preparation (Post-Funding Gate)

> **Gate:** Complete the Phase 0 demo, present to stakeholders, and secure funding before beginning Phase 1.

### 13.1 Kubernetes & Infrastructure

- [ ] Design Helm chart structure for `apps/web` (Next.js BFF) and `services/agent` (FastAPI)
- [ ] Write Terraform or Pulumi IaC for an EKS cluster (or AKS/GKE equivalent) targeting the client's cloud account
- [ ] Define three isolated environments: `dev`, `staging`, `production` — each with its own K8s namespace and Secrets Manager path
- [ ] Migrate secrets from Vercel env vars to AWS Secrets Manager injected via IRSA 🔒
- [ ] Configure K8s `NetworkPolicy` with default-deny ingress; open only declared service-to-service routes 🔒
- [ ] Configure K8s resource `requests` and `limits` for every container deployment

### 13.2 Security Hardening (Phase 1)

- [ ] Set up AWS WAF with the OWASP Core Rule Set in front of all public endpoints 🔒
- [ ] Configure mTLS for inter-service communication via Istio or cert-manager 🔒
- [ ] Set container security context: `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, `capabilities.drop: [ALL]` 🔒
- [ ] Implement IRSA least-privilege service accounts — no wildcard IAM policies 🔒
- [ ] Commission an independent penetration test before go-live with real HCP data 🔒
- [ ] Ensure a Business Associate Agreement (BAA) is signed with the cloud provider before any PHI is loaded 🔒

### 13.3 Observability (Phase 1)

- [ ] Deploy OpenTelemetry Collector in the K8s cluster
- [ ] Configure distributed tracing with Jaeger for all agent pipeline steps
- [ ] Deploy Prometheus and Grafana for platform metrics dashboards
- [ ] Configure PagerDuty (or SNS) alerting for pipeline failures and P0 agent errors

### 13.4 Scalability (Phase 1)

- [ ] Configure Kubernetes HPA for `services/agent` based on CPU and agent queue depth
- [ ] Add a PostgreSQL read replica for RSM dashboard queries to offload the primary
- [ ] Load test the full pipeline: 200 MRs × 150 HCPs each, verifying the ≤ 5-minute budget
- [ ] Configure daily PostgreSQL automated snapshots with a 30-day retention window 🔒

### 13.5 Rollback & Recovery

- [ ] Implement automated Helm rollback triggered by Kubernetes readiness probe failure (target: ≤ 3 minutes)
- [ ] Tag all container images with git SHA (`sha-<7>`) and semantic version (`v1.2.3`); never use `latest` in staging or production 🔒
- [ ] Conduct a database restore drill in the staging environment and document the procedure 📝
- [ ] Document the full RTO (≤ 4 hours) and RPO (≤ 1 hour) recovery procedure in `docs/RUNBOOK.md` 📝

---

## Phase 14 — HCP-Centric e-Detailing Personalization

> **Goal:** Evolve the NBA card from a simple gap alert into a rich, personalized engagement tool — covering intelligent re-engagement, personalized e-detailing, and post-event scientific follow-up.
>
> **Linked requirements:** FR-066 to FR-076

### 14.1 Intelligent Re-Engagement (FR-066 – FR-069)

- [ ] **FR-066** Add `previous_discussions` section to the HCP detail panel — display topics covered, MR notes, and HCP responses sourced from `visit_logs.notes`; limit to last 10 visits
- [ ] **FR-066** Add `GET /api/v1/hcps/[hcp_id]/discussion-history` BFF route returning paginated visit note summaries for the authenticated MR
- [ ] **FR-067** Extend the Context Synthesis Agent to run an NLP extraction pass on `visit_logs.notes` to detect commitment phrases (e.g., "will send", "follow up on", "promised"); store detected items in a new `visit_commitments` table (`commitment_id`, `visit_id`, `hcp_id`, `mr_id`, `text`, `detected_at`, `resolved`)
- [ ] **FR-067** Display pending commitments as a distinct "Open Follow-ups" list on the HCP detail panel; mark an item resolved when the MR logs a `LOG_CALL` action against the same HCP
- [ ] **FR-067** Add `data-testid="open-followups-list"` and `data-testid="followup-item"` to the follow-up list elements 🧪
- [ ] **FR-068** Extend the Context Synthesis Agent to generate up to 3 scientific discussion topic recommendations per HCP, grounded in specialty, therapy area, and historical interaction topics; validate all topic references against the active offer catalog before display 🔒
- [ ] **FR-068** Surface discussion topic recommendations on the HCP detail panel under a "Suggested Discussion Topics" section with `data-testid="discussion-topic-{n}"` 🧪
- [ ] **FR-069** Extend the Context Synthesis Agent to generate up to 3 personalized conversation starters per HCP; de-identify context before each LLM call; store starters in the NBA card payload 🔒
- [ ] **FR-069** Display conversation starters on the HCP detail panel under a "Conversation Starters" section; add a copy-to-clipboard button per starter
- [ ] Write unit tests for commitment extraction: present in notes, absent, and ambiguous phrasing 🧪
- [ ] Write unit tests for discussion topic generation: valid catalog references, hallucinated reference (must be stripped) 🧪
- [ ] Document the commitment detection pattern list and how to extend it in `docs/AGENT_PIPELINE.md` 📝

### 14.2 Personalized e-Detailing (FR-070 – FR-073)

- [ ] **FR-070** Add an `hcp_engagement_profile` table: `hcp_id`, `mr_id`, `content_type`, `topic`, `engagement_score`, `last_updated`; populate from `nba_action_log` and `visit_logs` on the weekly re-weighting job
- [ ] **FR-070** Extend `GET /api/v1/hcps/[hcp_id]` to include a `preferred_topics` array derived from the engagement profile
- [ ] **FR-071** Implement an `OptimalDetailingSequenceAgent` (or extend `OfferRecommendationAgent`) that returns an ordered list of up to 5 content assets, ranked by the HCP's engagement profile; use a heuristic ranking in Phase 0 (specialty match + engagement score)
- [ ] **FR-071** Expose the detailing sequence as a `detailing_sequence[]` field on the NBA card API response and display it as a numbered list on the HCP detail panel under "Recommended Detailing Order" 🔒
- [ ] **FR-072** Mark high-engagement assets with a "High Engagement" badge (`data-testid="high-engagement-badge"`) on the HCP detail panel; derive the badge from the `engagement_score` percentile within the HCP's specialty peer group 🧪
- [ ] **FR-073** Implement per-HCP content suppression: after 3 consecutive low-engagement interactions with an asset, add it to a `suppressed_assets` list in the engagement profile; suppressed assets SHALL NOT appear in the primary detailing sequence
- [ ] **FR-073** Add a "More content" collapsible drawer on the HCP detail panel showing suppressed assets with a "Why hidden?" tooltip
- [ ] Write unit tests for detailing sequence ranking: high-engagement asset ranks first, low-engagement asset ranks last 🧪
- [ ] Write unit tests for suppression threshold: exactly 3 low-engagement interactions triggers suppression, 2 does not 🧪

### 14.3 Post-Event Scientific Engagement (FR-074 – FR-076)

- [ ] **FR-074** Add `hcp_events` table: `event_id`, `name`, `date`, `end_date`, `type` (`CONFERENCE | CME | PRODUCT_LAUNCH | OTHER`), `therapy_area`, `hcp_ids[]` (stored as a junction table `event_hcp`), `tenant_id`
- [ ] **FR-074** Add `POST /api/v1/admin/events` and `GET /api/v1/admin/events` routes (Admin role required) to allow manual entry of event attendance records 🔒
- [ ] **FR-074** Extend the Gap Detection Agent to also flag HCPs with a qualifying event end date within the past 48 hours; generate a `POST_EVENT_FOLLOWUP` NBA card type with elevated priority
- [ ] **FR-074** Surface post-event cards with a distinct "Post-Event Follow-up" badge on the MR feed (`data-testid="post-event-badge"`) 🧪
- [ ] **FR-075** Extend the Context Synthesis Agent to generate a personalized outreach message draft for post-event cards: reference the event name, align to the HCP's clinical interests; de-identify all context before the LLM call 🔒
- [ ] **FR-075** Display the outreach draft in a rich-text editor (editable) on the post-event HCP detail panel; add a "Copy draft" button with `data-testid="copy-draft-btn"` 🧪
- [ ] **FR-075** Store the outreach draft (original + edited version) in `nba_action_log` as `action_type = DRAFT_MESSAGE` when the MR copies or sends it 🔒
- [ ] **FR-076** Extend the offer matching in `OfferRecommendationAgent` to accept an `event_topic` filter parameter; surface matched assets on the post-event card
- [ ] **FR-076** If no catalog asset matches the event topic, display "No relevant materials for this event" placeholder and still surface the outreach draft (FR-075)
- [ ] Write unit tests for post-event card triggering: event ended < 48 hours ago (triggers), > 48 hours ago (does not trigger) 🧪
- [ ] Write unit tests for outreach draft generation: valid draft, de-identification check (no HCP name in LLM input), no matching asset fallback 🧪
- [ ] Add Playwright E2E test **E2E-009 — Post-Event Card**: Admin creates an event → MR feed shows post-event card within refresh → MR opens detail panel → outreach draft and event badge are visible 🧪
- [ ] Document the post-event flow, `hcp_events` schema, and how to add event sources in `docs/AGENT_PIPELINE.md` 📝

---

## Phase 0 Demo — Completion Checklist

> Use this checklist to confirm Phase 0 is ready for stakeholder presentation.

- [ ] Application is live on a public Vercel URL 🚀
- [ ] An MR can log in and see a prioritised NBA feed of 25 mock HCPs with urgency badges
- [ ] An MR can tap a card and view AI-generated talking points and a recommended offer asset
- [ ] An MR can take all four actions (Schedule Visit, Log Call, Dismiss, Snooze) from the card
- [ ] An RSM can view their team's NBA compliance rate dashboard
- [ ] An Admin can toggle `DATA_MODE` and view the pre-flight checklist
- [ ] The Python agent service is reachable on Render and the pipeline completes within 5 minutes for 25 MRs 🚀
- [ ] GitHub Actions CI passes on every PR (lint, type-check, unit tests, Playwright smoke tests)
- [ ] Vercel creates a preview deployment for every PR automatically
- [ ] No secrets or credentials are committed to the repository 🔒
- [ ] RBAC is enforced: MRs cannot access the RSM dashboard or Admin Console 🔒
- [ ] The audit log is recording all HCP data access and auth events 🔒
- [ ] All P0 functional requirements (FR-001 to FR-016, FR-024 to FR-027, FR-030 to FR-032, FR-035) are verified
- [ ] All P0 non-functional requirements (NFR-001 to NFR-006, NFR-008, NFR-010, NFR-012 to NFR-017, NFR-021-S, NFR-024-S, NFR-025-S) are satisfied
- [ ] Unit test coverage ≥ 80% for agent service and frontend 🧪
- [ ] Integration test coverage ≥ 60% for agent service 🧪
- [ ] All eight Playwright E2E smoke tests pass 🧪
- [ ] `docs/` folder contains: `README` (root), `ARCHITECTURE.md`, `AGENT_PIPELINE.md`, `SECURITY.md`, `RUNBOOK.md`, `TESTING.md`, `CI_CD.md`, `DATABASE.md`, `SCORING.md`, `MOCK_DATA.md` 📝
- [ ] Monthly infrastructure cost is within the $0–$30 free-tier budget (Vercel + Supabase/Neon + Render)
