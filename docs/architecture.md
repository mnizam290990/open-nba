# openNBA — Architecture & Monorepo Guide

**Version:** 0.1  
**Status:** Draft  
**Date:** June 2026  
**Linked PRD:** [PRD.md](PRD.md)

---

## Table of Contents

1. [Monorepo Structure](#1-monorepo-structure)
2. [Script Conventions](#2-script-conventions)
3. [Package Dependencies](#3-package-dependencies)
4. [System Architecture](#4-system-architecture)
5. [Service Responsibilities](#5-service-responsibilities)
6. [Data Flow](#6-data-flow)
7. [Environment Configuration](#7-environment-configuration)

---

## 1. Monorepo Structure

openNBA uses a **pnpm workspace monorepo** orchestrated by **Turborepo** for efficient cross-package task caching and parallel execution.

```
open-nba/                          # Monorepo root
│
├── apps/                          # Deployable applications
│   └── web/                       # Next.js 14 MR frontend + BFF API routes (Vercel)
│
├── services/                      # Backend microservices
│   └── agent/                     # Python FastAPI + LangGraph agent service (Render)
│
├── packages/                      # Shared internal packages
│   └── db/                        # Drizzle ORM schema, migrations, seed scripts
│
├── docs/                          # Project documentation
│   ├── PRD.md                     # Product requirements document
│   ├── requirements.md            # Functional & non-functional requirements
│   ├── ARCHITECTURE.md            # This file
│   ├── CI_CD.md                   # CI/CD pipeline documentation
│   ├── SECURITY.md                # Auth flow, RBAC, audit log, secret rotation
│   ├── DATABASE.md                # Schema ER, migration commands, backup/restore
│   ├── TESTING.md                 # Testing strategy, Playwright E2E guide
│   ├── AGENT_PIPELINE.md          # LangGraph pipeline, retry policy, partial enrichment
│   ├── SCORING.md                 # Priority score formula, weight coefficients
│   ├── MOCK_DATA.md               # Seed parameters, how to regenerate
│   ├── RUNBOOK.md                 # Restart, rollback, alert escalation
│   ├── api/
│   │   └── openapi.yml            # OpenAPI 3.1 spec for all BFF routes
│   └── ADR/                       # Architecture Decision Records
│       ├── 001-monorepo-structure.md
│       ├── 002-database-choice.md
│       ├── 003-agent-framework.md
│       ├── 004-auth-library.md
│       └── 005-data-mode-toggle.md
│
├── infra/                         # Infrastructure as code
│   └── local/                     # Docker Compose for local development
│
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI pipeline
│
├── .env.example                   # Environment variable template
├── .gitignore
├── .prettierrc
├── CODEOWNERS
├── package.json                   # pnpm workspace root + unified scripts
├── pnpm-lock.yaml                 # Lockfile (committed)
├── pnpm-workspace.yaml            # Workspace package globs
└── turbo.json                     # Turborepo task pipeline
```

---

## 2. Script Conventions

All scripts are defined at the **workspace root** in `package.json` and delegated to individual packages via Turborepo. Run all scripts from the repo root.

| Script | What it does |
|---|---|
| `pnpm dev` | Start all apps in development mode (parallel, with hot-reload) |
| `pnpm build` | Build all packages and apps for production |
| `pnpm lint` | Run ESLint across all packages |
| `pnpm lint:fix` | Run ESLint with auto-fix across all packages |
| `pnpm type-check` | Run `tsc --noEmit` across all TypeScript packages |
| `pnpm test` | Run all unit + integration tests |
| `pnpm test:coverage` | Run tests with coverage reporting |
| `pnpm format` | Format all files with Prettier |
| `pnpm format:check` | Check formatting (used in CI) |
| `pnpm db:migrate` | Run pending database migrations |
| `pnpm db:seed` | Seed the database with mock data |
| `pnpm db:reset` | Drop all data and re-seed |
| `pnpm clean` | Delete all build artifacts and `node_modules` |

### Filtering by package

```bash
# Run dev for just the web app
pnpm --filter @open-nba/web dev

# Run tests for just the db package
pnpm --filter @open-nba/db test
```

### Turborepo caching

Turborepo caches task outputs locally (`.turbo/`) and remotely (Vercel Remote Cache). Tasks are re-run only when their inputs change. CI hits the remote cache, dramatically speeding up PR builds.

---

## 3. Package Dependencies

```
apps/web
    └── packages/db       (schema types, query helpers)

services/agent
    └── (Python — managed separately via uv / pyproject.toml)

packages/db
    └── (standalone — no workspace deps)
```

Rule: **packages cannot depend on apps**. Apps and services can depend on packages.

---

## 4. System Architecture

See the high-level diagram in the root [README.md](../README.md#tech-stack).

Detailed service-to-service communication:

```
Browser / Mobile PWA
        │ HTTPS
        ▼
  apps/web (Next.js)
    ├── App Router pages (RSC + Client components)
    ├── API Routes /api/v1/* (BFF)
    │       │ REST (server-to-server, internal)
    │       ▼
    │  services/agent (FastAPI)
    │       ├── POST /agent/run/{mr_id}   — trigger pipeline
    │       ├── GET  /agent/status/{run_id} — poll status
    │       └── GET  /health
    │
    └── Auth.js middleware (JWT, session, RBAC)
```

---

## 5. Service Responsibilities

| Package / Service | Language | Framework | Deployed On | Responsibility |
|---|---|---|---|---|
| `apps/web` | TypeScript | Next.js 14 | Vercel | MR PWA frontend, BFF API routes, Auth.js |
| `services/agent` | Python 3.12 | FastAPI + LangGraph | Render | Agent pipeline, scoring, LLM calls |
| `packages/db` | TypeScript | Drizzle ORM | (library) | Shared schema types, migration runner, seed scripts |

---

## 6. Data Flow

### Happy Path — MR opens the NBA Feed

```
1. MR opens app  →  Next.js RSC fetches /api/v1/hcps (BFF)
2. BFF applies RBAC → queries packages/db (PostgreSQL)
3. If DATA_MODE=MOCK  → returns seed data
   If DATA_MODE=LIVE  → returns live CRM-synced data
4. NBA cards rendered; MR taps a card
5. /api/v1/hcps/[id] returns agent-enriched card
   (summary, talking points, offer, schedule windows)
```

### Agent Pipeline — Daily scheduled run

```
1. Kubernetes CronJob (or Render cron) calls POST /agent/run/{mr_id}
2. services/agent kicks off LangGraph pipeline:
   Signal Harvester → Gap Detection → NBA Scoring
   → Context Synthesis (LLM) → Offer Recommendation
   → Rank & Publish (writes nba_cards to PostgreSQL)
3. On completion, GET /agent/status/{run_id} returns COMPLETED
4. Next page load shows refreshed NBA cards
```

---

## 7. Environment Configuration

All services share the same `.env.example` template at the repo root. Each application reads only the variables it needs:

| Variable prefix | Consumed by |
|---|---|
| `NEXT_PUBLIC_*` | Browser bundle (Next.js) |
| `NEXTAUTH_*` | Auth.js in apps/web |
| `DATABASE_URL` | packages/db, apps/web API routes |
| `AGENT_SERVICE_*` | apps/web (BFF → agent HTTP calls) |
| `AWS_*`, `OPENAI_*` | services/agent |
| `DATA_MODE` | All services — controls MOCK vs LIVE data provider |

See [`.env.example`](../.env.example) for the full variable reference with inline comments.
