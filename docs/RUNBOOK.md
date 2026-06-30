# Runbook — openNBA

## Service Overview

| Service | Platform | URL |
|---|---|---|
| Next.js Web App | Vercel | https://opennba.vercel.app |
| Python Agent Service | Render | https://opennba-agent.onrender.com |
| PostgreSQL | Supabase/Neon | (connection string in Vercel/Render env vars) |

---

## How to Restart Services

### Restart the Next.js App (Vercel)

1. Go to [vercel.com](https://vercel.com) → openNBA project
2. Navigate to **Deployments**
3. Click the latest successful deployment → **Redeploy**
4. Wait ~60s for deployment to complete
5. Verify: `curl https://opennba.vercel.app/api/v1/health`

### Restart the Python Agent Service (Render)

1. Go to [render.com](https://render.com) → openNBA agent service
2. Click **Manual Deploy** → **Deploy latest commit**
3. Wait ~90s for deployment to complete
4. Verify: `curl https://opennba-agent.onrender.com/health`

### Restart local Docker services

```bash
cd infra/local
docker compose restart agent web
docker compose logs -f agent
```

---

## How to Roll Back a Vercel Deployment

1. Go to Vercel → Deployments tab
2. Find the last known-good deployment (look for green checkmark)
3. Click the **⋯** menu → **Promote to Production**
4. Verify the rollback: `curl https://opennba.vercel.app/api/v1/health`

---

## Alert Response Steps

### `pipeline_timeout` alert

**Symptom:** MR feed not updating; agent service health shows `TIMEOUT` status.

1. Check Render logs: Render → agent service → Logs
2. Look for the `mr_id` in the timeout event
3. If the issue is a bad LLM call: check `OPENAI_API_KEY` / `AWS_SECRET_ACCESS_KEY` are valid
4. Restart the agent service (see above)
5. Trigger a manual pipeline run for the affected MR via the Admin Console

### `llm_output_invalid` alert

**Symptom:** NBA cards showing template talking points instead of AI-generated content.

1. Check LangSmith traces for the failing run
2. Verify the LLM API key is valid and has quota
3. Check if the prompt template changed recently (git log)
4. The system automatically falls back to template talking points — this is non-critical

### Database connection failure

**Symptom:** `DATABASE_URL` errors in Vercel/Render logs.

1. Check Supabase/Neon dashboard for connection pool exhaustion
2. Verify the connection string in Vercel/Render environment variables
3. If using Supabase, ensure the pooler URL (`?pgbouncer=true`) is used for app connections
4. Restart the Next.js app after fixing the connection string

---

## Escalation Contacts

| Tier | Contact | Channel |
|---|---|---|
| Platform (L1) | Platform lead | Slack `#opennba-ops` |
| Database (L2) | DBA / DevOps | Slack `#opennba-ops` |
| Security (L3) | Security officer | Email (see SECURITY.md) |

---

## Monthly Infrastructure Cost Check

Target: $0–$30/month on free tiers.

| Service | Free Tier Limit | Monitor |
|---|---|---|
| Vercel | Unlimited personal deploys | Vercel dashboard |
| Render | 750 hrs/month free tier | Render dashboard |
| Supabase | 500 MB database, 2 projects | Supabase dashboard |
| Neon | 0.5 GB | Neon dashboard |
| LangSmith | Free for <5k traces/month | LangSmith dashboard |
