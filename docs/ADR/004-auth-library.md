# ADR-004 — Authentication Library: Auth.js v5 with Keycloak Stub

**Date:** 2026-06-30
**Status:** Accepted
**Authors:** Nagarro Platform Team

---

## Context

Phase 0 needs working authentication (email + password for demo users) with a clear upgrade path to the client's enterprise OIDC/SSO provider (Keycloak or Azure AD) in Phase 1. Requirements:
- Session storage in PostgreSQL for server-side revocation
- JWT access + refresh token flow
- Role-based access (MR / RSM / ADMIN) embedded in the session
- Next.js App Router compatibility

## Decision

Use **Auth.js v5** (formerly NextAuth.js) with a **Credentials provider** for Phase 0 and a disabled **OIDC stub** for the Keycloak integration path.

## Alternatives Considered

| Option | Phase 0 Fit | Phase 1 Upgrade Path |
|---|---|---|
| **Auth.js v5** ✓ | Excellent — App Router native | OIDC adapter: swap Credentials → Keycloak provider |
| **Clerk** | Excellent DX | Proprietary, $25+/mo beyond free tier |
| **Supabase Auth** | Good | Ties auth tightly to Supabase — limits DB portability |
| **Custom JWT** | Full control | High maintenance, security risk |
| **Keycloak directly** | Overkill for Phase 0 | Phase 1 target — will be wired in then |

## Consequences

- **Positive:** Auth.js is actively maintained, Next.js 14 App Router native, and has adapters for every major DB including Drizzle.
- **Positive:** The Credentials → OIDC swap is a config change (`providers` array), not a code rewrite.
- **Positive:** Sessions stored in PostgreSQL allow immediate revocation of compromised tokens.
- **Negative:** Auth.js v5 API changed significantly from v4; documentation is still catching up. Reference: https://authjs.dev/
- **Negative:** For demo purposes, bcrypt hashing adds ~100 ms to login time on free-tier CPU. Acceptable for demo.
