/**
 * GET /api/v1/rsm/mr/:mr_id
 *
 * RSM drill-down: returns this MR's HCPs and their latest NBA action history.
 * Accessible to RSM and ADMIN roles only.
 */

import { NextResponse } from "next/server";
import { db } from "@opennba/db";
import { nbaActionLog, hcpProfiles, nbaCards } from "@opennba/db";
import { eq, and, desc } from "drizzle-orm";
import { withAuth, type AuthedRequest } from "@/lib/with-auth";
import { ok, forbidden } from "@/lib/api-response";

async function handler(
  req: AuthedRequest,
  { params }: { params: Promise<{ mr_id: string }> }
): Promise<NextResponse> {
  if (req.user.role === "MR") {
    return forbidden("MRs cannot access RSM drill-down data") as NextResponse;
  }

  const { mr_id } = await params;

  // Get all HCPs this MR has active NBA cards for
  const cards = await db
    .select({
      hcpId: nbaCards.hcpId,
      urgencyLevel: nbaCards.urgencyLevel,
      priorityScore: nbaCards.priorityScore,
    })
    .from(nbaCards)
    .where(
      and(
        eq(nbaCards.mrId, mr_id),
        eq(nbaCards.tenantId, req.user.tenantId)
      )
    );

  const hcpIds = [...new Set(cards.map((c) => c.hcpId))];

  if (hcpIds.length === 0) {
    return ok({ mr_id, hcps: [], total: 0 });
  }

  // Get HCP profiles
  const hcpList = await db
    .select({
      hcpId: hcpProfiles.hcpId,
      name: hcpProfiles.name,
      specialty: hcpProfiles.specialty,
      tier: hcpProfiles.tier,
      territory: hcpProfiles.territory,
    })
    .from(hcpProfiles)
    .where(eq(hcpProfiles.tenantId, req.user.tenantId));

  const relevantHcps = hcpList.filter((h) => hcpIds.includes(h.hcpId));

  // For each HCP, get the last 5 NBA actions by this MR
  const hcpsWithHistory = await Promise.all(
    relevantHcps.map(async (hcp) => {
      const actions = await db
        .select({
          actionId: nbaActionLog.actionId,
          actionType: nbaActionLog.actionType,
          outcome: nbaActionLog.outcome,
          notes: nbaActionLog.notes,
          timestamp: nbaActionLog.timestamp,
        })
        .from(nbaActionLog)
        .where(
          and(
            eq(nbaActionLog.mrId, mr_id),
            eq(nbaActionLog.hcpId, hcp.hcpId),
            eq(nbaActionLog.tenantId, req.user.tenantId)
          )
        )
        .orderBy(desc(nbaActionLog.timestamp))
        .limit(5);

      const card = cards.find((c) => c.hcpId === hcp.hcpId);

      return {
        ...hcp,
        urgencyLevel: card?.urgencyLevel ?? null,
        priorityScore: card?.priorityScore ?? null,
        recentActions: actions,
      };
    })
  );

  hcpsWithHistory.sort((a, b) => {
    const urgencyOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return (urgencyOrder[a.urgencyLevel as keyof typeof urgencyOrder] ?? 3) -
      (urgencyOrder[b.urgencyLevel as keyof typeof urgencyOrder] ?? 3);
  });

  return ok({ mr_id, hcps: hcpsWithHistory, total: hcpsWithHistory.length });
}

export const GET = withAuth(handler, { requiredRoles: ["RSM", "ADMIN"] });
