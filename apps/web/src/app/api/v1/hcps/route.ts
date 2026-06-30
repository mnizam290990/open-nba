import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@opennba/db";
import { hcpProfiles, nbaCards, visitLogs } from "@opennba/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { withAuth, AuthedRequest } from "@/lib/with-auth";
import { badRequest, handleZodError, ok } from "@/lib/api-response";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  urgency: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  territory: z.string().optional(),
  sortBy: z.enum(["priority_score", "days_since_visit", "name"]).default("priority_score"),
});

async function handler(req: AuthedRequest) {
  const { searchParams } = new URL(req.url);
  const raw = Object.fromEntries(searchParams.entries());

  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return handleZodError(parsed.error) as NextResponse;
  }

  const { page, limit, urgency, territory } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [eq(nbaCards.mrId, req.user.id), eq(nbaCards.isDismissed, false)];

  if (urgency) {
    conditions.push(eq(nbaCards.urgencyLevel, urgency));
  }

  const cards = await db.query.nbaCards.findMany({
    where: and(...conditions),
    with: {
      hcp: true,
      offer: true,
    },
    orderBy: [desc(nbaCards.priorityScore)],
    limit,
    offset,
  });

  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(nbaCards)
    .where(and(...conditions))
    .then((r) => Number(r[0]?.count ?? 0));

  return ok({
    data: cards,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: offset + cards.length < total,
    },
  });
}

export const GET = withAuth(handler);
