import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@opennba/db";
import { offerCatalog, auditLog } from "@opennba/db";
import { eq, and } from "drizzle-orm";
import { withAuth, type AuthedRequest } from "@/lib/with-auth";
import { ok, created, badRequest, handleZodError, notFound } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const createOfferSchema = z.object({
  type: z.enum(["SAMPLE", "DETAIL_AID", "CME_INVITE", "PATIENT_MATERIAL", "SPEAKER_PROGRAM"]),
  therapyArea: z.enum(["CARDIOLOGY", "ONCOLOGY", "DIABETOLOGY", "NEUROLOGY", "RESPIRATORY"]),
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  eligibilityRules: z.record(z.unknown()).optional().default({}),
  assetUrl: z.string().url().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
});

async function listHandler(req: AuthedRequest): Promise<NextResponse> {
  const offers = await db.query.offerCatalog.findMany({
    where: eq(offerCatalog.tenantId, req.user.tenantId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return ok({ data: offers, total: offers.length });
}

async function createHandler(req: AuthedRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be valid JSON") as NextResponse;
  }

  const parsed = createOfferSchema.safeParse(body);
  if (!parsed.success) return handleZodError(parsed.error) as NextResponse;

  const { type, therapyArea, title, description, eligibilityRules, assetUrl, expiryDate } = parsed.data;

  const [offer] = await db
    .insert(offerCatalog)
    .values({
      type,
      therapyArea,
      title,
      description,
      eligibilityRules: eligibilityRules ?? {},
      assetUrl,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      tenantId: req.user.tenantId,
    })
    .returning();

  await db.insert(auditLog).values({
    eventType: "DATA_MODE_CHANGE",
    userId: req.user.id,
    resourceId: offer?.offerId,
    ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
    metadata: { action: "offer_created", title, type },
  });

  return created(offer);
}

export const GET = withAuth(listHandler, { requiredRoles: ["ADMIN"] });
export const POST = withAuth(createHandler, { requiredRoles: ["ADMIN"] });
