# openNBA — Product Requirements Document (PRD)

**Version:** 0.1 — Pilot Specification
**Status:** Draft
**Date:** June 2026
**Author:** Nagarro Engineering
**Target Client:** Sun Pharma (Pilot); General Sales & Service (Future)

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Target Users](#2-target-users)
3. [Core Features](#3-core-features)
4. [User Flows](#4-user-flows)
5. [Technical Constraints](#5-technical-constraints)
6. [Success Metrics](#6-success-metrics)
7. [Open Questions & Assumptions](#7-open-questions--assumptions)
8. [Phasing Summary](#8-phasing-summary)

---

## 1. Problem Statement

### 1.1 The Business Gap

Pharmaceutical Medical Representatives (MRs) are the primary human touchpoint between drug manufacturers and prescribing Healthcare Providers (HCPs). The commercial effectiveness of this relationship depends on:

- **Timing:** reaching an HCP before prescribing habits shift.
- **Relevance:** arriving with the right clinical data, asset, or offer.
- **Frequency:** preventing visit gaps that erode mindshare.

In practice, MRs manage 80–150 HCPs concurrently. Without automated intelligence, high-value HCPs go unvisited for 60+ days. By the time a lapse is noticed, the HCP has often already switched to a competitor's drug or therapy protocol. There is no automated system surfacing this to the MR with actionable context.

### 1.2 The Tools Gap

Enterprise Next Best Action platforms — Pega Customer Decision Hub (CDH), Salesforce Marketing Cloud (SFMC), and Veeva Align — are closed, expensive SaaS monoliths:

| Dimension | Pega CDH / SFMC | **openNBA** |
|---|---|---|
| License cost | $200K–$2M+/yr | Infra-only (open-source stack) |
| Time to first demo | 6–18 months | **4–6 weeks** |
| Customization | Consultant-heavy | Config-driven + API-first |
| Agent intelligence | Static rule engine | **Continuous-learning AI agents** |
| Mock-to-production | Not supported | **Built-in toggle** |
| Vendor lock-in | High | None — open standards |

### 1.3 The Opportunity

A lightweight, agentic, open-architecture NBA accelerator — built on hyperscaler-native infrastructure — can be demoed on synthetic data within weeks, securing client funding before a single line of production integration is written.

---

## 2. Target Users

### 2.1 Primary: Medical Representatives (MRs)

- **Role:** Field-facing pharmaceutical sales professionals.
- **Context:** Mobile-first, often offline or low-bandwidth. Time-poor.
- **Pain points:** No visibility into visit gaps, no contextual talking points, no smart scheduling suggestions.
- **Success looks like:** Opening the app each morning and seeing a ranked list of "who to visit today and why," with one-tap call prep.

### 2.2 Secondary: Regional Sales Managers (RSMs)

- **Role:** Supervise 8–15 MRs per territory.
- **Context:** Dashboard-first. Need team-level performance visibility and override capability.
- **Success looks like:** A roll-up view of NBA compliance rates and gap coverage by territory.

### 2.3 Future Users (Post-MVP)

- **General Sales Agents:** Financial services, insurance, B2B SaaS.
- **Service Agents:** Customer success, field service.

The platform is domain-configurable from day one; the pharma MR vertical is the initial vertical module.

---

## 3. Core Features

### 3.1 Agent-Driven Prioritization Engine

**What it does:** A stateful multi-agent system continuously scores and re-ranks each MR's HCP portfolio to produce a daily prioritized action list.

**Agent roles:**

| Agent | Responsibility |
|---|---|
| Signal Harvester | Ingests visit logs, CRM events, prescription proxies, HCP specialty metadata, calendar |
| Gap Detection | Flags HCPs with 60+ day gaps; computes `gap_days × prescriber_tier × therapy_area_priority` |
| Context Synthesis | LLM call: 3-sentence interaction summary + 3 personalized talking points per HCP |
| Scheduling | Analyzes historical acceptance patterns; suggests optimal contact windows |
| Offer Recommendation | Queries eligibility engine; attaches best content asset, sample, or offer |

**Orchestration:** LangGraph stateful workflow with per-HCP state persistence. Runs on daily schedule and on-demand (MR-triggered refresh).

**Learning loop:** MR actions (accepted/rejected, visit outcome) feed a feedback vector store. Scoring model re-weights signals weekly.

---

### 3.2 Pluggable Offer & Eligibility Engine

**Architecture:**

- **Native catalog:** JSON/YAML-defined offers, samples, content assets, and events stored natively.
- **Rule engine:** Open Policy Agent (OPA) evaluates HCP eligibility (specialty, tier, formulary status, region).
- **External adapter interface:** Typed REST/GraphQL adapter layer for Veeva Vault, SAP CRM, or client MDM. Adapters registered as plugins; core engine unchanged.
- **Event ingestion hook:** EventBridge/Pub-Sub consumer stub for clients who push offer updates from upstream.

**MVP scope:** Native catalog only. Stub adapters for Veeva Vault and SAP defined but not connected.

---

### 3.3 Re-Engaging Lapsed Prescribers — MVP Workflow

**Trigger:** HCP visit gap ≥ 60 days (configurable: 45 / 90 days).

**MR experience:**

1. **Alert Card** — Push notification + in-app card: "Dr. Priya Sharma (Cardiologist, Mumbai South) — last visited 68 days ago. High-priority re-engagement."
2. **Context Panel** — Last interaction summary (LLM, ≤3 sentences), prescriber tier, therapy area, relevant news.
3. **Talking Points** — 3 personalized bullets aligned to HCP specialty and current campaign.
4. **Recommended Asset** — One content asset (detail aid, journal reprint, CME invite) matched to HCP.
5. **Smart Scheduling** — "Best time: Tuesday–Wednesday, 10:00–11:30 AM based on 12-month acceptance history."
6. **Action Buttons** — `Schedule Visit` | `Log Call` | `Dismiss` | `Snooze 7 days`

**Post-action system behavior:**

| MR Action | System Response |
|---|---|
| Schedule Visit | Gap timer resets; HCP priority drops |
| Log Call | Visit event written to CRM stub; HCP marked contacted |
| Dismiss | Feedback logged; agent de-weights HCP temporarily |
| Snooze 7 days | HCP re-surfaces after 7 days with updated context |
| No action (48h) | Escalation flag visible on RSM dashboard |

---

### 3.4 Mock-to-Production Toggle

**Mechanism:** `DATA_MODE` environment variable (`MOCK | LIVE`) controls the data provider at the service boundary.

**Mock mode:**
- `MockDataProvider` serves pre-generated HCP profiles, visit histories, interaction logs, and offer catalogs from a local Parquet/JSON store.
- Synthetic dataset: 500 HCP personas × 5 therapy areas × 18 months visit history × 30%+ deliberate 60-day gaps.
- All agents, scoring, LLM calls, and UI flows operate identically in both modes.

**Production transition checklist (auto-generated in admin UI):**

1. Configure CRM connector credentials
2. Map client HCP ID schema to openNBA canonical schema
3. Run data validation suite (included)
4. Set `DATA_MODE=LIVE`
5. Monitor signal harvester health dashboard

---

## 4. User Flows

### 4.1 MR Daily Workflow

```
Morning launch
    │
    ▼
[App Home] ─── NBA Feed (ranked HCP list, urgency badges)
    │
    ├── Tap HCP Card
    │       │
    │       ▼
    │   [HCP Detail Panel]
    │       ├── Gap Alert + Summary
    │       ├── Talking Points
    │       ├── Recommended Asset
    │       └── Smart Schedule Suggestion
    │               │
    │               ├── [Schedule Visit] → Calendar integration → Gap timer reset
    │               ├── [Log Call]       → CRM write-back stub
    │               ├── [Snooze]         → Feedback loop → Re-rank
    │               └── [Dismiss]        → Feedback loop → De-prioritize
    │
    └── Pull-to-refresh → Agent re-run on demand
```

### 4.2 RSM Oversight Flow

```
RSM Dashboard
    │
    ├── Territory Heat Map (gap coverage by MR / geography)
    ├── Team NBA Compliance Rate (% of recommendations acted on)
    ├── Drill-down: MR → HCP → Action History
    └── Override: Manually elevate HCP priority for an MR
```

### 4.3 Mock-to-Live Transition Flow (Admin)

```
Admin Console
    │
    ├── Environment: [MOCK ●] → Toggle → [LIVE]
    ├── Connector Config: CRM URL / API Key / Schema Map
    ├── Run: Data Validation Suite
    │       └── Pass/Fail report per HCP field
    └── Confirm → Hot-reload data provider (zero downtime)
```

---

## 5. Technical Constraints

### 5.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     MR / RSM Frontend                    │
│              React / Next.js  +  PWA (mobile)            │
└──────────────────────┬──────────────────────────────────┘
                       │ REST / GraphQL / WebSocket
┌──────────────────────▼──────────────────────────────────┐
│                   API Gateway / BFF                       │
│              Node.js (Fastify)  +  Auth (JWT/OIDC)       │
└──┬─────────────────────────────────────────────┬─────────┘
   │                                             │
┌──▼───────────────┐               ┌─────────────▼────────┐
│  Agent Service   │               │  Offer & Eligibility  │
│  Python/LangGraph│               │  Service (Python/OPA) │
│  ├ Signal Harv.  │               │  ├ Native Catalog      │
│  ├ Gap Detection │               │  ├ Rule Engine (OPA)   │
│  ├ Context Synth │               │  └ External Adapters   │
│  ├ Scheduling    │               └──────────────────────┘
│  └ Offer Rec.    │
└──┬───────────────┘
   │ LLM API calls (de-identified context only)
┌──▼────────────────┐   ┌──────────────────────────────────┐
│  LLM Provider     │   │  Data Layer                       │
│  AWS Bedrock      │   │  PostgreSQL 16 (structured)       │
│  (Claude 3.5)     │   │  Weaviate (vector / RAG)          │
│  Fallback: OpenAI │   │  S3 (documents / assets)          │
└───────────────────┘   │  MockDataProvider (MOCK mode)     │
                        └──────────────────────────────────┘
```

### 5.2 Infrastructure Constraints

| Constraint | Specification |
|---|---|
| Deployment target | Kubernetes (EKS primary; AKS/GKE via Helm chart variants) |
| Containerization | Docker; all service images < 500 MB |
| Infra-as-code | Terraform modules per hyperscaler |
| CI/CD | GitHub Actions → container registry → Helm release |
| Auth | OIDC / OAuth2; Keycloak self-hosted or client IdP federation |
| Data residency | All PHI/HCP data stays within client's cloud account VPC |
| LLM calls | No HCP PII sent to external LLM APIs; context de-identified before inference |
| Offline support | PWA service worker caches last 24h NBA feed for offline access |
| API contracts | OpenAPI 3.1 spec published for all internal services |

### 5.3 Agentic Framework Constraints

- **Framework:** LangGraph (Python) for stateful graph-based agent workflows.
- **Agent isolation:** Each MR's workflow runs as an independent graph instance — no cross-MR state bleed.
- **Observability:** LangSmith tracing (or self-hosted equivalent) for step inspection, latency, and token cost.
- **Graceful degradation:** If LLM is unavailable, gap alerts and scheduling still surface; talking points fall back to templates.
- **Token budget:** Context Synthesis Agent capped at 2,000 input tokens / 300 output tokens per HCP card.

### 5.4 Modularity & Extensibility

- **Vertical plugin system:** `VerticalConfig` schema defines domain terminology, scoring weights, and eligibility rules. Pharma MR = `verticals/pharma_mr.yaml`. New verticals added without touching core engine.
- **Offer adapter interface:** Python abstract base class; adapters implement `fetch_offers(hcp_id)` and `check_eligibility(hcp_id, offer_id)`.
- **Frontend theming:** CSS variable-based white-labeling per client.

### 5.5 Data Privacy & Compliance

- HCP PII fields (name, NPI, address) encrypted at rest (AES-256) and in transit (TLS 1.3).
- Immutable audit log for every data access event.
- India DPDP Act alignment: data minimization; configurable retention window (default: 24 months).
- HIPAA readiness checklist included in deployment runbook (BAA with cloud provider required pre-production).
- No HCP identifiers transmitted to third-party LLM APIs.

---

## 6. Success Metrics

### 6.1 Pilot Phase (Mock Demo — Weeks 1–6)

| Metric | Target | Measurement |
|---|---|---|
| Demo-ready environment setup time | ≤ 2 days from repo clone | Engineering log |
| Stakeholder demo approval rating | ≥ 4 / 5 | Post-demo survey |
| NBA recommendation latency (P95) | < 3 seconds | Synthetic load test |
| Mock dataset coverage | 500 HCPs, 5 therapy areas, 30%+ gap rate | Data generator output |
| Pilot infra monthly cost | < $500 (AWS t3.medium cluster) | Cloud billing |

### 6.2 Funded Pilot / Production Phase (Months 3–12)

| Metric | Target | Rationale |
|---|---|---|
| 60+ day gap reduction | ≥ 25% within 90 days | Primary clinical outcome |
| MR Daily Active Usage (DAU/MAU) | ≥ 60% | Platform adoption health |
| Recommendation acceptance rate | ≥ 40% (visit scheduled after NBA alert) | Agent relevance quality |
| Time-to-action on NBA card | ≤ 24 hours median | Urgency signal effectiveness |
| Prescription lift (therapy area) | ≥ 10% vs control territory (A/B) | Commercial outcome |
| Platform TCO vs Pega/SFMC | ≥ 60% cost reduction | Competitive positioning |

### 6.3 Agent Quality Metrics (Ongoing)

| Metric | Target |
|---|---|
| Talking point relevance (LLM self-eval) | ≥ 4.0 / 5.0 |
| Gap detection false positive rate | < 5% |
| Scheduling suggestion acceptance rate | ≥ 35% |
| LLM cost per MR per day | < $0.05 |

---

## 7. Open Questions & Assumptions

| # | Question | Assumption Used in This Spec |
|---|---|---|
| 1 | Primary hyperscaler for Sun Pharma pilot? | AWS (EKS + Bedrock); Helm charts for AKS/GKE provided |
| 2 | Does Sun Pharma use Veeva CRM? | Assumed yes; Veeva adapter stub included in MVP scope |
| 3 | MR device — native app or PWA acceptable? | Next.js PWA for pilot; native app deferred |
| 4 | Prescription data availability? | Not assumed in pilot; scoring uses visit cadence + CRM interactions only |
| 5 | Regional language UI (Hindi, Marathi)? | Deferred; i18n scaffold included in frontend |
| 6 | RSM hierarchy depth? | 2-level (MR → RSM); N-level hierarchy deferred |
| 7 | LLM provider preference? | AWS Bedrock (Claude 3.5) primary; OpenAI fallback |

---

## 8. Phasing Summary

| Phase | Scope | Timeline | Gate |
|---|---|---|---|
| **Phase 0 — Demo** | Mock data, 1 MVP workflow (60-day gap), core agent pipeline | Weeks 1–6 | Stakeholder funding approval |
| **Phase 1 — Pilot** | Live CRM integration (read-only), 1 territory, real HCPs | Weeks 7–16 | 50 MRs onboarded, DAU target hit |
| **Phase 2 — Scale** | Full offer engine, scheduler integration, RSM dashboard, 2nd vertical | Months 3–6 | Commercial contract signed |
| **Phase 3 — Platform** | Multi-client, self-serve vertical config, ML feedback loop | Months 6–12 | 3+ clients live |

---

*This document is a living specification. Open questions should be resolved in the discovery workshop with Sun Pharma's commercial and IT stakeholders before Phase 0 kickoff.*
