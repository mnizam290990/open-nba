# openNBA — Technical Architecture

**Version:** 0.1
**Status:** Draft
**Date:** June 2026
**Linked PRD:** [PRD.md](PRD.md)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Service Map](#2-service-map)
3. [Agent Service Architecture](#3-agent-service-architecture)
4. [Offer & Eligibility Engine](#4-offer--eligibility-engine)
5. [Data Architecture](#5-data-architecture)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Infrastructure & Deployment](#7-infrastructure--deployment)
8. [Security Architecture](#8-security-architecture)
9. [Observability Stack](#9-observability-stack)
10. [Architecture Decision Records (ADRs)](#10-architecture-decision-records-adrs)

---

## 1. System Overview

openNBA is a modular, event-triggered Next Best Action platform composed of independently deployable microservices. The system is designed to be:

- **Agentic:** AI agents orchestrate prioritization, context synthesis, and recommendation — not static rule trees.
- **Pluggable:** The offer/eligibility engine and data layer are swappable via typed adapter interfaces.
- **Hyperscaler-native:** Kubernetes-first, with Terraform IaC and Helm charts per hyperscaler.
- **Mock-first:** The entire system runs on synthetic data with a single environment variable switch to production.

### High-Level Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                          Client Devices                             │
│              MR Mobile (PWA)          RSM Web Dashboard             │
└───────────────────┬────────────────────────┬───────────────────────┘
                    │ HTTPS                  │ HTTPS
┌───────────────────▼────────────────────────▼───────────────────────┐
│                     CDN / WAF (CloudFront / Azure CDN)              │
└───────────────────────────────┬────────────────────────────────────┘
                                │
┌───────────────────────────────▼────────────────────────────────────┐
│                        API Gateway / BFF                             │
│                   Node.js (Fastify) — Port 4000                      │
│         Auth Middleware (JWT/OIDC)  |  Rate Limiting                 │
│         REST /api/v1  |  GraphQL /graphql  |  WS /ws                │
└────┬──────────────────┬──────────────────┬──────────────────────────┘
     │                  │                  │
┌────▼────┐      ┌──────▼──────┐   ┌──────▼───────┐
│  Agent  │      │  Offer &    │   │    Admin     │
│ Service │      │ Eligibility │   │   Service    │
│ (Python)│      │  Service    │   │  (Node.js)   │
│LangGraph│      │  (Python)   │   │              │
└────┬────┘      └──────┬──────┘   └──────────────┘
     │                  │
┌────▼──────────────────▼────────────────────────────────────────────┐
│                          Data Layer                                  │
│  PostgreSQL 16      │  Weaviate (vector)  │  S3 / GCS (assets)     │
│  (structured data)  │  (RAG / embeddings) │                        │
└────────────────────────────────────────────────────────────────────┘
     │
┌────▼──────────────────────────────────┐
│           LLM Provider                │
│   AWS Bedrock (Claude 3.5 Sonnet)     │
│   Fallback: OpenAI GPT-4o             │
│   [Context de-identified pre-call]    │
└───────────────────────────────────────┘
```

---

## 2. Service Map

| Service | Language | Framework | Port | Responsibility |
|---|---|---|---|---|
| `bff` | Node.js 20 | Fastify 4 | 4000 | API gateway, auth, BFF aggregation |
| `agent-service` | Python 3.11 | LangGraph, FastAPI | 8001 | Agent orchestration, scoring, LLM calls |
| `offer-service` | Python 3.11 | FastAPI, OPA | 8002 | Offer catalog, eligibility rules, adapters |
| `admin-service` | Node.js 20 | Fastify 4 | 4001 | Admin console API, config management |
| `data-mock` | Python 3.11 | FastAPI | 8003 | MockDataProvider, seed scripts |
| `web` | TypeScript | Next.js 14 | 3000 | MR PWA frontend |
| `admin-web` | TypeScript | Next.js 14 | 3001 | RSM + Admin dashboard frontend |

### Service Communication

- **Synchronous:** REST (internal service-to-service) and GraphQL (BFF → frontend).
- **Asynchronous:** Redis Streams (agent pipeline tasks) — swappable to AWS SQS/EventBridge in production.
- **Service discovery:** Kubernetes DNS (`service-name.namespace.svc.cluster.local`).

---

## 3. Agent Service Architecture

### 3.1 LangGraph Workflow

The agent service implements a stateful directed graph per MR using LangGraph. Each node is an agent function; edges represent conditional transitions.

```
[START]
   │
   ▼
[signal_harvester]
   │  ingests visit logs, CRM events, HCP metadata
   ▼
[gap_detection]
   │  scores all HCPs; filters gap_days >= threshold
   ▼
[context_synthesis]  ←── calls LLM (Bedrock / OpenAI)
   │  generates summary + talking points per flagged HCP
   ▼
[offer_recommendation]  ←── calls offer-service
   │  attaches best eligible offer per HCP
   ▼
[scheduling_agent]
   │  computes top-3 contact windows per HCP
   ▼
[rank_and_publish]
   │  sorts by priority score; writes to PostgreSQL
   ▼
[END]
```

**State schema (LangGraph):**

```python
class MRWorkflowState(TypedDict):
    mr_id: str
    hcp_portfolio: list[HCPRecord]
    flagged_hcps: list[FlaggedHCP]
    enriched_cards: list[NBACard]
    run_timestamp: datetime
    data_mode: Literal["MOCK", "LIVE"]
```

### 3.2 Agent Execution Model

| Trigger | Mechanism | Frequency |
|---|---|---|
| Scheduled daily run | Kubernetes CronJob (06:00 local per territory) | Daily |
| On-demand MR refresh | POST `/agent/run/{mr_id}` → async task queue | Per request |
| Feedback re-weight | Nightly batch job (aggregate feedback events) | Nightly |

### 3.3 LLM Call Design

```
Context Synthesis Agent — prompt structure:

SYSTEM: You are a pharmaceutical sales assistant. Generate a concise 
        interaction summary and talking points for an MR visit briefing.

USER:   HCP specialty: {specialty}
        Therapy area: {therapy_area}
        Last visit outcome: {outcome_summary}
        Campaign context: {campaign_brief}
        
        Output JSON: { "summary": "...", "talking_points": ["...", "...", "..."] }
```

**Token budget:**
- Max input: 2,000 tokens
- Max output: 300 tokens
- Estimated cost per card: ~$0.002 (Bedrock Claude 3.5 Sonnet pricing)
- Cost per MR per day (150 HCPs, 30% flagged = 45 cards): ~$0.09

**De-identification rule:** HCP name and NPI are stripped from the prompt context. Specialty, tier, and therapy area are retained (non-identifying).

---

## 4. Offer & Eligibility Engine

### 4.1 Component Design

```
┌─────────────────────────────────────────────────┐
│              Offer Service (Port 8002)            │
│                                                   │
│  ┌─────────────────┐   ┌───────────────────────┐ │
│  │  Offer Catalog   │   │   Eligibility Engine   │ │
│  │  (Native YAML)   │   │   (OPA + Rego rules)   │ │
│  └────────┬────────┘   └──────────┬────────────┘ │
│           │                        │               │
│  ┌────────▼────────────────────────▼────────────┐ │
│  │           Offer Adapter Registry              │ │
│  │  NativeAdapter | VeevaStubAdapter | SAPStub   │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 4.2 Offer Adapter Interface

```python
from abc import ABC, abstractmethod
from typing import List

class OfferAdapter(ABC):
    @abstractmethod
    async def fetch_offers(self, hcp_id: str) -> List[Offer]:
        """Return all available offers for a given HCP."""
        ...

    @abstractmethod
    async def check_eligibility(self, hcp_id: str, offer_id: str) -> bool:
        """Return True if the HCP is eligible for the given offer."""
        ...
```

### 4.3 OPA Eligibility Rule Example (Rego)

```rego
package opennba.eligibility

default allow = false

allow {
    input.hcp.specialty == input.offer.target_specialty
    input.hcp.tier <= input.offer.max_tier
    not input.offer.excluded_regions[input.hcp.region]
    time.now_ns() < time.parse_rfc3339_ns(input.offer.expiry_date)
}
```

---

## 5. Data Architecture

### 5.1 PostgreSQL Schema (Core Tables)

```sql
-- HCP master
CREATE TABLE hcps (
    hcp_id       UUID PRIMARY KEY,
    name         TEXT NOT NULL,
    specialty    TEXT NOT NULL,
    tier         SMALLINT NOT NULL,        -- 1 (highest) to 5
    territory_id UUID REFERENCES territories(id),
    npi          TEXT,
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- Visit log
CREATE TABLE visits (
    visit_id     UUID PRIMARY KEY,
    hcp_id       UUID REFERENCES hcps(hcp_id),
    mr_id        UUID REFERENCES mrs(mr_id),
    visit_date   DATE NOT NULL,
    outcome      TEXT,
    notes        TEXT,
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- Daily NBA cards (agent output)
CREATE TABLE nba_cards (
    card_id          UUID PRIMARY KEY,
    mr_id            UUID REFERENCES mrs(mr_id),
    hcp_id           UUID REFERENCES hcps(hcp_id),
    priority_score   NUMERIC(6,4),
    gap_days         INTEGER,
    summary          TEXT,
    talking_points   JSONB,
    offer_id         UUID,
    schedule_windows JSONB,
    generated_at     TIMESTAMPTZ DEFAULT now(),
    expires_at       TIMESTAMPTZ
);

-- MR action log (feedback)
CREATE TABLE nba_actions (
    action_id    UUID PRIMARY KEY,
    card_id      UUID REFERENCES nba_cards(card_id),
    mr_id        UUID REFERENCES mrs(mr_id),
    action_type  TEXT NOT NULL,  -- 'scheduled', 'logged_call', 'dismissed', 'snoozed'
    acted_at     TIMESTAMPTZ DEFAULT now()
);
```

### 5.2 Vector Store (Weaviate)

Used for RAG — retrieving relevant campaign context, clinical abstracts, and product information for Context Synthesis Agent prompts.

```
Collection: CampaignContent
Fields:
  - content_id (text)
  - therapy_area (text)
  - content_type (text)  # detail_aid | journal_reprint | cme_invite
  - body (text)          # indexed for vector search
  - vector (auto-generated by Weaviate)
```

### 5.3 Mock Data Provider

In `DATA_MODE=MOCK`, the `MockDataProvider` intercepts all data access calls and returns from seed files:

```
services/data-mock/
├── seed/
│   ├── hcps.parquet        # 500 HCP records
│   ├── visits.parquet      # 18 months visit history
│   ├── mrs.parquet         # 25 MR records
│   └── offers.yaml         # 20 offer definitions
├── generator/
│   └── seed_generator.py   # Configurable synthetic data generator
└── provider.py             # MockDataProvider class
```

---

## 6. Frontend Architecture

### 6.1 MR PWA (Next.js)

```
apps/web/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/             # Login / SSO callback
│   ├── feed/               # NBA Feed (home screen)
│   ├── hcp/[id]/           # HCP detail panel
│   └── settings/
├── components/
│   ├── NBACard/            # HCP priority card
│   ├── HCPDetail/          # Expandable detail panel
│   ├── TalkingPoints/      # LLM-generated bullets
│   ├── ScheduleSuggestion/ # Time window picker
│   └── ActionBar/          # Schedule/Log/Dismiss/Snooze
├── lib/
│   ├── api/                # GraphQL client (urql)
│   ├── auth/               # OIDC (NextAuth.js)
│   └── sw/                 # Service worker (offline cache)
└── public/
    └── manifest.json       # PWA manifest
```

### 6.2 State Management

- **Server state:** TanStack Query (REST) + urql (GraphQL) — no global client-side store.
- **Offline cache:** Service worker with Workbox — caches NBA feed JSON for 24h.
- **Optimistic updates:** MR actions (schedule/dismiss) reflected immediately; reconciled on next sync.

### 6.3 Design System

- **UI library:** Tailwind CSS + shadcn/ui components.
- **Theming:** CSS variables for client white-labeling (`--color-primary`, `--color-accent`, `--font-family`).
- **Urgency badge colors:** High = `#DC2626` (red), Medium = `#D97706` (amber), Low = `#16A34A` (green).

---

## 7. Infrastructure & Deployment

### 7.1 Kubernetes Architecture

```
Namespace: opennba
│
├── Deployments
│   ├── bff (2 replicas, HPA max 8)
│   ├── agent-service (2 replicas, HPA max 10)
│   ├── offer-service (2 replicas, HPA max 6)
│   ├── admin-service (1 replica)
│   └── data-mock (1 replica, MOCK mode only)
│
├── StatefulSets
│   ├── postgresql (1 primary + 1 replica)
│   └── weaviate (1 node, pilot; 3 nodes production)
│
├── CronJobs
│   ├── agent-daily-run (06:00 per territory TZ)
│   └── feedback-reweight (02:00 UTC nightly)
│
├── ConfigMaps
│   ├── vertical-config (pharma_mr.yaml)
│   └── offer-catalog
│
└── Secrets
    ├── db-credentials
    ├── llm-api-keys
    └── idp-client-secrets
```

### 7.2 Terraform Module Structure

```
infra/terraform/
├── modules/
│   ├── eks/           # AWS EKS cluster
│   ├── aks/           # Azure AKS cluster
│   ├── gke/           # GCP GKE cluster
│   ├── rds/           # PostgreSQL (RDS or Cloud SQL)
│   ├── s3/            # Object storage
│   └── iam/           # Service account + IRSA
├── environments/
│   ├── pilot/         # Small cluster (t3.medium, 3 nodes)
│   └── production/    # Larger cluster (m5.xlarge, auto-scale)
└── main.tf
```

### 7.3 CI/CD Pipeline

```
GitHub Actions:

PR → [ Lint ] → [ Unit Tests ] → [ Build Images ] → [ Push to ECR/ACR ]
                                                              │
main → [ Integration Tests ] → [ Helm Lint ] → [ Deploy to Staging ]
                                                              │
tag → [ Security Scan (Trivy) ] → [ Deploy to Production ] ──┘
```

### 7.4 Pilot Infrastructure Cost Estimate (AWS)

| Resource | Spec | Monthly Cost (est.) |
|---|---|---|
| EKS Node Group | 3 × t3.medium | ~$100 |
| RDS PostgreSQL | db.t3.micro, 20GB | ~$25 |
| S3 + CloudFront | 10GB assets | ~$5 |
| Bedrock LLM | 50 MRs × 45 cards × $0.002 | ~$4/day = ~$120 |
| NAT Gateway | Standard | ~$35 |
| Misc (logs, monitoring) | — | ~$20 |
| **Total** | | **~$305/month** |

---

## 8. Security Architecture

### 8.1 Authentication Flow

```
MR App → BFF → Keycloak (OIDC) → JWT issued
                    │
                    └── Client IdP federation (SAML / OIDC) [P1]
```

### 8.2 Data De-identification for LLM

```
Raw HCP context (internal):        De-identified prompt (to LLM):
  name: "Dr. Priya Sharma"    →      [REDACTED]
  npi:  "1234567890"          →      [REDACTED]
  specialty: "Cardiology"     →      specialty: "Cardiology"
  tier: 1                     →      tier: 1
  last_visit_notes: "..."     →      last_visit_notes: "..."
```

### 8.3 Network Security

- All inter-service traffic within cluster stays on private VPC subnet.
- External egress: only to LLM provider endpoint (allowlisted in security group).
- No public endpoint for agent-service, offer-service, or data-mock.

---

## 9. Observability Stack

| Layer | Tool | What It Monitors |
|---|---|---|
| Distributed tracing | OpenTelemetry → Jaeger | Request flow across services |
| LLM tracing | LangSmith (or Langfuse self-hosted) | Agent steps, token cost, latency |
| Metrics | Prometheus + Grafana | CPU, memory, request rate, error rate |
| Logs | Structured JSON → CloudWatch / Loki | Application events with `trace_id` |
| Alerting | Grafana AlertManager → PagerDuty/SNS | Pipeline failures, latency spikes |
| Synthetic monitoring | k6 (daily smoke test) | End-to-end NBA feed load time |

---

## 10. Architecture Decision Records (ADRs)

### ADR-001: LangGraph over CrewAI for Agent Orchestration

**Status:** Accepted

**Context:** Need a framework for multi-agent NBA workflow. Evaluated LangGraph, CrewAI, and AutoGen.

**Decision:** LangGraph.

**Rationale:**
- Explicit stateful graph model maps naturally to the sequential signal → score → enrich → rank pipeline.
- Per-node checkpointing enables retry of individual failed steps without restarting the full workflow.
- LangSmith integration provides built-in cost and latency visibility.
- No role-assignment overhead (CrewAI) or Microsoft ecosystem dependency (AutoGen).

**Trade-offs:** Higher initial complexity than CrewAI for simple pipelines. Accepted given the need for auditability.

---

### ADR-002: OPA for Eligibility Rules over Custom Code

**Status:** Accepted

**Context:** Eligibility rules for offers are complex, client-specific, and change frequently.

**Decision:** Open Policy Agent (OPA) with Rego rules loaded from ConfigMap.

**Rationale:**
- Rules are declarative YAML/Rego — business users can review them without reading Python code.
- Rules can be updated at runtime via ConfigMap reload without redeployment.
- OPA is cloud-native and well-supported on Kubernetes.

**Trade-offs:** Rego has a learning curve. Mitigated by providing rule templates and a rule-authoring guide.

---

### ADR-003: PWA over Native Mobile App for Pilot

**Status:** Accepted

**Context:** MRs are mobile-first. Evaluated native (React Native), PWA, and CRM embedded widget.

**Decision:** PWA via Next.js.

**Rationale:**
- No App Store review cycle — critical for a 4–6 week pilot timeline.
- Single codebase for mobile + desktop.
- Offline cache via service worker meets the core MR offline requirement.
- React Native deferred to Phase 2 if adoption data justifies it.

**Trade-offs:** No push notifications on iOS without a native shell. Mitigated by in-app notification banner.

---

### ADR-004: AWS Bedrock (Claude) over Direct OpenAI API

**Status:** Accepted

**Context:** LLM calls involve clinical context. Data residency and compliance are concerns.

**Decision:** AWS Bedrock with Claude 3.5 Sonnet as primary; OpenAI GPT-4o as fallback.

**Rationale:**
- Bedrock runs within the client's AWS VPC — no data leaves the account boundary.
- AWS BAA covers Bedrock for HIPAA workloads.
- Claude 3.5 Sonnet benchmarks well on structured JSON output tasks (talking points generation).

**Trade-offs:** Higher latency than direct OpenAI API (~+300ms P95). Acceptable for async enrichment pipeline.

---

### ADR-005: PostgreSQL as Primary Store over DynamoDB/Firestore

**Status:** Accepted

**Context:** Data model includes relational HCP → visit → MR hierarchies and aggregate scoring queries.

**Decision:** PostgreSQL 16.

**Rationale:**
- Relational model fits the HCP/visit/MR schema naturally.
- Gap detection queries (`SELECT MAX(visit_date) GROUP BY hcp_id`) are efficient with proper indexing.
- Portable across AWS (RDS), Azure (Flexible Server), and GCP (Cloud SQL).

**Trade-offs:** Requires managing connection pooling at scale (PgBouncer added to production config).
