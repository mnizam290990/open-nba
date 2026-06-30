import { NextResponse } from "next/server";
import { db } from "@opennba/db";
import { mrProfiles, users, nbaActionLog } from "@opennba/db";
import { eq, and, desc, max } from "drizzle-orm";
import { withAuth, type AuthedRequest } from "@/lib/with-auth";
import { ok, forbidden } from "@/lib/api-response";

export const dynamic = "force-dynamic";

async function handler(req: AuthedRequest): Promise<NextResponse> {
  if (req.user.role === "MR") {
    return forbidden("MRs cannot access RSM team data") as NextResponse;
  }

  const teamMembers = await db
    .select({
      mrId: mrProfiles.mrId,
      name: mrProfiles.name,
      territory: mrProfiles.territory,
      rsmId: mrProfiles.rsmId,
    })
    .from(mrProfiles)
    .innerJoin(users, eq(mrProfiles.mrId, users.id))
    .where(
      and(
        eq(mrProfiles.rsmId, req.user.id),
        eq(mrProfiles.tenantId, req.user.tenantId)
      )
    );

  const teamWithActivity = await Promise.all(
    teamMembers.map(async (mr) => {
      const lastAction = await db
        .select({ lastAt: max(nbaActionLog.timestamp) })
        .from(nbaActionLog)
        .where(
          and(
            eq(nbaActionLog.mrId, mr.mrId),
            eq(nbaActionLog.tenantId, req.user.tenantId)
          )
        )
        .then((r) => r[0]?.lastAt ?? null);

      return {
        mrId: mr.mrId,
        name: mr.name,
        territory: mr.territory,
        lastActivityAt: lastAction,
      };
    })
  );

  return ok({ data: teamWithActivity, total: teamWithActivity.length });
}

export const GET = withAuth(handler, { requiredRoles: ["RSM", "ADMIN"] });
