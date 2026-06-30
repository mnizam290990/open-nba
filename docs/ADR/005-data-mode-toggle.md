# ADR-005 — DATA_MODE Toggle: Single Environment Variable

**Date:** 2026-06-30
**Status:** Accepted
**Authors:** Nagarro Platform Team

---

## Context

The platform must run against synthetic mock data for the Phase 0 demo and seamlessly switch to live CRM data in Phase 1. The transition must be:
- Controllable without code changes or redeployments (env var only)
- Validated before switching (schema-mapping checks)
- Auditable (every toggle logged with actor + timestamp)
- Safe to fail — if validation fails, the system stays in MOCK mode

## Decision

Use a single `DATA_MODE=MOCK|LIVE` environment variable, readable by both the Next.js BFF and the Python agent service.

- The BFF and agent service read `DATA_MODE` at startup and resolve the appropriate data provider implementation.
- The Admin Console exposes a toggle that writes the value to the Vercel/Render environment and triggers a re-deploy (Phase 0) or a rolling restart (Phase 1).
- Before allowing the toggle, a pre-flight validation step runs all schema-mapping checks and blocks the transition if any required field is missing or mismatched.

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **Single env var** ✓ | Simple, readable, toolchain-agnostic | Requires deploy/restart to take effect in Phase 0 |
| **Feature flag in DB** | Hot-reloadable | More complex; DB must be up to read the flag |
| **Separate deployments** | Full isolation | Cannot do in-place demo switch; complex config mgmt |
| **Config file in repo** | Version-controlled | Requires code commit to change; not operator-friendly |

## Consequences

- **Positive:** Any engineer or operator understands immediately what `DATA_MODE=MOCK` means without reading docs.
- **Positive:** CI can test both modes by setting `DATA_MODE` in the workflow matrix.
- **Positive:** The pre-flight validation gate (Admin Console) prevents accidental live-data exposure.
- **Negative:** In Phase 0 (Vercel + Render), switching requires a redeploy (~30 s). Acceptable for demo.
- **Phase 1 change:** Hot-reload without restart will be implemented by polling a config value from the database every 60 s.
