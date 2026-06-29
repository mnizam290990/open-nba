# openNBA — Next Best Action Accelerator for Pharma MRs

> A modular, agentic, open-architecture NBA platform that helps Medical Representatives re-engage HCPs at the right time with the right context — deployed on hyperscaler infrastructure at a fraction of the cost of Pega CDH or Salesforce Marketing Cloud.

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

## Documentation Index

| Document | Purpose | Audience |
|---|---|---|
| [PRD](docs/PRD.md) | Full product requirements document | Product, Leadership |
| [Requirements](docs/requirements.md) | Functional & non-functional requirements (traceable) | Engineering, QA |
| [Architecture](docs/architecture.md) | Technical design, ADRs, service map | Engineering, DevOps |
| [User Stories](docs/user-stories.md) | Sprint-ready backlog stories | Engineering, Scrum |

---

## Quick Start (Pilot — Mock Mode)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/open-nba.git
cd open-nba

# 2. Copy environment config
cp .env.example .env
# Set DATA_MODE=MOCK in .env

# 3. Start all services
docker compose up --build

# 4. Open the MR app
open http://localhost:3000
```

The platform boots in **MOCK mode** by default — 500 synthetic HCPs, 18 months of visit history, pre-seeded 60-day gaps. No client data required.

---

## Repository Structure (Target)

```
open-nba/
├── apps/
│   ├── web/                   # React / Next.js MR frontend (PWA)
│   └── admin/                 # RSM dashboard + admin console
├── services/
│   ├── agent-service/         # Python / LangGraph agent orchestration
│   ├── offer-service/         # Pluggable offer & eligibility engine
│   ├── bff/                   # Node.js / Fastify API gateway + BFF
│   └── data-mock/             # Mock data provider + generator scripts
├── infra/
│   ├── terraform/             # IaC modules (AWS primary, AKS/GKE variants)
│   └── helm/                  # Kubernetes Helm charts
├── docs/
│   ├── PRD.md
│   ├── requirements.md
│   ├── architecture.md
│   └── user-stories.md
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Next.js 14, Tailwind CSS, PWA |
| API Gateway / BFF | Node.js, Fastify, GraphQL |
| Agent Orchestration | Python 3.11, LangGraph, LangChain |
| LLM | AWS Bedrock (Claude 3.5 Sonnet) — PHI stays in VPC |
| Offer / Rules Engine | Python, Open Policy Agent (OPA) |
| Database | PostgreSQL 16 (structured), Weaviate (vector) |
| Object Storage | AWS S3 (assets, documents) |
| Infrastructure | Kubernetes (EKS), Terraform, Helm, GitHub Actions |
| Auth | Keycloak (OIDC / OAuth2) |
| Observability | OpenTelemetry, LangSmith, Grafana |

---

## Phase Roadmap

```
Phase 0 (Weeks 1–6)   → Mock demo, funding pitch
Phase 1 (Weeks 7–16)  → Live CRM integration, 1 territory pilot
Phase 2 (Month 3–6)   → Full offer engine, RSM dashboard, 2nd vertical
Phase 3 (Month 6–12)  → Multi-client, self-serve vertical config, ML loop
```

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

*Initial specification generated: June 2026. Target client: Sun Pharma. Authored by Nagarro.*
