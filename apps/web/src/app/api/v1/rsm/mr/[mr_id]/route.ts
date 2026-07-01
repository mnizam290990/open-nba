/**
 * GET /api/v1/rsm/mr/:mr_id
 *
 * RSM drill-down: returns this MR's HCPs and their latest NBA action history.
 * Accessible to RSM and ADMIN roles only.
 */

import { NextResponse } from "next/server";
import { db } from "@opennba/db";
import { nbaActionLog, hcpProfiles, nbaCards, mrProfiles } from "@opennba/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { withAuth, type AuthedRequest } from "@/lib/with-auth";
import { ok, forbidden, notFound, badRequest, internalError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

type MrRouteParams = { mr_id: string };

async function handler(
  req: AuthedRequest,
  ctx: { params: MrRouteParams }
): Promise<NextResponse> {
  if (req.user.role === "MR") {
    return forbidden("MRs cannot access RSM drill-down data") as NextResponse;
  }

  const { mr_id } = ctx.params;
  if (!mr_id) {
    return badRequest("mr_id is required") as NextResponse;
  }

  try {
    if (req.user.role === "RSM") {
      const teamMember = await db.query.mrProfiles.findFirst({
        where: and(
          eq(mrProfiles.mrId, mr_id),
          eq(mrProfiles.rsmId, req.user.id),
          eq(mrProfiles.tenantId, req.user.tenantId)
        ),
      });
      if (!teamMember) {
        return notFound("MR not found in your team") as NextResponse;
      }
    }

    const cards = await db
      .select({
        hcpId: nbaCards.hcpId,
        urgencyLevel: nbaCards.urgencyLevel,
        priorityScore: nbaCards.priorityScore,
      })
      .from(nbaCards)
      .where(
        and(eq(nbaCards.mrId, mr_id), eq(nbaCards.tenantId, req.user.tenantId))
      );

    const hcpIds = [...new Set(cards.map((c) => c.hcpId))];

    if (hcpIds.length === 0) {
      return ok({ mr_id, hcps: [], total: 0 });
    }

    const hcpList = await db
      .select({
        hcpId: hcpProfiles.hcpId,
        name: hcpProfiles.name,
        specialty: hcpProfiles.specialty,
        tier: hcpProfiles.tier,
        territory: hcpProfiles.territory,
      })
      .from(hcpProfiles)
      .where(
        and(
          eq(hcpProfiles.tenantId, req.user.tenantId),
          inArray(hcpProfiles.hcpId, hcpIds)
        )
      );

    const allActions = await db
      .select({
        actionId: nbaActionLog.actionId,
        hcpId: nbaActionLog.hcpId,
        actionType: nbaActionLog.actionType,
        metadata: nbaActionLog.metadata,
        timestamp: nbaActionLog.timestamp,
      })
      .from(nbaActionLog)
      .where(
        and(
          eq(nbaActionLog.mrId, mr_id),
          eq(nbaActionLog.tenantId, req.user.tenantId),
          inArray(nbaActionLog.hcpId, hcpIds)
        )
      )
      .orderBy(desc(nbaActionLog.timestamp));

    const actionsByHcp = new Map<string, typeof allActions>();
    for (const action of allActions) {
      const existing = actionsByHcp.get(action.hcpId) ?? [];
      if (existing.length < 5) {
        existing.push(action);
        actionsByHcp.set(action.hcpId, existing);
      }
    }

    const hcpsWithHistory = hcpList.map((hcp) => {
      const card = cards.find((c) => c.hcpId === hcp.hcpId);
      const actions = actionsByHcp.get(hcp.hcpId) ?? [];

      return {
        ...hcp,
        urgencyLevel: card?.urgencyLevel ?? null,
        priorityScore: card?.priorityScore ?? null,
        recentActions: actions.map((a) => ({
          actionId: a.actionId,
          actionType: a.actionType,
          outcome: (a.metadata as { outcome?: string } | null)?.outcome ?? null,
          notes: (a.metadata as { notes?: string } | null)?.notes ?? null,
          timestamp: a.timestamp.toISOString(),
        })),
      };
    });

    hcpsWithHistory.sort((a, b) => {
      const urgencyOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return (
        (urgencyOrder[a.urgencyLevel as keyof typeof urgencyOrder] ?? 3) -
        (urgencyOrder[b.urgencyLevel as keyof typeof urgencyOrder] ?? 3)
      );
    });

    return ok({ mr_id, hcps: hcpsWithHistory, total: hcpsWithHistory.length });
  } catch (err) {
    console.error("[GET /api/v1/rsm/mr/:mr_id]", err);
    return internalError("Failed to load MR drill-down data") as NextResponse;
  }
}

export const GET = withAuth<MrRouteParams>(handler, { requiredRoles: ["RSM", "ADMIN"] });
