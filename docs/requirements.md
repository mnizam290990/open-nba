# openNBA — Functional & Non-Functional Requirements

**Version:** 0.5
**Status:** Draft — HCP-centric e-detailing personalization added
**Date:** June 2026
**Linked PRD:** [PRD.md](PRD.md)

> Requirements are identified as `FR-xxx` (Functional), `NFR-xxx` (Non-Functional), `EH-xxx` (Error Handling), and `OOS-xxx` (Out of Scope).
> Priority: **P0** = MVP blocker | **P1** = Pilot must-have | **P2** = Post-pilot

---

## Deployment Profiles

openNBA supports three deployment profiles across its lifecycle. Requirements that differ between profiles are annotated `[Phase 0]`, `[BYOC]`, or `[SaaS]`. Un-annotated requirements apply to all profiles.

| Profile | Phase | Who Operates Infra | Stack | Primary Use Case |
|---|---|---|---|---|
| **Phase 0 — Pre-funding Demo** | Phase 0 | Nagarro (zero-cost, serverless) | Vercel + open-source DB | Stakeholder demo on synthetic data; secure funding. No K8s, no cloud spend. |
| **BYOC** (Bring Your Own Cloud) | Phase 1+ | Client deploys in their own cloud account (VPC) | K8s (EKS/AKS/GKE) + managed DB | Regulated pharma clients (Sun Pharma); HIPAA/DPDP-sensitive data |
| **Hosted SaaS** | Phase 2+ | Nagarro operates shared multi-tenant infra | K8s + managed DB | Non-regulated verticals (insurance, B2B SaaS, field service) |

**Phase 0 stack (pre-funding):**
- **Frontend + BFF:** Next.js deployed on Vercel (free Hobby tier); API routes serve as serverless BFF functions.
- **Agent service (Python/LangGraph):** Deployed on Render or Railway free tier; or run via local Docker for in-person demos.
- **Database:** PostgreSQL only — Supabase or Neon free tier (open-source, zero managed-cloud cost). No AWS RDS.
- **Vector store:** Weaviate self-hosted in Docker (local or Render); Weaviate Cloud free tier as alternative.
- **Secrets:** Vercel Environment Variables + `.env` files (never committed). AWS Secrets Manager is Phase 1+.
- **CI/CD:** GitHub Actions → Vercel Git integration (automatic preview deployments per PR).
- **Estimated monthly cost:** $0–$30 (within Vercel/Supabase/Render free tiers).

---

## Table of Contents

