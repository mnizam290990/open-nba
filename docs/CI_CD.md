# openNBA — CI/CD Pipeline

**Version:** 0.1  
**Status:** Active  
**Date:** June 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Pipeline Stages](#2-pipeline-stages)
3. [Triggers](#3-triggers)
4. [Environment Variables in CI](#4-environment-variables-in-ci)
5. [Branch Strategy](#5-branch-strategy)
6. [Adding a New CI Step](#6-adding-a-new-ci-step)
7. [Failure Behaviour](#7-failure-behaviour)
8. [Vercel Preview Deployments](#8-vercel-preview-deployments)

---

## 1. Overview

openNBA uses **GitHub Actions** for CI and **Vercel** for continuous deployment of the Next.js frontend.

```
PR pushed
  │
  ▼
[Stage 1] Lint & Type-Check & Security Headers (parallel)
  │  +─── Python ruff/mypy/pytest (parallel)
  │  +─── Docker build + Trivy scan (parallel)
  │  +─── DB migration dry-run (parallel)
  │ all pass
  ▼
[Stage 2] Frontend Unit Tests (Vitest ≥ 80% coverage)
  │
  ▼
[Stage 3] Python Agent Tests (pytest ≥ 80% coverage)
  │
  ▼
[Stage 4] Docker Build & Trivy CVE Scan (≤ 500 MB, no CRITICAL/HIGH)
  │
  ├── on PR → Vercel creates a preview deployment
  │            + Playwright E2E smoke suite runs against preview URL
  └── on merge to main → Vercel promotes to production
```

### Additional Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| `branch-name.yml` | PR opened/updated | Enforce `<type>/<ticket>-description` naming |
| `secret-scan.yml` | Push + PR | TruffleHog verified-secret scanning |

---

## 2. Pipeline Stages

### Stage 1: Lint & Type-Check (job: `lint`)

- **Tools:** ESLint, Prettier, `tsc --noEmit`, custom `headers-check.mjs`
- **Commands:** `pnpm lint`, `pnpm type-check`, `pnpm format:check`, `pnpm headers:check`
- **Failure:** Any ESLint error, TS error, formatting mismatch, or missing security header blocks all downstream stages
- **Config files:** `apps/web/eslint.config.mjs`, `.prettierrc`, `apps/web/scripts/headers-check.mjs`

### Stage 2: Frontend Unit Tests (job: `test-frontend`)

- **Tool:** Vitest 2.x + React Testing Library
- **Command:** `pnpm --filter=@open-nba/web test:coverage`
- **Coverage gate:** ≥ 80% lines & branches (vitest `thresholds` in `vitest.config.ts`)
- **Artifacts:** `frontend-coverage` (HTML report, 14 days)
- **Failure:** Test failure or coverage below gate blocks E2E stage

### Stage 3: Python Agent Tests (job: `test-agent`)

- **Tools:** ruff (lint + format), mypy, pytest-cov
- **Commands:** `uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy .`, `uv run pytest --cov-fail-under=80`
- **Artifacts:** `python-coverage` (HTML report, 14 days)
- **Failure:** Lint error, type error, test failure, or < 80% coverage blocks E2E stage

### Stage 4: DB Migration Dry-Run (job: `db-migrate-check`)

- **Command:** `pnpm db:migrate:check`
- **Env:** Requires `CI_DATABASE_URL` secret
- **Failure:** Pending or conflicting migrations block merge

### Stage 5: Docker Build & Trivy Scan (job: `docker-security`)

- **Build:** `docker build services/agent/Dockerfile` → image `opennba-agent:ci`
- **Size gate:** Image must be ≤ 500 MB
- **Scanner:** Trivy — fails on any `CRITICAL` or `HIGH` CVE in `os` or `library` packages
- **Artifacts:** `trivy-results` (SARIF, 14 days)
- **Failure:** Build failure, image > 500 MB, or unfixed CVE blocks merge

### Stage 6: Playwright E2E (job: `e2e`, main branch only)

- **Tool:** Playwright 1.x (Chromium)
- **Requires:** `VERCEL_PREVIEW_URL` secret (set automatically by Vercel GitHub App)
- **Tests:** E2E-001 through E2E-009 (9 specs, ~25 test cases)
- **Artifacts:** `playwright-report` (HTML, 30 days)
- **Failure:** Any non-skipped Playwright assertion failure blocks merge

---

## 3. Triggers

| Event | Branches | Stages Run |
|---|---|---|
| `push` | All branches | Stages 1–4 |
| `pull_request` targeting `main` | Any head branch | Stages 1–4 |

| Event | Branches | Jobs Run |
|---|---|---|
| `push` | All branches | Stages 1–5 |
| `pull_request` targeting `main` | Any head branch | Stages 1–5 + branch-name check + secret scan |
| `push` to `main` | `main` only | Stages 1–6 (E2E included) |

**Concurrency:** Only one CI run per branch at a time. A new push cancels in-progress runs on the same branch (`cancel-in-progress: true`).

---

## 4. Environment Variables in CI

All secrets are stored in **GitHub Actions Secrets** (`Settings → Secrets and variables → Actions`).

| Secret | Used by stage | Purpose |
|---|---|---|
| `TURBO_TEAM` | All | Turborepo remote cache team ID |
| `TURBO_TOKEN` | All | Turborepo remote cache auth token |

**Rule:** No secret value must ever appear in a `run:` command or be logged. Use `${{ secrets.NAME }}` syntax only.

CI runs with these environment variables baked in (not secrets):

```yaml
DATA_MODE: MOCK        # Forces MOCK data provider in CI
NODE_ENV: test         # For unit tests
NODE_ENV: production   # For build stage
```

---

## 5. Branch Strategy

```
main          ← protected; requires PR + 1 reviewer + all CI checks
  └── feat/<ticket-id>-short-description   ← feature branches
  └── fix/<ticket-id>-short-description    ← bug fix branches
  └── chore/<description>                  ← tooling/dependency updates
  └── docs/<description>                   ← documentation-only changes
```

**Branch protection rules on `main`:**
- Direct pushes blocked
- Require at least 1 peer review approval
- Require all CI status checks to pass
- Require branches to be up-to-date before merge

---

## 6. Adding a New CI Step

1. Open `.github/workflows/ci.yml`
2. Add a new job under `jobs:` with a descriptive name
3. Set `needs: <previous-job>` to position it in the pipeline
4. Use `ubuntu-latest` as the runner unless you need a specific OS
5. Always use `actions/checkout@v4`, `pnpm/action-setup@v4`, and `actions/setup-node@v4` with version pinning
6. Cache `pnpm` via `cache: "pnpm"` on the `setup-node` step
7. Install deps with `pnpm install --frozen-lockfile`
8. Test your step locally using [`act`](https://github.com/nektos/act) before pushing

**Example new job:**

```yaml
my-new-check:
  name: My New Check
  runs-on: ubuntu-latest
  needs: lint
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with:
        version: ${{ env.PNPM_VERSION }}
    - uses: actions/setup-node@v4
      with:
        node-version-file: ${{ env.NODE_VERSION_FILE }}
        cache: "pnpm"
    - run: pnpm install --frozen-lockfile
    - run: pnpm my-script
```

---

## 7. Failure Behaviour

| Failure type | What happens |
|---|---|
| Lint error | Pipeline stops at Stage 1; PR cannot be merged |
| Prettier formatting | Pipeline stops at Stage 1; run `pnpm format` locally |
| TypeScript error | Pipeline stops at Stage 2; fix the type error |
| Test failure | Pipeline stops at Stage 3; fix the failing test |
| Coverage below 80% | Pipeline stops at Stage 3; add tests to reach the threshold |
| Build failure | Pipeline stops at Stage 4; Vercel does not deploy |

**Re-triggering CI:** Push a new commit or close+reopen the PR. You can also re-run failed jobs from the GitHub Actions UI without pushing a commit.

---

## 8. Vercel Preview Deployments

- Vercel is connected to the GitHub repository and watches all branches.
- Every push to any branch automatically creates a **preview deployment**.
- The preview URL is posted as a comment on the PR by Vercel's GitHub App.
- Merging to `main` triggers a **production deployment** automatically.
- To roll back production: use the Vercel dashboard → Deployments → select the target → Promote to Production.

See the [RUNBOOK.md](RUNBOOK.md) for step-by-step rollback instructions.
