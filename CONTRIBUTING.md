# Contributing to openNBA

Thank you for contributing. This guide covers local setup, coding standards, and the PR process.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20.x LTS | [nodejs.org](https://nodejs.org) |
| pnpm | 9.x | `npm i -g pnpm` |
| Python | 3.12 | [python.org](https://python.org) |
| Docker + Compose | Latest | [docker.com](https://docker.com) |
| uv | Latest | `pip install uv` |

Verify all tools are installed:

```bash
node --version   # v20.x
pnpm --version   # 9.x
python --version # 3.12.x
docker --version # 24.x+
uv --version
```

---

## Local Setup

```bash
# 1. Clone
git clone https://github.com/mnizam290990/open-nba.git
cd open-nba

# 2. Install Node dependencies
pnpm install

# 3. Copy environment config
cp .env.example .env
# DATA_MODE=MOCK is the default — no further config needed for local dev

# 4. Start the Next.js web app
pnpm dev
# → http://localhost:3000

# 5. (Optional) Start all services with Docker Compose
docker compose up --build
```

---

## Code Style

- **TypeScript:** Strict mode. No `any`. Fix all type errors before pushing.
- **ESLint:** `pnpm lint` must pass. Fix with `pnpm lint:fix`.
- **Prettier:** `pnpm format:check` must pass. Fix with `pnpm format`.
- **Imports:** Use absolute imports via the `@/*` alias (maps to `apps/web/src/`).
- **Comments:** Only explain non-obvious intent. No narration comments.
- **Locators in tests:** Always use `data-testid`. Never use CSS selectors or XPath.

---

## Branch Naming

```
feat/<ticket-id>-short-description    # New feature
fix/<ticket-id>-short-description     # Bug fix
chore/<description>                   # Tooling / dependencies
docs/<description>                    # Documentation only
```

---

## PR Checklist

Before opening a PR, run:

```bash
pnpm lint          # ESLint must pass
pnpm format:check  # Prettier must pass
pnpm type-check    # TypeScript must pass
pnpm test          # All tests must pass
```

Then fill out the PR template (`.github/PULL_REQUEST_TEMPLATE.md`).

---

## Running Tests

```bash
# Unit tests (watch mode)
pnpm --filter @open-nba/web test:watch

# Unit tests with coverage
pnpm test:coverage

# All tests across all packages
pnpm test
```

Coverage targets: **≥ 80% lines, functions, branches, statements** for TypeScript packages.

---

## Questions?

Open a GitHub Discussion or reach out to the Nagarro engineering team.
