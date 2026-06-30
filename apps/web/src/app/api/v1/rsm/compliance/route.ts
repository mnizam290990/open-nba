import { NextResponse } from "next/server";
import { db } from "@opennba/db";
import { mrProfiles, nbaCards, nbaActionLog } from "@opennba/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { withAuth, type AuthedRequest } from "@/lib/with-auth";
import { ok, forbidden } from "@/lib/api-response";

export const dynamic = "force-dynamic";

async function handler(req: AuthedRequest): Promise<NextResponse> {
  if (req.user.role === "MR") {
    return forbidden("MRs cannot access RSM compliance data") as NextResponse;
  }

  const teamMrIds = await db
    .select({ mrId: mrProfiles.mrId })
    .from(mrProfiles)
    .where(
      and(
        eq(mrProfiles.rsmId, req.user.id),
        eq(mrProfiles.tenantId, req.user.tenantId)
      )
    )
    .then((rows) => rows.map((r) => r.mrId));

  if (teamMrIds.length === 0) {
    return ok({ complianceRate: 0, actedCount: 0, totalHighPriority: 0, weeklyTrend: [] });
  }

  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // High-priority cards (urgency = HIGH) generated in last 48 hours
  const highPriorityCards = await db
    .select({ cardId: nbaCards.cardId, mrId: nbaCards.mrId, hcpId: nbaCards.hcpId })
    .from(nbaCards)
    .where(
      and(
        eq(nbaCards.urgencyLevel, "HIGH"),
        eq(nbaCards.isDismissed, false),
        gte(nbaCards.generatedAt, fortyEightHoursAgo),
        eq(nbaCards.tenantId, req.user.tenantId),
        sql`${nbaCards.mrId} = ANY(${sql.raw(`ARRAY[${teamMrIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})`
      )
    );

  const totalHighPriority = highPriorityCards.length;

  if (totalHighPriority === 0) {
    return ok({ complianceRate: 100, actedCount: 0, totalHighPriority: 0, weeklyTrend: [] });
  }

  // Check which cards had an action taken
  let actedCount = 0;
  for (const card of highPriorityCards) {
    const acted = await db
      .select({ actionId: nbaActionLog.actionId })
      .from(nbaActionLog)
      .where(
        and(
          eq(nbaActionLog.mrId, card.mrId),
          eq(nbaActionLog.hcpId, card.hcpId),
          gte(nbaActionLog.timestamp, fortyEightHoursAgo),
          eq(nbaActionLog.tenantId, req.user.tenantId)
        )
      )
      .limit(1);
    if (acted.length > 0) actedCount++;
  }

  const complianceRate = Math.round((actedCount / totalHighPriority) * 100);

  return ok({
    complianceRate,
    actedCount,
    totalHighPriority,
    weeklyTrend: [],
  });
}

export const GET = withAuth(handler, { requiredRoles: ["RSM", "ADMIN"] });
