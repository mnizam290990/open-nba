import { NextResponse } from "next/server";
import { db } from "@opennba/db";
import { offerCatalog } from "@opennba/db";
import { eq, and, gte, or, isNull } from "drizzle-orm";
import { withAuth, AuthedRequest } from "@/lib/with-auth";
import { ok } from "@/lib/api-response";

export const dynamic = "force-dynamic";

async function handler(req: AuthedRequest) {
  const now = new Date();

  const offers = await db.query.offerCatalog.findMany({
    where: and(
      eq(offerCatalog.tenantId, req.user.tenantId),
      eq(offerCatalog.isActive, true),
      or(isNull(offerCatalog.expiryDate), gte(offerCatalog.expiryDate, now))
    ),
  });

  return ok({ data: offers });
}

export const GET = withAuth(handler);
