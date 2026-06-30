/**
 * GET /api/v1/admin/health-metrics
 *
 * Returns pipeline run statistics for the last 7 days.
 * ADMIN role required.
 */

import { NextResponse } from "next/server";
import { db } from "@opennba/db";
import { pipelineRuns } from "@opennba/db";
import { sql, gte, eq } from "drizzle-orm";
import { withAuth, type AuthedRequest } from "@/lib/with-auth";
import { ok } from "@/lib/api-response";

async function handler(req: AuthedRequest): Promise<NextResponse> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const rows = await db
    .select({
      status: pipelineRuns.status,
      count: sql<number>`count(*)::int`,
      totalTokens: sql<number>`coalesce(sum((step_results->>'tokens_used')::int), 0)::int`,
    })
    .from(pipelineRuns)
    .where(
      sql`${pipelineRuns.createdAt} >= ${sevenDaysAgo} AND ${pipelineRuns.tenantId} = ${req.user.tenantId}`
    )
    .groupBy(pipelineRuns.status);

  let totalRuns = 0;
  let completedRuns = 0;
  let totalTokens = 0;

  for (const row of rows) {
    totalRuns += row.count;
    if (row.status === "COMPLETED") completedRuns += row.count;
    totalTokens += row.totalTokens ?? 0;
  }

  return ok({
    runs7d: totalRuns,
    successRate: totalRuns > 0 ? completedRuns / totalRuns : 0,
    tokensUsed: totalTokens,
    breakdown: rows.map((r) => ({ status: r.status, count: r.count })),
  });
}

export const GET = withAuth(handler, { requiredRoles: ["ADMIN"] });
