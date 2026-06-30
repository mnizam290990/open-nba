import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@opennba/db";
import { nbaActionLog, nbaCards, auditLog } from "@opennba/db";
import { eq, and } from "drizzle-orm";
import { withAuth, AuthedRequest } from "@/lib/with-auth";
import { badRequest, handleZodError, ok } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  hcp_id: z.string().uuid("hcp_id must be a valid UUID"),
  action_type: z.enum(["SCHEDULE_VISIT", "LOG_CALL", "DISMISS", "SNOOZE"], {
    errorMap: () => ({ message: "action_type must be one of: SCHEDULE_VISIT, LOG_CALL, DISMISS, SNOOZE" }),
  }),
  notes: z.string().max(1000).optional(),
});

async function handler(req: AuthedRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be valid JSON") as NextResponse;
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return handleZodError(parsed.error) as NextResponse;
  }

  const { hcp_id, action_type, notes } = parsed.data;
  const ipAddress = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";

  const actionId = crypto.randomUUID();

  await db.insert(nbaActionLog).values({
    actionId,
    mrId: req.user.id,
    hcpId: hcp_id,
    actionType: action_type,
    metadata: { notes, ipAddress },
    tenantId: req.user.tenantId,
  });

  await db.insert(auditLog).values({
    eventType: "HCP_ACTION_TAKEN",
    userId: req.user.id,
    resourceId: hcp_id,
    ipAddress,
    metadata: { actionType: action_type, actionId },
  });

  if (action_type === "DISMISS") {
    await db
      .update(nbaCards)
      .set({ isDismissed: true })
      .where(and(eq(nbaCards.mrId, req.user.id), eq(nbaCards.hcpId, hcp_id)));
  }

  if (action_type === "SNOOZE") {
    const snoozedUntil = new Date();
    snoozedUntil.setDate(snoozedUntil.getDate() + 7);
    await db
      .update(nbaCards)
      .set({ snoozedUntil })
      .where(and(eq(nbaCards.mrId, req.user.id), eq(nbaCards.hcpId, hcp_id)));
  }

  return ok({ actionId, status: "accepted" }, 202);
}

export const POST = withAuth(handler);
