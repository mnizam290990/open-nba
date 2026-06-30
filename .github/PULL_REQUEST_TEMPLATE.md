## Summary

<!-- Describe what this PR does and why. Link the relevant issue or task. -->

Fixes #

---

## Type of Change

- [ ] New feature
- [ ] Bug fix
- [ ] Refactor / improvement
- [ ] Documentation
- [ ] CI/CD / Infrastructure
- [ ] Database migration

---

## Pre-Merge Checklist

### Code Quality
- [ ] `pnpm lint` passes with no new errors
- [ ] `pnpm type-check` passes
- [ ] `pnpm format:check` passes

### Tests
- [ ] Unit tests added or updated for new/changed logic
- [ ] `pnpm test` passes locally
- [ ] Integration tests updated if API contracts changed
- [ ] Playwright E2E test added if a new user-facing flow was added

### UI / Frontend (if applicable)
- [ ] `data-testid` attributes added to every new interactive element and badge
- [ ] Responsive layout verified at 375 px, 768 px, and 1280 px
- [ ] Accessible `aria-label` added to icon-only buttons and cards

### Security
- [ ] No secrets, credentials, or environment values committed
- [ ] New API endpoints protected with `withAuth()` middleware
- [ ] All user inputs validated with Zod schemas
- [ ] No raw stack traces returned to the client

### Documentation
- [ ] Relevant `docs/` file updated if behaviour changed
- [ ] OpenAPI spec (`docs/api/openapi.yml`) updated if API changed
- [ ] ADR created if an architectural decision was made

### Database (if applicable)
- [ ] Migration file added for schema changes
- [ ] `tenant_id` included in any new table
- [ ] RLS stub added for any new table
- [ ] `pnpm db:migrate --check` passes

---

## Screenshots / Demo (UI changes)

<!-- Paste screenshots or a short Loom/GIF showing the change -->
