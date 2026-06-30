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
[Stage 1] Lint (ESLint + Prettier)
  │ passes
  ▼
[Stage 2] Type Check (tsc --noEmit)
  │ passes
  ▼
[Stage 3] Unit Tests (Vitest, coverage ≥ 80%)
  │ passes
  ▼
[Stage 4] Build (next build, all packages)
  │
  ├── on PR → Vercel creates a preview deployment
  └── on merge to main → Vercel promotes to production
```

---

## 2. Pipeline Stages

### Stage 1: Lint

- **Tool:** ESLint (Next.js + TypeScript ruleset) + Prettier
- **Command:** `pnpm lint && pnpm format:check`
- **Failure:** Any ESLint error or formatting mismatch blocks the pipeline
- **Config files:**
  - `apps/web/eslint.config.mjs`
  - `.prettierrc`
  - `.prettierignore`

### Stage 2: Type Check

- **Tool:** TypeScript compiler (`tsc --noEmit`)
- **Command:** `pnpm type-check`
- **Runs after:** Stage 1 (lint must pass)
- **Failure:** Any TypeScript error blocks the pipeline

### Stage 3: Unit Tests

- **Tool:** Vitest + React Testing Library (frontend)
- **Command:** `pnpm test:coverage`
- **Coverage gates:**
  - Lines: ≥ 80%
  - Functions: ≥ 80%
  - Branches: ≥ 80%
  - Statements: ≥ 80%
- **Artifacts:** Coverage HTML report uploaded as `coverage-report-frontend` (retained 7 days)
- **Failure:** Test failure **or** coverage below threshold blocks the pipeline

### Stage 4: Build

- **Tool:** `next build` (Turborepo)
- **Command:** `pnpm build`
- **Runs after:** Stage 3 (tests must pass)
- **Failure:** Build error blocks merge (and Vercel deployment)

---

## 3. Triggers

| Event | Branches | Stages Run |
|---|---|---|
| `push` | All branches | Stages 1–4 |
| `pull_request` targeting `main` | Any head branch | Stages 1–4 |

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
