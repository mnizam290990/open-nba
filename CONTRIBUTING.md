# Contributing to openNBA

## Prerequisites

Verify all required tools are installed:

```bash
make onboarding-check
# or manually:
node --version    # ≥ 20.0.0
pnpm --version    # ≥ 9.0.0
python --version  # ≥ 3.12
docker --version  # latest
uv --version      # latest
```

## Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/nagarro/opennba.git
cd opennba

# 2. Install Node.js dependencies
pnpm install

# 3. Install Python dependencies
cd services/agent && uv sync && cd ../..

# 4. Copy environment config
cp .env.example .env
# Review .env — defaults work for MOCK mode

# 5. Start local services (PostgreSQL + Weaviate)
docker compose -f infra/local/docker-compose.yml up db weaviate -d

# 6. Run database migrations
pnpm db:migrate

# 7. Seed mock data
pnpm db:seed

# 8. Start the development servers
pnpm dev
```

Open http://localhost:3000 — log in with `mr@demo.opennba.com / demo1234`.

---

## Code Style

- **TypeScript**: ESLint (`next/core-web-vitals`, `next/typescript`) + Prettier
- **Python**: Ruff (linting + formatting) + mypy
- Run `pnpm lint` before committing
- Run `pnpm format` to auto-fix formatting

---

## Branch Naming Convention

```
feat/<ticket-id>-short-description
fix/<ticket-id>-short-description
chore/<ticket-id>-short-description
```

Example: `feat/NBA-42-hcp-card-component`

---

## PR Checklist

Before opening a PR, verify:

- [ ] `pnpm lint` passes
- [ ] `pnpm type-check` passes
- [ ] `pnpm test` passes
- [ ] `pnpm format:check` passes
- [ ] `data-testid` added to all new interactive UI elements
- [ ] No secrets or `.env` values committed
- [ ] `docs/` updated if behaviour changed
- [ ] New API endpoints protected with `withAuth()` middleware

---

## Running Tests

```bash
# All unit tests
pnpm test

# Frontend unit tests with coverage
pnpm --filter=web test:coverage

# Python tests with coverage
cd services/agent && uv run pytest --cov --cov-fail-under=80

# Playwright E2E (requires running app)
pnpm --filter=web test:e2e
```

---

## Commit Message Format

```
<type>(<scope>): <short description>

[optional body]
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`

Examples:
- `feat(feed): add urgency badge to HCP card`
- `fix(auth): redirect to callbackUrl after login`
- `docs(scoring): document re-weighting algorithm`
