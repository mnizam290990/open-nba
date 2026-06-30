import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@opennba/db";
import { offerCatalog, nbaCards, auditLog } from "@opennba/db";
import { eq, and, count } from "drizzle-orm";
import { withAuth, type AuthedRequest } from "@/lib/with-auth";
import {
  ok,
  noContent,
  badRequest,
  handleZodError,
  notFound,
} from "@/lib/api-response";

export const dynamic = "force-dynamic";

type Params = { offer_id: string };

const updateOfferSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  eligibilityRules: z.record(z.unknown()).optional(),
  assetUrl: z.string().url().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
});

async function getHandler(req: AuthedRequest, ctx: { params: Params }): Promise<NextResponse> {
  const offer = await db.query.offerCatalog.findFirst({
    where: and(
      eq(offerCatalog.offerId, ctx.params.offer_id),
      eq(offerCatalog.tenantId, req.user.tenantId)
    ),
  });
  if (!offer) return notFound("Offer not found") as NextResponse;
  return ok(offer);
}

async function updateHandler(
  req: AuthedRequest,
  ctx: { params: Params }
): Promise<NextResponse> {
  const offer = await db.query.offerCatalog.findFirst({
    where: and(
      eq(offerCatalog.offerId, ctx.params.offer_id),
      eq(offerCatalog.tenantId, req.user.tenantId)
    ),
  });
  if (!offer) return notFound("Offer not found") as NextResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be valid JSON") as NextResponse;
  }

  const parsed = updateOfferSchema.safeParse(body);
  if (!parsed.success) return handleZodError(parsed.error) as NextResponse;

  const updates: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.expiryDate !== undefined) {
    updates.expiryDate = parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null;
  }

  const [updated] = await db
    .update(offerCatalog)
    .set(updates)
    .where(
      and(
        eq(offerCatalog.offerId, ctx.params.offer_id),
        eq(offerCatalog.tenantId, req.user.tenantId)
      )
    )
    .returning();

  return ok(updated);
}

async function deleteHandler(
  req: AuthedRequest,
  ctx: { params: Params }
): Promise<NextResponse> {
  const offer = await db.query.offerCatalog.findFirst({
    where: and(
      eq(offerCatalog.offerId, ctx.params.offer_id),
      eq(offerCatalog.tenantId, req.user.tenantId)
    ),
  });
  if (!offer) return notFound("Offer not found") as NextResponse;

  // Warn if offer is attached to active NBA cards
  const [activeUsage] = await db
    .select({ count: count() })
    .from(nbaCards)
    .where(
      and(
        eq(nbaCards.offerId, ctx.params.offer_id),
        eq(nbaCards.isDismissed, false),
        eq(nbaCards.tenantId, req.user.tenantId)
      )
    );

  const activeCount = Number(activeUsage?.count ?? 0);

  await db
    .update(offerCatalog)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(offerCatalog.offerId, ctx.params.offer_id));

  await db.insert(auditLog).values({
    eventType: "DATA_MODE_CHANGE",
    userId: req.user.id,
    resourceId: ctx.params.offer_id,
    ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
    metadata: { action: "offer_deactivated", activeCardsAffected: activeCount },
  });

  return ok({ deleted: true, activeCardsAffected: activeCount });
}

export const GET = withAuth(getHandler, { requiredRoles: ["ADMIN"] });
export const PATCH = withAuth(updateHandler, { requiredRoles: ["ADMIN"] });
export const DELETE = withAuth(deleteHandler, { requiredRoles: ["ADMIN"] });
