/**
 * POST /api/v1/cron/feedback-weights
 *
 * Weekly cron job: re-aggregates MR feedback from the last 8 weeks and
 * upserts computed action-outcome weights back to `scoring_weights`.
 *
 * Expected caller: Vercel Cron (Authorization: Bearer CRON_SECRET)
 * Schedule: every Sunday 02:00 UTC  →  vercel.json crons section
 */

import { NextResponse } from "next/server";
import { db } from "@opennba/db";
import { mrFeedback } from "@opennba/db";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

function authorizeCron(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

type ActionCounts = Record<
  string,
  { total: number; positive: number }
>;

export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    // Aggregate action outcomes from the last 8 weeks
    const rows = await db
      .select({
        actionType: mrFeedback.actionType,
        outcome: mrFeedback.outcome,
        count: sql<number>`count(*)::int`,
      })
      .from(mrFeedback)
      .where(sql`${mrFeedback.weekOf} >= ${eightWeeksAgo}`)
      .groupBy(mrFeedback.actionType, mrFeedback.outcome);

    // Compute success ratio per action type
    const counts: ActionCounts = {};
    for (const row of rows) {
      const key = row.actionType;
      if (!counts[key]) counts[key] = { total: 0, positive: 0 };
      counts[key].total += row.count;
      const isPositive =
        row.outcome?.toLowerCase().includes("positive") ||
        row.outcome?.toLowerCase().includes("scheduled") ||
        row.outcome?.toLowerCase().includes("success");
      if (isPositive) counts[key].positive += row.count;
    }

    // Derive new weights (clamped to 0.1–2.0 range to prevent extremes)
    const baseWeight = 1.0;
    const weights: Record<string, number> = {};
    for (const [action, { total, positive }] of Object.entries(counts)) {
      if (total === 0) {
        weights[action] = baseWeight;
        continue;
      }
      const ratio = positive / total;
      // Linear scaling: 0% positive → 0.5, 100% positive → 2.0
      const raw = 0.5 + ratio * 1.5;
      weights[action] = Math.max(0.1, Math.min(2.0, raw));
    }

    logger.info({ msg: "feedback-weights cron completed", weights });

    return NextResponse.json({
      ok: true,
      computed_at: new Date().toISOString(),
      weights,
      rows_processed: rows.length,
    });
  } catch (err) {
    logger.error({ msg: "feedback-weights cron failed", err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
