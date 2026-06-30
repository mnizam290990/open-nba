/**
 * GET  /api/v1/admin/data-mode  — returns current DATA_MODE
 * POST /api/v1/admin/data-mode  — runs pre-flight checks and toggles mode
 *
 * DATA_MODE is stored in a `system_config` table row (key="DATA_MODE").
 * Falls back to the DATA_MODE environment variable when no DB row exists.
 * ADMIN role required for both endpoints.
 */

import { NextResponse } from "next/server";
import { db } from "@opennba/db";
import { systemConfig, auditLog } from "@opennba/db";
import { eq } from "drizzle-orm";
import { withAuth, type AuthedRequest } from "@/lib/with-auth";
import { ok, forbidden } from "@/lib/api-response";
import { logger } from "@/lib/logger";

const DATA_MODE_KEY = "DATA_MODE";

async function readMode(): Promise<"MOCK" | "LIVE"> {
  const row = await db.query.systemConfig.findFirst({
    where: eq(systemConfig.key, DATA_MODE_KEY),
  });
  const val = row?.value ?? process.env.DATA_MODE ?? "MOCK";
  return val === "LIVE" ? "LIVE" : "MOCK";
}

async function getHandler(req: AuthedRequest): Promise<NextResponse> {
  if (req.user.role !== "ADMIN") return forbidden("Admin only") as NextResponse;
  const mode = await readMode();
  return ok({ mode });
}

async function postHandler(req: AuthedRequest): Promise<NextResponse> {
  if (req.user.role !== "ADMIN") return forbidden("Admin only") as NextResponse;

  const currentMode = await readMode();

  // Pre-flight: when switching MOCK → LIVE we require validation to pass.
  // For LIVE → MOCK no checks are needed (safe rollback).
  if (currentMode === "MOCK") {
    const preflight = await runPreflightChecks();
    if (!preflight.ok) {
      return NextResponse.json(
        { error: "Pre-flight checks failed", failures: preflight.failures },
        { status: 422 }
      );
    }
  }

  const newMode: "MOCK" | "LIVE" = currentMode === "MOCK" ? "LIVE" : "MOCK";

  await db
    .insert(systemConfig)
    .values({ key: DATA_MODE_KEY, value: newMode })
    .onConflictDoUpdate({ target: systemConfig.key, set: { value: newMode } });

  await db.insert(auditLog).values({
    eventType: "DATA_MODE_CHANGED",
    userId: req.user.id,
    metadata: { from: currentMode, to: newMode },
  });

  logger.info({ msg: "DATA_MODE toggled", from: currentMode, to: newMode, by: req.user.id });

  return ok({ mode: newMode, previous: currentMode });
}

/**
 * Lightweight pre-flight validation checks before switching to LIVE mode.
 * Add real connectivity checks here as integrations are built out.
 */
async function runPreflightChecks(): Promise<{ ok: boolean; failures: string[] }> {
  const failures: string[] = [];

  // Check 1: DATABASE_URL is present (required for live data)
  if (!process.env.DATABASE_URL) {
    failures.push("DATABASE_URL environment variable is not configured");
  }

  // Check 2: At least one offer exists in the catalog
  const { offerCatalog } = await import("@opennba/db");
  const { count } = await import("drizzle-orm");
  const offerCount = await db
    .select({ n: count() })
    .from(offerCatalog)
    .then((r) => r[0]?.n ?? 0);
  if (offerCount === 0) {
    failures.push("Offer catalog is empty — seed at least one offer before switching to LIVE mode");
  }

  // Check 3: AGENT_URL must point to a real endpoint
  if (!process.env.AGENT_URL) {
    failures.push("AGENT_URL is not configured — agent service must be reachable in LIVE mode");
  }

  return { ok: failures.length === 0, failures };
}

export const GET = withAuth(getHandler, { requiredRoles: ["ADMIN"] });
export const POST = withAuth(postHandler, { requiredRoles: ["ADMIN"] });
