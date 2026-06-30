import { NextResponse } from "next/server";
import { db } from "@opennba/db";
import { hcpProfiles, nbaCards, visitLogs } from "@opennba/db";
import { eq, and, desc } from "drizzle-orm";
import { withAuth, AuthedRequest } from "@/lib/with-auth";
import { notFound, ok } from "@/lib/api-response";

export const dynamic = "force-dynamic";

async function handler(req: AuthedRequest, { params }: { params: { hcp_id: string } }) {
  const { hcp_id } = params;

  const hcp = await db.query.hcpProfiles.findFirst({
    where: and(eq(hcpProfiles.hcpId, hcp_id), eq(hcpProfiles.tenantId, req.user.tenantId)),
  });

  if (!hcp) {
    return notFound("HCP not found") as NextResponse;
  }

  const card = await db.query.nbaCards.findFirst({
    where: and(eq(nbaCards.hcpId, hcp_id), eq(nbaCards.mrId, req.user.id)),
    with: { offer: true },
  });

  const recentVisits = await db.query.visitLogs.findMany({
    where: and(eq(visitLogs.hcpId, hcp_id), eq(visitLogs.mrId, req.user.id)),
    orderBy: [desc(visitLogs.visitDate)],
    limit: 10,
  });

  return ok({ hcp, card, recentVisits });
}

export const GET = withAuth(handler);
