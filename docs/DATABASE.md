# Database — openNBA

## Setup

### Supabase (Recommended for Phase 0)

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project (select the region closest to your users)
3. Go to **Settings → Database → Connection String**
4. Copy the **URI** connection string (use pooler for app connections)
5. Add to `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:[password]@[project-ref].supabase.co:6543/postgres?pgbouncer=true
   DIRECT_URL=postgresql://postgres:[password]@[project-ref].supabase.co:5432/postgres
   ```
   > Use `DATABASE_URL` (pooler) for the app; `DIRECT_URL` (direct) for migrations.

### Neon (Alternative)

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string from the dashboard
4. Add to `.env` (Neon supports connection pooling natively):
   ```env
   DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
   DIRECT_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
   ```

---

## Running Migrations

```bash
# Run all pending migrations
pnpm db:migrate

# Check for schema drift (CI dry-run, no changes applied)
pnpm db:migrate:check

# Generate migration files from schema changes
pnpm --filter=@opennba/db generate

# Open Drizzle Studio (visual DB browser)
pnpm --filter=@opennba/db studio
```

---

## Schema ER Diagram

```
users (id) ──────────────────────────────┐
    │                                     │
    ├── sessions (session_token → userId) │
    ├── accounts (provider → userId)      │
    │                                     │
    ├── mr_profiles (mrId → users.id)     │
    │       └── rsmId → users.id          │
    │                                     │
    ├── visit_logs (mrId → users.id)      │
    │       └── hcpId → hcp_profiles.id   │
    │                                     │
    ├── nba_action_log (mrId → users.id)  │
    │       └── hcpId → hcp_profiles.id   │
    │                                     │
    ├── nba_cards (mrId → users.id)       │
    │       ├── hcpId → hcp_profiles.id   │
    │       └── offerId → offer_catalog   │
    │                                     │
    └── pipeline_runs (mrId → users.id)   │

hcp_profiles (hcpId) ────────────────────┘

offer_catalog (offerId)

audit_log (append-only, no FK constraints)
```

---

## Backup & Restore (Supabase)

### Enable Automated Backups

- Supabase free tier: daily backups for 7 days (Pro: 30 days)
- Phase 1: use Neon branching or AWS RDS automated snapshots (30-day retention)

### Manual Backup

```bash
pg_dump "postgresql://..." > backup_$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
psql "postgresql://..." < backup_20260630.sql
```

---

## Connecting Locally

```bash
# Connect with psql
psql $DATABASE_URL

# Or use the local Docker Compose instance
psql postgresql://opennba:opennba_local@localhost:5432/opennba
```

---

## Free-Tier Limits (Supabase)

| Resource | Limit | Mitigation |
|---|---|---|
| Database size | 500 MB | Seed 500 HCPs × minimal data ≈ 50 MB |
| Concurrent connections | 20 (via pooler: 200) | Always use pooler URL in app |
| API requests | Unlimited | N/A |
