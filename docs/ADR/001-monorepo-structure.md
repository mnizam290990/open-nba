# ADR-001 — Monorepo Structure: pnpm Workspaces + Turborepo

**Date:** 2026-06-30
**Status:** Accepted
**Authors:** Nagarro Platform Team

---

## Context

openNBA has three distinct runtimes — a Next.js frontend (Node.js), a Python FastAPI agent service, and a shared database package — that must be developed, tested, and deployed independently while sharing types, configs, and scripts where possible.

We needed a strategy for:
- Coordinating cross-package dependency installs
- Running `lint`, `build`, `test` across all packages without repetition
- Caching build artefacts so PRs don't re-run unchanged packages
- Keeping the developer setup to a single clone and one install command

## Decision

Use **pnpm workspaces** for package management and **Turborepo** for task orchestration.

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **Nx** | Rich plugin ecosystem, code generation | Steep learning curve, opinionated config |
| **Lerna + npm workspaces** | Battle-tested | Slow, less caching, mostly superseded by Turborepo |
| **Separate repos** | Full isolation | No shared packages, complex CI, harder local dev |
| **pnpm + Turborepo** ✓ | Fast installs, task caching, simple config | Turborepo remote cache requires account (free tier available) |

## Consequences

- **Positive:** Single `pnpm install` sets up all packages; `pnpm dev` starts all services with hot-reload.
- **Positive:** Turborepo caches build outputs — PRs only rebuild what changed.
- **Negative:** Python services don't participate in the pnpm workspace (they use `uv`); they are invoked via Makefile/shell targets instead.
- **Negative:** Turborepo remote caching is optional for Phase 0 but will speed up CI in Phase 1.
