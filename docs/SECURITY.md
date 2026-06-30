# Security — openNBA

## Authentication Flow

```
Browser
  │  POST /api/auth/signin  (email + password)
  ▼
Auth.js Credentials Provider
  │  bcrypt.compare(password, hash) — ~100ms
  ▼
JWT issued (access: 8h, refresh: 7d)
  │  Stored as httpOnly cookie
  ▼
Session record written to PostgreSQL sessions table
  │
On every protected API request:
  ▼
Middleware → auth() → session.user.id + role + tenantId extracted
```

### Token Expiry & Silent Refresh

- Access token: 8 hours (`JWT_ACCESS_EXPIRY=28800`)
- Refresh token: 7 days (`JWT_REFRESH_EXPIRY=604800`)
- On any `401` API response: silent refresh attempted via Auth.js
- If refresh fails: redirect to `/login` with `callbackUrl` preserved in `sessionStorage`

---

## RBAC Permission Matrix

| Role | Feed | RSM Dashboard | Admin Console | API /hcps | API /rsm | API /admin |
|---|---|---|---|---|---|---|
| **MR** | ✓ | ✗ | ✗ | Own portfolio only | ✗ | ✗ |
| **RSM** | ✓ | ✓ (own team) | ✗ | Own portfolio | Own team only | ✗ |
| **ADMIN** | ✓ | ✓ | ✓ | Full | Full | Full |

### Row-Level Security (Database)

All queries include `WHERE tenant_id = session.user.tenantId` enforced by:
1. `withAuth()` middleware populating `req.user.tenantId`
2. Drizzle ORM query builders always scoping to `tenantId`
3. PostgreSQL RLS policies (stubs enabled in Phase 0, fully enforced in Phase 1)

---

## Audit Log Schema

```sql
audit_log (
  event_id   UUID PRIMARY KEY,
  event_type audit_event_type NOT NULL,  -- see enum list below
  user_id    UUID,                        -- null for anonymous events
  resource_id TEXT,                       -- hcp_id, offer_id, etc.
  ip_address  TEXT,
  user_agent  TEXT,
  metadata   JSONB,
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

**Captured event types:**
- `HCP_READ` — any HCP data access
- `HCP_ACTION_TAKEN` — Schedule Visit / Log Call / Dismiss / Snooze
- `USER_LOGIN` / `USER_LOGOUT` / `USER_LOGIN_FAILED`
- `TOKEN_REFRESH` / `TOKEN_REVOKED`
- `DATA_MODE_CHANGED` — with before/after values and actor
- `OFFER_CREATED` / `OFFER_UPDATED` / `OFFER_DELETED`

**Append-only policy:** A PostgreSQL trigger blocks `UPDATE` and `DELETE` on `audit_log`. Application code must only `INSERT`.

### PII Policy in Logs

- HCP names, NPI numbers, and patient data **must never** appear in application logs.
- Log `hcp_id` (UUID) as the identifier — never the HCP name.
- LLM calls use de-identified tokens — `[HCP_NAME]`, `[HCP_ID]`, `[NPI]` — before the prompt is sent.

---

## Security Headers

Set in `next.config.ts` for all routes:

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; …` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

CI gate: `pnpm headers:check` verifies all headers are configured on every PR.

---

## Rate Limiting

| Endpoint | Limit | Config Variable |
|---|---|---|
| `POST /api/v1/agent/run` | 5 req/min per user | `RATE_LIMIT_AGENT_RPM` |
| All other API routes | 60 req/min per user | (default) |

---

## Secret Rotation Procedure

1. Generate a new secret (e.g., `openssl rand -base64 32`)
2. Update the value in Vercel/Render environment settings
3. Trigger a new deployment to pick up the new value
4. Verify the app is healthy with the new secret
5. Notify the on-call team of the rotation (Slack `#opennba-ops`)
6. Document the rotation in the audit trail

**Who to notify:** Platform lead, DevOps, security officer.

---

## Pre-Commit Hooks

Configured via Husky + detect-secrets:

```bash
# .husky/pre-commit
npx detect-secrets scan --baseline .secrets.baseline
```

Blocks any commit that introduces a secret-shaped string (API keys, connection strings, JWTs).

---

## LLM Call Security

Before every LLM call, the `ContextSynthesisAgent` de-identifies the HCP context:
- HCP name → `[HCP_NAME]`
- `hcp_id` → `[HCP_ID]`
- NPI → `[NPI]`

After the LLM response, the hallucination guardrail strips any sentence referencing a drug name not present in the active offer catalog.

LLM API keys are stored in environment variables only — never in code, logs, or database.
