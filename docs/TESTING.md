# Testing Strategy — openNBA

## Overview

openNBA uses a three-layer testing pyramid:

```
E2E (Playwright)        ←  9 specs (8 active + 1 partial for Phase 14), run on merge to main
Integration Tests       ←  ≥ 60% coverage on agent service
Unit Tests              ←  ≥ 80% coverage (frontend + agent service)
```

---

## Frontend Unit Tests (Vitest + React Testing Library)

**Runner:** Vitest 2.x
**Framework:** React Testing Library
**Config:** `apps/web/vitest.config.ts`

### Running Tests

```bash
# Run all unit tests
pnpm --filter=web test

# Run with coverage (fails if < 80%)
pnpm --filter=web test:coverage

# Watch mode
pnpm --filter=web test:watch
```

### Coverage Target

≥ 80% line coverage across components and API route handlers.

### Test Files

| File | What it tests |
|---|---|
| `tests/unit/HCPCard.test.tsx` | Urgency badge rendering, all four action buttons, accessibility |
| `tests/unit/HCPDetailPanel.test.tsx` | Summary/talking points, empty states, partially_enriched badge |

---

## Python Agent Unit Tests (pytest)

**Runner:** pytest 8.x with `pytest-asyncio`
**Coverage:** `pytest-cov --cov-fail-under=80`
**Config:** `services/agent/pyproject.toml`

### Running Tests

```bash
cd services/agent
uv run pytest
uv run pytest --cov --cov-fail-under=80
```

### Test Files

| File | What it tests |
|---|---|
| `tests/test_gap_detection.py` | Exactly on threshold, one day over, inactive HCP, no history |
| `tests/test_scoring_engine.py` | All-high inputs, all-low inputs, zero-history, sort order |
| `tests/test_signal_harvester.py` | Valid payload, dead-letter, duplicates, acceptance rate |
| `tests/test_offer_recommendation.py` | Match, no match, OPA unavailable, tier restriction |
| `tests/test_data_provider_factory.py` | Correct provider per DATA_MODE |

---

## Playwright E2E Smoke Tests

**Runner:** Playwright 1.x
**Config:** `apps/web/playwright.config.ts`
**Run against:** Vercel preview URL (CI) or `http://localhost:3000` (local)

### Locator Strategy (SAF Standards)

Per the project automation standards:
- **Always** use `data-testid` attributes: `page.getByTestId('element-id')`
- Fallback: `getByRole`, `getByText`, `getByLabel`
- **Never** use CSS selectors or XPath
- **No** hardcoded waits (`page.waitForTimeout`)
- Web-first assertions only (`expect(locator).toBeVisible()`)

### Running E2E Tests

```bash
# Run all E2E tests (requires running Next.js server)
pnpm --filter=web test:e2e

# Run against a specific URL
BASE_URL=https://opennba.vercel.app pnpm --filter=web test:e2e
```

### Test Cases

| Test ID | Description |
|---|---|
| E2E-001 | MR Login — login with valid credentials, see NBA feed | Active |
| E2E-002 | Card Actions — Dismiss removes card from feed | Active |
| E2E-003 | Snooze — Snooze removes card from immediate view | Active |
| E2E-004 | Detail Panel — tap card → panel opens, three talking points visible | Active |
| E2E-005 | RSM View — RSM sees compliance rate dashboard | Active |
| E2E-006 | Admin Toggle — Admin sees DATA_MODE toggle and checklist | Active |
| E2E-007 | RBAC Guard — MR navigating to /admin redirected with Access Denied | Active |
| E2E-008 | Offline Banner — network disconnect shows offline banner | Active |
| E2E-009 | Post-Event Card — event badge and outreach draft visible (Phase 14) | Partial (skipped tests pending Phase 14) |

### Adding a New E2E Test

1. Create `apps/web/tests/e2e/E2E-NNN-description.spec.ts`
2. Use `test.describe()` with a clear business-intent title
3. Use `test.beforeEach()` to navigate and authenticate
4. All selectors must use `data-testid` attributes
5. Add the new test ID to this document

---

## Coverage Reporting

CI publishes HTML coverage reports as artifacts:
- Frontend: `apps/web/coverage/` → GitHub Actions artifact `frontend-coverage`
- Python: `services/agent/htmlcov/` → GitHub Actions artifact `python-coverage`
- Playwright: `apps/web/playwright-report/` → GitHub Actions artifact `playwright-report`

### Coverage Gates (CI fails if below)

| Layer | Gate |
|---|---|
| Frontend unit | ≥ 80% line coverage |
| Python agent unit | ≥ 80% line coverage |
| Integration (Phase 1) | ≥ 60% coverage |