1. [Functional Requirements](#1-functional-requirements)
   - [1.1 Agent-Driven Prioritization](#11-agent-driven-prioritization)
   - [1.2 Lapsed Prescriber Re-Engagement Workflow](#12-lapsed-prescriber-re-engagement-workflow)
   - [1.3 Pluggable Offer & Eligibility Engine](#13-pluggable-offer--eligibility-engine)
   - [1.4 Mock-to-Production Toggle](#14-mock-to-production-toggle)
   - [1.5 MR Frontend (NBA Feed)](#15-mr-frontend-nba-feed)
   - [1.6 RSM Dashboard](#16-rsm-dashboard)
   - [1.7 Admin Console](#17-admin-console)
   - [1.8 Tenant Management *(SaaS)*](#18-tenant-management-saas)
   - [1.9 Billing & Usage Metering *(SaaS)*](#19-billing--usage-metering-saas)
   - [1.10 Self-Serve Onboarding *(SaaS)*](#110-self-serve-onboarding-saas)
   - [1.11 HCP-Centric e-Detailing Personalization](#111-hcp-centric-e-detailing-personalization)
2. [Non-Functional Requirements](#2-non-functional-requirements)
   - [2.1 Performance](#21-performance)
   - [2.2 Availability & Reliability](#22-availability--reliability)
   - [2.3 Security & Compliance](#23-security--compliance)
   - [2.4 Scalability](#24-scalability)
   - [2.5 Maintainability & Extensibility](#25-maintainability--extensibility)
   - [2.6 Observability](#26-observability)
   - [2.7 Infrastructure & Deployment](#27-infrastructure--deployment)
   - [2.8 CI/CD Pipeline](#28-cicd-pipeline)
   - [2.9 Multi-Tenancy & SaaS Operations *(SaaS)*](#29-multi-tenancy--saas-operations-saas)
3. [Error Handling & Edge Cases](#3-error-handling--edge-cases)
4. [Data Requirements](#4-data-requirements)
5. [Integration Requirements](#5-integration-requirements)
6. [Out of Scope](#6-out-of-scope)
7. [Constraints & Assumptions](#7-constraints--assumptions)

---

## 1. Functional Requirements

### 1.1 Agent-Driven Prioritization

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| FR-001 | The system SHALL compute a daily NBA priority score for every HCP in an MR's portfolio. | P0 | Runs on schedule + on-demand |
| FR-002 | The priority score SHALL incorporate: visit gap (days), prescriber tier, therapy area priority, and historical visit acceptance rate. | P0 | Configurable weight coefficients per vertical |
| FR-003 | The Signal Harvester Agent SHALL ingest visit logs, CRM events, HCP specialty metadata, and calendar data. | P0 | Mock data source in MOCK mode |
| FR-004 | The Gap Detection Agent SHALL flag any HCP whose last confirmed visit exceeds the configured gap threshold (default: 60 days). | P0 | Threshold configurable per vertical config |
| FR-005 | The Context Synthesis Agent SHALL generate a plain-language interaction summary (≤3 sentences) for each flagged HCP using an LLM. | P0 | Input context must be de-identified before LLM call |
| FR-006 | The Context Synthesis Agent SHALL generate exactly 3 personalized talking points per HCP, aligned to specialty and current campaign. | P0 | LLM output validated for length and relevance |
| FR-007 | The Scheduling Agent SHALL recommend up to 3 candidate time windows based on the HCP's historical visit acceptance patterns. | P1 | Falls back to general business hours if history < 5 data points |
| FR-008 | The Offer Recommendation Agent SHALL attach exactly one content asset per HCP card from the active offer catalog. | P0 | Asset matched by HCP specialty + campaign |
| FR-009 | MR feedback (action taken, visit outcome) SHALL be stored and used to re-weight scoring signals weekly. | P1 | Feedback loop; deferred fine-tuning in Phase 0 |
| FR-010 | Each MR's agent workflow SHALL be isolated — no HCP data or scoring state shared across MR boundaries. | P0 | Security and data integrity |

---

### 1.2 Lapsed Prescriber Re-Engagement Workflow

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| FR-011 | The system SHALL deliver a push notification to the MR's device when an HCP exceeds the gap threshold. | P1 | In-app notification minimum for P0; push notification P1 |
| FR-012 | The NBA alert card SHALL display: HCP name, specialty, territory, days since last visit, prescriber tier, and urgency badge. | P0 | |
| FR-013 | The HCP detail panel SHALL display: LLM-generated summary, 3 talking points, recommended asset, and scheduling suggestion. | P0 | |
| FR-014 | The MR SHALL be able to take one of four actions from the card: Schedule Visit, Log Call, Dismiss, Snooze (7 days). | P0 | |
| FR-015 | Scheduling a visit SHALL reset the HCP's gap timer and move the HCP down the priority ranking. | P0 | |
| FR-016 | Dismissing or snoozing SHALL log a feedback event and trigger agent re-ranking. | P0 | |
| FR-017 | If an MR takes no action on a P0/P1 HCP card within 48 hours, the system SHALL surface an escalation flag to the MR's RSM. | P1 | |
| FR-018 | The gap threshold (default: 60 days) SHALL be configurable per vertical without code changes. | P1 | Via `VerticalConfig` YAML |

---

### 1.3 Pluggable Offer & Eligibility Engine

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| FR-019 | The platform SHALL maintain a native offer catalog (JSON/YAML) with fields: offer ID, type, therapy area, eligibility rules, asset URL, expiry date. | P0 | |
| FR-020 | The eligibility engine SHALL evaluate HCP eligibility against OPA-defined rules before attaching an offer to an NBA card. | P0 | |
| FR-021 | The offer adapter interface SHALL define a typed contract (`fetch_offers`, `check_eligibility`) that external adapters must implement. | P1 | Stub adapters for Veeva Vault and SAP in scope |
| FR-022 | The system SHALL support registration of external offer adapters without modifying the core engine code. | P1 | Plugin pattern |
| FR-023 | The platform SHALL provide an event ingestion hook (EventBridge/Pub-Sub) for upstream systems to push offer catalog updates. | P2 | Post-pilot |

---

### 1.4 Mock-to-Production Toggle

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| FR-024 | The platform SHALL support a `DATA_MODE` environment variable with values `MOCK` and `LIVE`. | P0 | Single-switch data source swap |
| FR-025 | In MOCK mode, all data (HCP profiles, visit history, offer catalog) SHALL be served from a local MockDataProvider. | P0 | No external dependencies |
| FR-026 | The MockDataProvider SHALL include: 500 HCP personas, 5 therapy areas, 18 months of visit history, ≥30% deliberate 60-day gaps. | P0 | Configurable via seed script |
| FR-027 | All agent workflows, LLM calls, scoring, and UI features SHALL operate identically in MOCK and LIVE modes. | P0 | Functional parity required |
| FR-028 | The admin console SHALL provide a production transition checklist that validates schema mapping and data completeness before `DATA_MODE=LIVE`. | P1 | |
| FR-029 | Switching from MOCK to LIVE SHALL not require a service restart (hot-reload data provider). | P1 | |

---

### 1.5 MR Frontend (NBA Feed)

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| FR-030 | The MR app SHALL be a Progressive Web App (PWA) accessible on mobile and desktop browsers. | P0 | Next.js 14 + Tailwind |
| FR-031 | The home screen SHALL display a prioritized list of HCP cards, sorted by NBA urgency score descending. | P0 | |
| FR-032 | The MR SHALL be able to pull-to-refresh to trigger an on-demand agent re-run. | P0 | |
| FR-033 | The app SHALL cache the last 24 hours of NBA feed data for offline access via service worker. | P1 | |
| FR-034 | The app SHALL support i18n scaffolding (English default; Hindi and Marathi deferred). | P2 | |
| FR-035 | Each HCP card SHALL display urgency badge (High / Medium / Low) derived from the priority score. | P0 | |

---

### 1.6 RSM Dashboard

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| FR-036 | The RSM dashboard SHALL display a territory heat map showing gap coverage by MR and geography. | P1 | |
| FR-037 | The dashboard SHALL show a team NBA compliance rate (% of recommendations acted on within 48h). | P1 | |
| FR-038 | The RSM SHALL be able to drill down from territory → MR → HCP → action history. | P1 | |
| FR-039 | The RSM SHALL be able to manually elevate the priority of an HCP for a specific MR. | P2 | Admin override |

---

### 1.7 Admin Console

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| FR-040 | The admin console SHALL allow toggling `DATA_MODE` between MOCK and LIVE with a pre-flight validation step. | P1 | |
| FR-041 | The admin console SHALL display the production transition checklist with pass/fail status per item. | P1 | |
| FR-042 | The admin console SHALL allow management of the native offer catalog (CRUD for offers and eligibility rules). | P1 | |
| FR-043 | The admin console SHALL display agent health metrics (last run time, success/failure rate, token cost). | P1 | |

---

### 1.8 Tenant Management *(SaaS)*

> Applies to **Hosted SaaS** profile. In BYOC, each client is a single-tenant deployment and these requirements are satisfied by the client's own infrastructure team.

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| FR-044 | The platform SHALL support a **Nagarro super-admin console** that allows Nagarro staff to create, suspend, and delete tenant workspaces without touching client-facing configuration. | P1 [SaaS] | Nagarro internal tool |
| FR-045 | Each tenant workspace SHALL be isolated at the **Kubernetes namespace level** with NetworkPolicy rules preventing cross-namespace data access. A tenant SHALL never be able to read or write another tenant's data. | P0 [SaaS] | Namespace-per-tenant model |
| FR-046 | Tenant provisioning SHALL create all required namespace resources (ServiceAccount, RoleBinding, ConfigMap for VerticalConfig, Secrets Manager path prefix) automatically via a provisioning script or operator. Manual step count to provision a new tenant SHALL be ≤ 3. | P1 [SaaS] | Infrastructure automation |
| FR-047 | Each tenant SHALL have a **tenant-scoped admin role** whose permissions are bounded to that tenant's namespace. The tenant admin SHALL be able to: manage MR user accounts, view usage metrics, configure the offer catalog, and trigger the mock-to-live transition. | P0 [SaaS] | Distinct from Nagarro super-admin |
| FR-048 | The tenant admin SHALL be able to **add and remove MR seats** from within the admin console. Removing a seat SHALL trigger the MR offboarding flow (EH-014). Adding a seat above the plan limit SHALL trigger an upgrade prompt. | P1 [SaaS] | Linked to billing plan |
| FR-049 | On contract termination, Nagarro super-admin SHALL be able to initiate **tenant offboarding**: (1) export all tenant data as a machine-readable archive (Parquet + YAML), (2) schedule namespace deletion with a 30-day grace period, (3) confirm purge. Purge SHALL be irreversible and logged. | P1 [SaaS] | GDPR / data lifecycle |
| FR-050 | The platform SHALL support **SCIM 2.0 provisioning** stub for bulk MR user creation from a client's IdP (Azure AD / Okta). Actual SCIM server implementation is P2; the stub SHALL log provisioning events for manual processing in P1. | P2 [SaaS] | Enterprise SSO provisioning |
| FR-051 | The Nagarro super-admin console SHALL display a **cross-tenant health view**: per-tenant agent pipeline status, last run time, active seat count, and monthly LLM cost. | P1 [SaaS] | Operational visibility |
| FR-052 | Each tenant workspace SHALL have a **unique subdomain** (e.g., `sunpharma.opennba.app`) or a client-mapped custom domain (`nba.sunpharma.com`) via CNAME. | P2 [SaaS] | White-labeling at DNS level |

---

### 1.9 Billing & Usage Metering *(SaaS)*

> Applies to **Hosted SaaS** profile. In BYOC, billing is a commercial agreement between Nagarro and the client; the platform is not responsible for billing.

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| FR-053 | The platform SHALL meter and record the following **per-tenant usage signals** daily: active MR seat count, HCP records loaded, agent pipeline runs, LLM tokens consumed (input + output), and S3 storage bytes used. | P1 [SaaS] | Raw telemetry for billing |
| FR-054 | The platform SHALL enforce **plan limits** per tenant based on their subscription tier. When a tenant reaches 80% of a plan limit, the tenant admin SHALL receive an in-app warning. At 100%, the relevant feature SHALL be soft-blocked with an upgrade prompt — the service SHALL NOT be hard-terminated. | P1 [SaaS] | Graceful limit enforcement |
| FR-055 | The platform SHALL support a minimum of **two subscription tiers** at launch: `Starter` (≤ 50 MR seats, ≤ 5,000 HCPs, 1 vertical) and `Growth` (≤ 200 MR seats, ≤ 50,000 HCPs, 3 verticals). An `Enterprise` tier with custom limits SHALL be configurable by Nagarro super-admin. | P1 [SaaS] | Tier definitions may evolve |
| FR-056 | The platform SHALL support a **30-day free trial** for new tenants. During trial, limits are capped at Starter tier. At trial expiry with no subscription, the workspace transitions to read-only (no new agent runs; existing NBA cards still visible for 7 days). | P1 [SaaS] | Conversion funnel |
| FR-057 | The Nagarro super-admin console SHALL generate a **monthly usage report per tenant** (CSV + JSON) containing all metered signals from FR-053, suitable for import into an external billing system (Stripe, Paddle, or invoicing tool). The platform itself SHALL NOT process payments. | P1 [SaaS] | Billing integration is OOS; export only |
| FR-058 | Each tenant admin SHALL have a **self-service usage dashboard** showing: current billing period consumption vs. plan limits (seats, HCPs, LLM calls), and a 30-day trend chart per metric. | P1 [SaaS] | Transparency reduces support tickets |
| FR-059 | LLM token consumption SHALL be attributed to the tenant whose agent workflow generated the call. The super-admin cost view SHALL show per-tenant LLM spend in USD (calculated from published Bedrock/OpenAI pricing). | P1 [SaaS] | Cost visibility for margin management |

---

### 1.10 Self-Serve Onboarding *(SaaS)*

> Applies to **Hosted SaaS** profile. In BYOC, onboarding is managed by Nagarro professional services using the existing mock-to-production checklist (FR-028).

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| FR-060 | After trial signup, the tenant admin SHALL be guided through a **7-step onboarding wizard**: (1) workspace name & subdomain, (2) vertical selection, (3) gap threshold config, (4) offer catalog import, (5) MR user invite, (6) CRM connector test (MOCK mode), (7) go-live readiness check. | P1 [SaaS] | Replaces PS-mediated onboarding |
| FR-061 | The onboarding wizard SHALL allow the tenant admin to configure **vertical settings via UI form** (therapy areas, prescriber tier definitions, scoring weights, gap threshold). The form SHALL generate the underlying `VerticalConfig` YAML — direct YAML editing SHALL remain available as an advanced option. | P1 [SaaS] | Removes engineering dependency |
| FR-062 | The onboarding wizard SHALL support **invite-based MR user onboarding**: tenant admin enters email addresses (or uploads a CSV), the system sends invitation emails with a one-time setup link, and MRs complete registration via SSO or password. | P0 [SaaS] | Core user provisioning |
| FR-063 | The tenant admin SHALL be able to view an **onboarding progress tracker** showing completion percentage and blocking items for each wizard step. Incomplete steps SHALL prevent go-live but SHALL NOT block MOCK mode demo. | P1 [SaaS] | Visibility without blocking demo |
| FR-064 | The **go-live readiness check** (final wizard step) SHALL run the same validation suite as FR-028 and present a pass/fail report. On full pass, the tenant admin SHALL request go-live approval. Nagarro super-admin SHALL receive an in-app notification and approve or reject within 48 hours. | P1 [SaaS] | Guided self-serve; Nagarro approves |
| FR-065 | The platform SHALL surface an **in-app product changelog** to tenant admins, showing the last 10 release notes with dates and links to full docs. The changelog SHALL be Nagarro-authored and served from a CMS or static config. | P2 [SaaS] | SaaS standard practice |

---

### 1.11 HCP-Centric e-Detailing Personalization

> Evolving e-detailing from one-size-fits-all to HCP-centric engagement. This section covers three personalization capability areas: Intelligent Re-Engagement, Personalized e-Detailing, and Post-Event Scientific Engagement.

#### 1.11.1 Intelligent Re-Engagement

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| FR-066 | The HCP detail panel SHALL surface a **previous discussion history** summary: topics covered in past visits, MR notes, and recorded HCP responses. History SHALL be sourced from visit log notes and CRM interaction records. | P0 | Eliminates repetitive interactions; core re-engagement signal |
| FR-067 | The Context Synthesis Agent SHALL detect and highlight **pending commitments and follow-ups** extracted from visit notes (e.g., "promised to send clinical study", "follow up on side effects question"). Pending items SHALL appear as a distinct list on the HCP detail panel. | P1 | NLP extraction from `visit_logs.notes`; flagged as `commitment_detected` |
| FR-068 | The Context Synthesis Agent SHALL recommend up to **3 relevant scientific discussion topics** per HCP, aligned to the HCP's specialty, therapy area, and historical interaction patterns derived from past visit topics. | P1 | LLM-generated; must reference only content in the active offer catalog |
| FR-069 | The system SHALL generate **personalized conversation starters** for the MR — short, context-aware opening lines grounded in the HCP's pending commitments, recent clinical events, and specialty — and display them on the HCP detail panel before a visit. | P1 | LLM-generated; de-identified context before inference; max 3 starters |

---

#### 1.11.2 Personalized e-Detailing

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| FR-070 | The system SHALL identify and surface the HCP's **preferred content types and clinical topics** based on historical engagement signals: time spent on materials, content assets shared in past visits, and action feedback (`LOG_CALL` notes). | P1 | Derived from `nba_action_log` and visit notes; updated weekly |
| FR-071 | The Offer Recommendation Agent SHALL recommend an **optimal detailing sequence** — an ordered list of up to 5 content assets — personalized to the HCP's engagement profile and specialty. The sequence SHALL be visible to the MR before a visit. | P2 | Ranking model seeded with engagement history; heuristic in Phase 0 |
| FR-072 | The HCP detail panel SHALL visually **highlight high-engagement content assets** (those that have demonstrated strong engagement for the HCP or their specialty/tier peer group) to help MRs prioritise detailing time. | P1 | Peer-group signal derived from anonymised cohort data within the tenant |
| FR-073 | The system SHALL **suppress or de-prioritize content assets** that have consistently received low engagement signals from a specific HCP (≥ 3 consecutive low-engagement interactions). Suppressed assets SHALL remain accessible in a "More content" drawer but SHALL NOT appear in the primary detailing sequence. | P2 | Prevents MR fatigue and irrelevant repetition; per-HCP suppression list |

---

#### 1.11.3 Post-Event Scientific Engagement

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| FR-074 | The system SHALL **trigger event-specific follow-up NBA cards** when an HCP has attended a medical conference, CME event, or product launch. Event attendance data SHALL be ingested from CRM tags or a manual admin-entered event record. The follow-up card SHALL be surfaced within 48 hours of the event end date. | P1 | Event entity: `event_id`, `name`, `date`, `type`, `hcp_ids[]`; stored in `hcp_events` table |
| FR-075 | The Context Synthesis Agent SHALL generate a **personalized outreach message draft** for the MR to send (via call or message) after a scientific event. The draft SHALL reference the event by name and align to the HCP's known clinical interests. The MR SHALL be able to edit the draft before sending. | P1 | LLM-generated; de-identified; draft stored in `nba_action_log` as `DRAFT_MESSAGE` |
| FR-076 | Post-event NBA cards SHALL surface **relevant clinical evidence and materials** (from the active offer catalog) aligned to the event's therapy area and the HCP's specialty. At least one content asset SHALL be attached; if none is available, the card SHALL display "No relevant materials for this event" and still surface the outreach draft. | P1 | Offer matching extends the FR-008 logic with an `event_topic` filter parameter |

---

## 2. Non-Functional Requirements

### 2.1 Performance

| ID | Requirement | Target | Priority |
|---|---|---|---|
| NFR-001 | NBA feed initial load time (cold start) | < 2 seconds (P95, mobile 4G) | P0 |
| NFR-002 | Agent pipeline end-to-end latency (scheduled daily run, 150 HCPs) | < 5 minutes total | P0 |
| NFR-003 | On-demand agent re-run (single MR, 150 HCPs) | < 60 seconds | P1 |
| NFR-004 | LLM call latency per HCP (Context Synthesis) | < 3 seconds (P95) | P0 |
| NFR-005 | HCP detail panel load time | < 1.5 seconds (P95) | P0 |
| NFR-006 | Offer eligibility check | < 200ms | P0 |

---

### 2.2 Availability & Reliability

| ID | Requirement | Target | Priority |
|---|---|---|---|
| NFR-007 | Platform availability (SLA) | 99.5% uptime (pilot); 99.9% (production) | P1 |
| NFR-008 | Graceful LLM degradation | Fallback to template-based talking points if LLM unavailable | P0 |
| NFR-009 | Data layer HA | PostgreSQL with read replica; automated failover | P1 |
| NFR-010 | Agent pipeline fault tolerance | Failed agent steps retry up to 3× with exponential backoff | P0 |
| NFR-011 | Zero-downtime deployments | Rolling update strategy via Kubernetes | P1 |

---

### 2.3 Security & Compliance

| ID | Requirement | Standard | Priority |
|---|---|---|---|
| NFR-012 | HCP PII encrypted at rest | AES-256 | P0 |
| NFR-013 | All traffic encrypted in transit | TLS 1.3 | P0 |
| NFR-014 | Authentication | OIDC / OAuth2 (Keycloak or client IdP) | P0 |
| NFR-015 | Role-based access control (RBAC) | MR, RSM, Admin roles | P0 |
| NFR-016 | No HCP identifiers sent to external LLM APIs | Context de-identified before inference | P0 |
| NFR-017 | Immutable audit log for all HCP data access events | Append-only log store | P0 |
| NFR-018 | Data residency | **[BYOC]** All PHI within client's cloud VPC. **[SaaS]** PHI within Nagarro-managed VPC in the contractually agreed AWS region; DPA required (NFR-064). | P0 |
| NFR-019 | HCP data retention configurable | Default: 24 months (DPDP alignment) | P1 |
| NFR-020 | HIPAA readiness checklist in deployment runbook | BAA with cloud provider required pre-production | P1 |
| NFR-021-S | **API rate limiting:** The BFF SHALL enforce per-user rate limits on all endpoints. The `/agent/run/{mr_id}` on-demand endpoint SHALL be limited to 5 requests per minute per MR. Breach returns HTTP 429. | Per-user rate limit | P0 |
| NFR-022-S | **WAF / DDoS protection:** All public-facing endpoints SHALL be protected by a Web Application Firewall (AWS WAF / Azure Front Door WAF). OWASP Core Rule Set SHALL be enabled as a minimum baseline. | WAF with OWASP CRS | P1 |
| NFR-023-S | **mTLS for inter-service traffic:** Internal service-to-service communication within the K8s cluster SHALL use mutual TLS (via Istio service mesh or cert-manager-issued certificates). Plain-text inter-service HTTP SHALL not be permitted in staging or production. | mTLS (Istio / cert-manager) | P1 |
| NFR-024-S | **Session management:** JWT access tokens SHALL expire after 8 hours. Refresh tokens SHALL expire after 7 days. On MR account deactivation, refresh tokens SHALL be immediately revoked in the Keycloak session store. | JWT: 8h; Refresh: 7d; revocable | P0 |
| NFR-025-S | **Server-side input validation:** All API inputs SHALL be validated against a strict schema before processing. Fields used in LLM prompt construction SHALL be sanitized to strip control characters and injection patterns before interpolation. | Schema validation + prompt sanitization | P0 |
| NFR-026-S | **Least-privilege service accounts:** Each Kubernetes service account SHALL have an associated IAM role (IRSA) scoped to the minimum permissions required by that service. No service SHALL use a wildcard IAM policy (`*` on resource or action). | IRSA least-privilege | P0 |
| NFR-027-S | **Container security context:** All containers SHALL run as a non-root user (`runAsNonRoot: true`), with a read-only root filesystem where feasible, and with all Linux capabilities dropped (`drop: ALL`). | K8s security context | P1 |
| NFR-028-S | **SBOM & image signing:** Production container images SHALL be signed using Cosign. A Software Bill of Materials (SBOM) SHALL be generated and attached to each image at build time. | Cosign + SBOM (Syft) | P2 |
| NFR-029-S | **Pre-production security assessment:** A security penetration test SHALL be conducted by an independent team before transitioning to production with real HCP data. Critical and high findings SHALL be remediated before go-live. | Pen test pre-prod | P1 |

---

### 2.4 Scalability

| ID | Requirement | Target | Priority |
|---|---|---|---|
| NFR-021 | MR user capacity (pilot) | 50–200 MRs | P0 |
| NFR-022 | MR user capacity (production) | 2,000+ MRs | P1 |
| NFR-023 | HCP records per deployment | Up to 500,000 | P1 |
| NFR-024 | Agent service horizontal scaling | Kubernetes HPA based on CPU/queue depth | P1 |
| NFR-025 | Multi-client isolation | **[BYOC]** Each client is a single-tenant deployment — isolation by design. **[SaaS]** Namespace-per-tenant with RLS (see NFR-056 to NFR-059). | P0 [SaaS] / P2 [BYOC] |

---

### 2.5 Maintainability & Extensibility

| ID | Requirement | Priority |
|---|---|---|
| NFR-026 | New vertical config (e.g., insurance agent) addable via YAML without code change | P1 |
| NFR-027 | New offer adapter addable by implementing typed interface without modifying core engine | P1 |
| NFR-028 | All internal services publish OpenAPI 3.1 contracts | P0 |
| NFR-029 | Frontend white-labeling via CSS variables (no component rewrites) | P1 |
| NFR-030 | Test coverage: unit ≥ 80%, integration ≥ 60% for agent service and offer service | P1 |

---

### 2.6 Observability

| ID | Requirement | Stack | Priority |
|---|---|---|---|
| NFR-031 | Distributed tracing for all agent workflow steps | OpenTelemetry + Jaeger | P1 |
| NFR-032 | LLM call tracing (step, tokens, latency, cost) | LangSmith (or self-hosted) | P1 |
| NFR-033 | Platform metrics dashboard | Prometheus + Grafana | P1 |
| NFR-034 | Structured JSON application logs | Consistent `trace_id` correlation | P0 |
| NFR-035 | Alerting on agent pipeline failures | PagerDuty / SNS integration | P1 |

---

### 2.7 Infrastructure & Deployment

> **Phase 0 exception:** NFR-036 to NFR-046 apply to **Phase 1+ (post-funding)** BYOC and SaaS deployments only. In Phase 0, the equivalent lightweight controls are captured in constraints C-003, C-004, C-009, and C-010.

| ID | Requirement | Target / Standard | Priority |
|---|---|---|---|
| NFR-036 | **Secrets management:** All API keys, DB credentials, and LLM tokens SHALL be stored in AWS Secrets Manager; injected into pods via IRSA — never hardcoded in container images or Helm values. | AWS Secrets Manager + K8s IRSA | P1 [Phase 1+] |
| NFR-037 | **Environment topology:** The platform SHALL maintain three environments: `dev`, `staging`, and `production`. Each SHALL have an isolated K8s namespace and dedicated Secrets Manager paths. | 3-env: dev / staging / prod | P1 |
| NFR-038 | **Recovery Time Objective (RTO):** The production platform SHALL recover from a full cluster failure within 4 hours. | RTO ≤ 4h (production) | P1 |
| NFR-039 | **Recovery Point Objective (RPO):** The production database SHALL sustain a maximum data loss of 1 hour in the event of a catastrophic failure. | RPO ≤ 1h (production) | P1 |
| NFR-040 | **Database backups:** PostgreSQL SHALL be backed up daily (automated snapshot) with a 30-day retention window. A restore drill SHALL be conducted monthly in the staging environment. | Daily backup; 30-day retention | P1 |
| NFR-041 | **Kubernetes resource quotas:** Every service deployment SHALL define explicit CPU and memory requests and limits. No service SHALL run without resource constraints. | K8s `resources.requests` + `limits` | P1 |
| NFR-042 | **Network policies:** K8s `NetworkPolicy` rules SHALL restrict inter-service traffic to declared routes only. By default, services SHALL deny all ingress except from their documented callers. | K8s NetworkPolicy (default-deny) | P1 |
| NFR-043 | **Container image hygiene:** All container images SHALL be < 500 MB. Base images SHALL be distroless or Alpine-based. Images SHALL be rebuilt weekly to pick up OS-level security patches. | < 500 MB; distroless/Alpine | P1 |
| NFR-044 | **Egress allowlisting:** Outbound egress from the cluster SHALL be restricted to an explicit allowlist: LLM provider endpoint, container registry, and monitoring services. All other egress SHALL be denied at the security group / firewall level. | Allowlist-only egress | P0 |
| NFR-045 | **Database migration strategy:** All database schema changes SHALL be applied via versioned migration scripts (Alembic for Python services). Migrations SHALL run as a pre-deployment Kubernetes Job and be idempotent. | Alembic; idempotent migrations | P1 |
| NFR-046 | **Infrastructure cost monitoring:** Cloud spend SHALL be tagged by service and environment (`tag: service=agent-service, env=staging`). A monthly budget alert SHALL be configured; notification triggers at 80% of monthly budget. | Cloud cost tagging + budget alert | P1 |

---

### 2.8 CI/CD Pipeline

> **Phase 0 CI/CD:** GitHub Actions runs lint and unit tests on every PR. Vercel's Git integration provides automatic preview deployments per branch and one-click production promotion. Helm, image scanning, and K8s rollback (NFR-048 to NFR-051) apply to Phase 1+ only.

| ID | Requirement | Target / Standard | Priority |
|---|---|---|---|
| NFR-047 | **Pipeline stages:** Every pull request SHALL pass the following sequential stages before merging: `lint → unit tests → build image → image vulnerability scan → integration tests`. | 5-stage PR gate; Phase 0: lint + unit tests only | P0 |
| NFR-048 | **Staging deployment gate:** Merges to `main` SHALL automatically deploy to `staging` only if all PR gate stages pass. A smoke test suite SHALL run post-deployment; failure SHALL block production promotion. | Auto-deploy to staging; smoke test gate | P1 |
| NFR-049 | **Production promotion gate:** Deployment from `staging` to `production` SHALL require: all tests green + image scan clean (zero critical CVEs) + explicit manual approval from a Nagarro engineer or client-designated approver. | Tests + scan + manual approval | P1 |
| NFR-050 | **Rollback:** A failed production deployment (Helm upgrade) SHALL automatically roll back to the previous release within 3 minutes, triggered by Kubernetes readiness probe failure. | Automated Helm rollback ≤ 3min | P0 |
| NFR-051 | **Image tagging strategy:** Container images SHALL be tagged with the git commit SHA (`sha-<7>`) for traceability and with a semantic version tag (`v1.2.3`) for production releases. The `latest` tag SHALL NOT be used in staging or production. | SHA + semver tags; no `latest` | P1 |
| NFR-052 | **Dependency vulnerability scanning:** A Software Composition Analysis (SCA) tool (Dependabot or Snyk) SHALL scan all service dependencies on every PR. Critical or high severity CVEs in direct dependencies SHALL block merge. | SCA on every PR; block on Critical/High | P1 |
| NFR-053 | **Branch strategy:** All changes SHALL be developed on feature branches named `feat/<ticket-id>-short-description`. Direct commits to `main` SHALL be blocked; at least one peer review approval SHALL be required before merge. | Feature branches; 1 required reviewer | P1 |
| NFR-054 | **Pipeline secrets:** CI/CD pipeline secrets (registry credentials, cloud access keys) SHALL be stored in the CI provider's encrypted secret store (GitHub Actions Secrets / Encrypted environment). They SHALL never appear in pipeline logs. | GitHub Actions encrypted secrets | P0 |
| NFR-055 | **Deployment frequency target:** The pipeline SHALL support a deployment frequency of at least once per day to `staging` and at least once per week to `production` during Phase 1+. | Staging: daily; Prod: weekly | P2 |

---

### 2.9 Multi-Tenancy & SaaS Operations *(SaaS)*

> Applies to the **Hosted SaaS** profile. In BYOC, these are either N/A or the client's responsibility.

#### Tenant Isolation

| ID | Requirement | Target / Standard | Priority |
|---|---|---|---|
| NFR-056 | **Namespace-per-tenant isolation:** Each tenant SHALL have a dedicated Kubernetes namespace. NetworkPolicy rules SHALL deny all cross-namespace pod-to-pod traffic. A penetration test SHALL verify that tenant A cannot access tenant B's data or service endpoints. | K8s namespace + NetworkPolicy | P0 [SaaS] |
| NFR-057 | **Database tenant isolation:** Each tenant's data SHALL reside in a dedicated PostgreSQL schema (schema-per-tenant within a shared cluster for Starter/Growth; dedicated RDS instance for Enterprise). Row-level security (RLS) SHALL be enabled as an additional safeguard — queries without a valid `tenant_id` context SHALL return zero rows. | Schema-per-tenant + RLS | P0 [SaaS] |
| NFR-058 | **Vector store isolation:** Each tenant's RAG embeddings (Weaviate) SHALL be stored in a dedicated collection namespaced by `tenant_id`. Cross-tenant retrieval SHALL be impossible by construction. | Tenant-namespaced Weaviate collection | P0 [SaaS] |
| NFR-059 | **LLM prompt isolation:** Agent workflows SHALL not mix context from different tenants in the same LLM call. Each call SHALL carry a tenant-scoped context object; the system SHALL log a `tenant_context_violation` error and halt the call if a cross-tenant data reference is detected. | Per-call tenant context validation | P0 [SaaS] |

#### SaaS Operations

| ID | Requirement | Target / Standard | Priority |
|---|---|---|---|
| NFR-060 | **Status page:** The platform SHALL maintain a public-facing uptime status page (e.g., Statuspage.io or self-hosted Upptime) showing real-time health for: API Gateway, Agent Service, Offer Service, and Data Layer. Incidents SHALL be posted within 15 minutes of detection. | Public status page; 15-min post SLA | P1 [SaaS] |
| NFR-061 | **Support response SLAs by tier:** `Starter` — email support, 48h first response. `Growth` — email + Slack, 8h first response. `Enterprise` — dedicated Slack channel + phone bridge, 2h first response. SLAs apply during business hours (09:00–18:00 IST Monday–Friday). | Tiered support SLAs | P1 [SaaS] |
| NFR-062 | **API versioning policy:** All externally consumed API routes SHALL be versioned (`/api/v1/`). Breaking changes SHALL require a new major version. A minimum 90-day deprecation notice SHALL be given before removing a version endpoint. | Semver API versioning; 90-day deprecation | P1 [SaaS] |
| NFR-063 | **Tenant data portability:** The platform SHALL provide a tenant-admin-triggered data export that produces a complete archive (Parquet files for structured data + YAML for config) within 24 hours of request. Export SHALL be downloadable via a time-limited signed URL (expiry: 72 hours). | Full export in ≤ 24h | P1 [SaaS] |

#### GDPR / Data Subject Rights *(SaaS)*

| ID | Requirement | Regulation | Priority |
|---|---|---|---|
| NFR-064 | **Data Processing Agreement (DPA):** Before a tenant workspace goes live with real HCP data, the system SHALL require a signed DPA to be on record. The admin console SHALL block the go-live transition (FR-064) if no DPA acknowledgement is recorded for the tenant. | GDPR Art. 28 | P1 [SaaS] |
| NFR-065 | **Right-to-erasure (RtE) API:** The platform SHALL expose a tenant-admin-callable API endpoint `DELETE /api/v1/hcps/{hcp_id}` that purges all records for a specific HCP across all tables (visits, NBA cards, action log, vector embeddings) within 72 hours of the request. A purge confirmation receipt SHALL be returned. | GDPR Art. 17 | P1 [SaaS] |
| NFR-066 | **Consent and processing register:** The platform SHALL maintain a machine-readable log of: which HCP records are held per tenant, the legal basis for processing, and the retention expiry date. This log SHALL be exportable for regulatory audit. | GDPR Art. 30 | P2 [SaaS] |

---

## 3. Error Handling & Edge Cases

> Requirements are identified as `EH-xxx`. These specify expected system behaviour when inputs are invalid, dependencies are unavailable, or data is in an unexpected state.

### 3.1 LLM & Agent Errors

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| EH-001 | If the LLM returns malformed or non-JSON output, the Context Synthesis Agent SHALL retry the call once with a simplified prompt. On second failure, the card SHALL display template-based talking points and log a `llm_output_invalid` event. | P0 | Prevents blank cards in production |
| EH-002 | If the LLM response contains drug names or clinical claims not present in the active offer catalog, the system SHALL strip the offending sentences and substitute a safe template sentence before displaying. | P0 | Hallucination guardrail — critical for pharma compliance |
| EH-003 | If the agent pipeline exceeds 10 minutes for a single MR's workflow, the run SHALL be terminated, a `pipeline_timeout` alert SHALL be sent to the monitoring system, and the last successfully computed priority list SHALL remain visible to the MR. | P1 | Prevents infinite hangs |
| EH-004 | If an individual agent step fails after 3 retries, the pipeline SHALL skip that step, mark the card as `partially_enriched`, and surface the card with available data (gap alert + tier) without the failed enrichment (e.g., no talking points). | P0 | Partial cards are better than no cards |
| EH-005 | If an on-demand MR-triggered refresh is requested while a scheduled run is already in progress for the same MR, the system SHALL queue the on-demand request and execute it immediately after the in-progress run completes. Concurrent execution for the same MR SHALL be prevented. | P1 | Prevents state corruption |

---

### 3.2 Data & CRM Errors

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| EH-006 | If the Signal Harvester receives a CRM payload with missing required fields (`hcp_id`, `visit_date`), the record SHALL be logged to a `dead_letter_queue` with the validation error, and processing SHALL continue with the remaining records. | P0 | Partial data must not halt the whole pipeline |
| EH-007 | If duplicate visit records are detected (same `hcp_id` + `mr_id` + `visit_date`), the system SHALL deduplicate by retaining the record with the later `created_at` timestamp and log a `duplicate_visit_skipped` event. | P1 | CRM systems commonly produce duplicates |
| EH-008 | If an HCP record is flagged as inactive (retired, deceased, or territory-transferred), the system SHALL remove the HCP from the active priority list within 24 hours of the flag being set and SHALL NOT generate NBA cards for inactive HCPs. | P1 | Must be driven by a field in the HCP data schema |
| EH-009 | If the CRM connector returns an HTTP 5xx or timeout error during the Signal Harvester ingestion phase, the system SHALL fall back to the most recent cached CRM snapshot (up to 24 hours old) and surface a data-staleness warning to the admin console. | P0 | Prevents empty feeds on CRM downtime |
| EH-010 | During the MOCK→LIVE schema mapping validation, if any required field mapping fails, the transition SHALL be blocked and a field-level failure report SHALL be displayed in the admin console. The system SHALL remain in MOCK mode until all required mappings pass. | P1 | Prevents going live on corrupt data |

---

### 3.3 Offer & Eligibility Errors

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| EH-011 | If no eligible offer exists for an HCP after OPA evaluation, the NBA card SHALL display a "No offer available" placeholder. The card SHALL still surface the gap alert, talking points, and scheduling suggestion. | P0 | Offer absence must not suppress the full card |
| EH-012 | If an offer's `expiry_date` passes while an MR is actively viewing the card, the card SHALL refresh on the next page load to remove the expired asset. An already-scheduled visit linked to an expired offer SHALL not be invalidated. | P1 | |
| EH-013 | If the OPA rule engine is unavailable, the system SHALL default to denying all offer attachments and surface a "Offers temporarily unavailable" notice on the card. Gap alerts and talking points SHALL still render. | P0 | Safe-fail: no offers rather than wrong offers |

---

### 3.4 User & Session Edge Cases

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| EH-014 | If an MR is offboarded (account deactivated), all open NBA cards assigned to that MR SHALL be removed from active queues within 1 hour. Assigned HCPs SHALL be flagged as "unassigned" in the RSM dashboard until reassigned. | P1 | |
| EH-015 | If an MR's JWT expires mid-session, the app SHALL silently refresh the token using the refresh token without interrupting the user. If the refresh fails, the MR SHALL be redirected to the login screen with their current page state preserved in session storage. | P0 | |
| EH-016 | Actions taken offline (dismiss, snooze, log call) SHALL be queued in the service worker and replayed in order when connectivity is restored. If a queued action conflicts with a server state update (e.g., HCP was already visited by another channel), the server state SHALL take precedence and the MR SHALL be notified. | P1 | Offline action conflict resolution |
| EH-017 | If the same HCP is present in two MRs' portfolios (shared account), NBA cards SHALL be generated independently per MR. A visit logged by MR-A SHALL reset MR-A's gap timer but SHALL NOT affect MR-B's gap timer unless the shared-account rule is explicitly configured in `VerticalConfig`. | P1 | Territory overlap edge case |

---

## 4. Data Requirements

| Entity | Key Fields | Source (MOCK) | Source (LIVE) |
|---|---|---|---|
| HCP Profile | `hcp_id`, `name`, `specialty`, `tier`, `territory`, `npi` | Synthetic generator | CRM / MDM |
| Visit Log | `visit_id`, `hcp_id`, `mr_id`, `visit_date`, `outcome`, `notes` | Synthetic generator | CRM (Veeva) |
| MR Profile | `mr_id`, `name`, `territory`, `rsm_id` | Synthetic generator | HR / CRM |
| Offer Catalog | `offer_id`, `type`, `therapy_area`, `eligibility_rules`, `asset_url` | Native YAML | Veeva Vault / SAP |
| NBA Action Log | `action_id`, `mr_id`, `hcp_id`, `action_type`, `timestamp` | Generated on interaction | Platform (write-back) |

**Mock data seed parameters (configurable):**
- `NUM_HCPS`: 500 (default)
- `NUM_MRS`: 25 (default)
- `HISTORY_MONTHS`: 18
- `GAP_RATE`: 0.35 (35% of HCPs have 60+ day gaps)
- `THERAPY_AREAS`: Cardiology, Oncology, Diabetology, Neurology, Respiratory

---

## 5. Integration Requirements

| Integration | Type | MVP Scope | Notes |
|---|---|---|---|
| Veeva CRM | REST API (read-only) | Stub adapter | Visit log pull |
| SAP CRM | REST API (read-only) | Stub adapter | HCP master data |
| AWS Bedrock | LLM API | Live (MVP) | Claude 3.5 Sonnet |
| Calendar / Scheduling | Calendar API | Stub (deep-link) | Google Calendar / Outlook |
| Client IdP (SSO) | OIDC federation | P1 | Keycloak fallback for pilot |
| Event bus (offer updates) | EventBridge / Pub-Sub | P2 | Upstream offer push |

---

## 6. Out of Scope

> This section explicitly lists items that are **not** in scope for any phase of the current specification. Its purpose is to prevent scope creep and provide clear boundaries for client-facing conversations. Items may be re-evaluated in future specifications.

| # | Out of Scope Item | Rationale |
|---|---|---|
| OOS-001 | **Prescription / Rx data ingestion and scoring** | Prescription data feeds require separate commercial agreements and regulatory review; not available for pilot. Visit cadence is the scoring proxy. |
| OOS-002 | **Patient-level data of any kind** | openNBA is an MR-facing tool; patient data must never enter the platform. HCP-level aggregates only. |
| OOS-003 | **Native mobile app (iOS / Android)** | PWA is sufficient for pilot. Native app requires App Store review cycles incompatible with the 4–6 week Phase 0 timeline. Re-evaluate post-pilot based on MR adoption feedback. |
| OOS-004 | **Clinical trial or regulatory submission workflows** | These require GxP-validated systems (21 CFR Part 11); out of scope for a commercial MR engagement tool. |
| OOS-005 | **HCP territory management (assigning HCPs to MRs)** | Territory assignment is managed upstream in the client's CRM (Veeva). openNBA consumes territory assignments; it does not manage them. |
| OOS-006 | **Competitor intelligence or market access data** | No integration with IMS/IQVIA, APLD, or formulary access data feeds in any phase of this specification. |
| OOS-007 | **HCP NPI registry or medical board integration** | HCP identity and credential verification is the responsibility of the client's MDM; not an openNBA function. |
| OOS-008 | **RSM hierarchy beyond 2 levels (MR → RSM)** | N-level hierarchy (e.g., RSM → NSM → VP) requires additional RBAC modeling; deferred to Phase 3. |
| OOS-009 | **Multi-tenancy (multiple clients on a shared cluster)** | Phase 0–2 is single-client. Multi-tenant architecture is a Phase 3 concern. Each client gets their own deployment until then. |
| OOS-010 | **ML model fine-tuning or custom model training** | Phase 0 uses heuristic scoring weights. LLM calls use foundation models as-is. Fine-tuning on client interaction data is deferred to Phase 2+. |
| OOS-011 | **Real-time event streaming for signal ingestion** | Kafka / EventBridge consumer for live CRM event streaming (FR-023) is P2/post-pilot. Phase 1 uses scheduled batch ingestion. |
| OOS-012 | **Regional language UI (Hindi, Marathi, others)** | i18n scaffolding is included (FR-034, P2); actual translations and locale testing are out of scope for all pilot phases. |
| OOS-013 | **HCP feedback or two-way communication features** | openNBA surfaces intelligence to MRs; it does not provide tools for HCPs to communicate back or rate MR interactions. |
| OOS-014 | **Financial transaction processing (sampling, payments)** | Offer recommendations are advisory. Any actual sample dispatch, payment, or incentive processing is handled by external systems; openNBA only attaches an offer ID. |
| OOS-015 | **Automated A/B testing framework** | The PRD references A/B comparison for prescription lift metrics; the experimentation framework itself (holdout group management, statistical significance testing) is out of scope and must be run externally (e.g., via the client's analytics team). |
| OOS-016 | **In-app payment processing** | The platform meters usage and exports billing data (FR-057) but does NOT process credit card payments, generate invoices, or integrate with Stripe/Paddle. All billing transactions are handled externally by Nagarro's finance/commercial team. |
| OOS-017 | **Marketplace listing (AWS / Azure / GCP)** | Publishing openNBA as a marketplace listing (AWS Marketplace SaaS, Azure Marketplace) is deferred until Phase 3 when the SaaS product is commercially mature. Marketplace certification requires additional compliance work. |
| OOS-018 | **SCIM 2.0 server (full implementation)** | FR-050 specifies a SCIM stub for logging. A fully compliant SCIM 2.0 server supporting automated user provisioning/deprovisioning from Azure AD / Okta is out of scope for Phase 0–1. Deferred to Phase 2. |
| OOS-019 | **Public developer API with external API keys** | openNBA does not expose a public API for third-party developers in Phase 0–2. All integration is via the internal adapter pattern. A public REST API with API key management is deferred to Phase 3. |
| OOS-020 | **Webhook event subscriptions** | Outbound webhooks (e.g., `hcp.gap_threshold_exceeded`, `mr.card_acted_on`) that allow clients to subscribe to platform events from their own systems are out of scope. The event ingestion hook (FR-023) is inbound only. Webhooks deferred to Phase 3. |

---

## 7. Constraints & Assumptions

| # | Constraint / Assumption |
|---|---|
| C-001 | **[BYOC]** The platform must run entirely within the client's cloud VPC — no data leaves the account. **[SaaS]** Data resides in Nagarro's cloud VPC; contractual data residency guarantees and DPA (NFR-064) replace the VPC constraint. |
| C-002 | LLM inference context must be de-identified; no HCP name, NPI, or direct identifiers in prompt. |
| C-003 | **[Phase 0]** Pre-funding demo infra cost must not exceed $30/month — achieved by staying within Vercel, Supabase/Neon, and Render free tiers. **[Phase 1+ BYOC]** Funded pilot infra cost must not exceed $500/month (AWS EKS, t3.medium cluster). |
| C-004 | **[Phase 0]** The frontend and BFF SHALL be deployable to Vercel via `git push` with zero manual infrastructure provisioning. The Python agent service SHALL be deployable to Render or Railway via Dockerfile with zero K8s knowledge required. **[Phase 1+]** All services must be containerized and deployable via Helm chart on Kubernetes. |
| C-005 | The scoring model uses heuristic weights in Phase 0; ML-based learning loop deferred to Phase 1+. |
| C-006 | Sun Pharma uses Veeva CRM (assumed); adapter scope is read-only for pilot. |
| C-007 | Prescription data is not available for pilot scoring; visit cadence + interaction data only. |
| C-008 | MR devices are Android/iOS smartphones with modern browsers (PWA sufficient for pilot). |
| C-009 | **[Phase 0]** The only permitted database engine before funding is **PostgreSQL** (open-source). Managed proprietary databases (AWS Aurora, Google Cloud Spanner, Azure Cosmos DB) are not permitted in Phase 0. Supabase or Neon (both open-source Postgres, free tier) are the preferred hosts. The database schema must be identical in Phase 0 and Phase 1+ to ensure a zero-migration transition post-funding. |
| C-010 | **[Phase 0]** All third-party services used in Phase 0 must have a **free tier that covers the demo workload** (≤ 500 HCPs, ≤ 25 MRs, ≤ 100 agent runs/day). Paid-only services are not permitted before funding is secured. Approved free-tier services: Vercel Hobby, Supabase Free, Neon Free, Render Free, Railway Starter, Weaviate Cloud Sandbox, OpenAI API (pay-as-you-go, not subscription). |
