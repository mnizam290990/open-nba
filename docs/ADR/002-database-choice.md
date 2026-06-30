# ADR-002 — Database: PostgreSQL on Supabase / Neon for Phase 0

**Date:** 2026-06-30
**Status:** Accepted
**Authors:** Nagarro Platform Team

---

## Context

Phase 0 requires a PostgreSQL instance with:
- Free tier suitable for demo (no upfront cost)
- Row-Level Security (RLS) support for multi-tenancy stub
- Managed connection pooling
- Easy migration to a self-hosted or cloud-managed PostgreSQL in Phase 1

## Decision

Use **Supabase** (first choice) or **Neon** (fallback) hosted PostgreSQL on the free tier.

Both providers support:
- PostgreSQL 16
- RLS policies
- Direct and pooled connection strings
- Connection string format compatible with Drizzle ORM

## Alternatives Considered

| Option | Free Tier | RLS | Notes |
|---|---|---|---|
| **Supabase** ✓ | 500 MB, 2 projects | Native | Also provides auth, storage — useful later |
| **Neon** ✓ | 0.5 GB, branching | Via extension | Serverless-native, branching for dev/preview |
| **PlanetScale** | 5 GB | No native | MySQL under the hood — breaks RLS requirement |
| **Railway** | 1 GB | Configurable | Good DX, slightly more expensive beyond free |
| **Docker local only** | Unlimited | Yes | No managed backups; fine for dev, not demo |

## Consequences

- **Positive:** Zero cost for Phase 0 demo; Supabase dashboard simplifies schema inspection.
- **Positive:** `tenant_id` column on every table now means Phase 1 multi-tenancy is a config change, not a migration.
- **Negative:** Free-tier connection limits (Supabase: 20 concurrent). Mitigation: use the pooler URL (`?pgbouncer=true`) for application connections.
- **Migration path:** In Phase 1, swap `DATABASE_URL` to point at RDS/CloudSQL; no code changes required.
