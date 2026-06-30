# openNBA — Next Best Action Accelerator for Pharma MRs

> A modular, agentic, open-architecture NBA platform that helps Medical Representatives re-engage HCPs at the right time with the right context — deployed on hyperscaler infrastructure at a fraction of the cost of Pega CDH or Salesforce Marketing Cloud.

[![CI](https://github.com/mnizam290990/open-nba/actions/workflows/ci.yml/badge.svg)](https://github.com/mnizam290990/open-nba/actions/workflows/ci.yml)

---

## Why openNBA?

| Pain Point | openNBA Solution |
|---|---|
| MRs can't see 60+ day HCP visit gaps | Agent-driven gap detection with urgency scoring |
| No contextual talking points before a visit | LLM-generated interaction summaries + personalized content |
| Pega/SFMC licenses cost $200K–$2M+/yr | Infra-only cost on your own cloud account |
| Demo takes 6–18 months with incumbents | **4–6 weeks from repo clone to live demo** |
| Static rule engines don't learn | Continuous-learning feedback loop per MR |

---

## Live Demo

> Deployment link will be added here once the Vercel project is connected.

---

## Documentation Index

| Document | Purpose | Audience |
|---|---|---|
| [PRD](docs/PRD.md) | Full product requirements document | Product, Leadership |
| [Requirements](docs/requirements.md) | Functional & non-functional requirements (traceable) | Engineering, QA |
| [Architecture](docs/ARCHITECTURE.md) | Technical design, ADRs, service map | Engineering, DevOps |
| [User Stories](docs/user-stories.md) | Sprint-ready backlog stories | Engineering, Scrum |
| [CI/CD](docs/CI_CD.md) | CI pipeline stages, triggers, and failure behaviour | Engineering, DevOps |

---

## Quick Start (Pilot — Mock Mode)

### Prerequisites

Ensure you have the following tools installed:

| Tool | Version | Install |
|---|---|---|
| Node.js | 20.x LTS | [nodejs.org](https://nodejs.org) |
| pnpm | 9.x | `npm i -g pnpm` |
| Python | 3.12 | [python.org](https://python.org) |
| Docker + Compose | Latest | [docker.com](https://docker.com) |
| uv | Latest | `pip install uv` |

### 1. Clone the repository

```bash
git clone https://github.com/mnizam290990/open-nba.git
cd open-nba
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Open .env and set DATA_MODE=MOCK (no other changes needed for local dev)
```

### 3. Install dependencies

```bash
pnpm install
```

### 4. Start all services (Docker Compose)

```bash
docker compose up --build
```

Or start only the Next.js web app for frontend development:

```bash
pnpm dev
```

### 5. Open the app

| Service | URL |
|---|---|
| MR Web App | http://localhost:3000 |
| Agent Service API | http://localhost:8001/docs |
| Admin Console | http://localhost:3001 |

The platform boots in **MOCK mode** by default — 500 synthetic HCPs, 18 months of visit history, pre-seeded 60-day gaps. No client data required.

---

## Repository Structure

```
open-nba/
├── apps/
│   └── web/                   # Next.js 14 MR frontend (PWA) + BFF API routes
├── services/
│   └── agent/                 # Python FastAPI + LangGraph agent service
├── packages/
│   └── db/                    # Shared DB schema, migrations (Drizzle ORM), seed scripts
├── docs/                      # Requirements, ADRs, runbooks, API specs
├── infra/                     # Docker Compose (local), Helm charts (Phase 1+)
├── .github/
│   └── workflows/             # GitHub Actions CI/CD pipelines
├── .env.example               # Environment variable template
├── .gitignore
├── CODEOWNERS
├── package.json               # pnpm workspace root
├── turbo.json                 # Turborepo task orchestration
└── README.md
```

---

## Tech Stack

```
┌────────────────────────────────────────────────────────────────────┐
│                          Client Devices                             │
│              MR Mobile (PWA)          RSM Web Dashboard             │
└───────────────────┬────────────────────────┬───────────────────────┘
                    │ HTTPS                  │ HTTPS
┌───────────────────▼────────────────────────▼───────────────────────┐
│            Next.js 14 (App Router) — Vercel Edge Network            │
│         BFF API routes  |  Auth.js  |  Server Components            │
└───────────────────────────────┬────────────────────────────────────┘
                                │ HTTP (internal)
┌───────────────────────────────▼────────────────────────────────────┐
│             Python FastAPI + LangGraph Agent Service                 │
│   Signal Harvester → Gap Detection → Scoring → Context Synthesis    │
│              → Offer Recommendation → Rank & Publish                 │
└────┬──────────────────────────────────────────────────┬────────────┘
     │                                                  │
┌────▼────────────────┐                     ┌───────────▼────────────┐
│  PostgreSQL 16       │                     │  AWS Bedrock / OpenAI  │
│  (Supabase / Neon)   │                     │  Claude 3.5 Sonnet     │
│  + Weaviate (vector) │                     │  [de-identified input] │
└─────────────────────┘                     └────────────────────────┘
```

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, PWA |
| BFF / API Routes | Next.js App Router API routes, Zod validation |
| Agent Orchestration | Python 3.12, FastAPI, LangGraph |
| LLM | AWS Bedrock (Claude 3.5 Sonnet) — PHI stays in VPC |
| Database ORM | Drizzle ORM, PostgreSQL 16 |
| Vector Store | Weaviate Cloud |
| Auth | Auth.js v5 (NextAuth) + OIDC (Keycloak, Phase 1) |
| CI/CD | GitHub Actions, Vercel (frontend), Render (agent service) |
| Observability | LangSmith, OpenTelemetry, Grafana (Phase 1) |

---

## Phase Roadmap

```
Phase 0 (Weeks 1–6)   → Mock demo, funding pitch
Phase 1 (Weeks 7–16)  → Live CRM integration, 1 territory pilot
Phase 2 (Month 3–6)   → Full offer engine, RSM dashboard, 2nd vertical
Phase 3 (Month 6–12)  → Multi-client, self-serve vertical config, ML loop
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup instructions, coding standards, and the PR checklist.

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

*Initial specification: June 2026. Target client: Sun Pharma. Authored by Nagarro.*
