/**
 * Demo NBA cards seed.
 *
 * Seeds nba_cards, nba_action_log, and pipeline_runs for all demo users
 * so every role has visible data immediately after deployment.
 *
 * Safe to run multiple times (uses onConflictDoNothing).
 */

import { db } from "./client";
import {
  users,
  hcpProfiles,
  offerCatalog,
  nbaCards,
  nbaActionLog,
  pipelineRuns,
  mrProfiles,
} from "./schema";
import { eq, and } from "drizzle-orm";
import { faker } from "@faker-js/faker";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

const SUMMARIES = [
  "This Tier-1 cardiologist has not been visited in over 90 days. Prescription trend shows a 15% dip in the last quarter — a targeted re-engagement call is high ROI.",
  "An active oncology prescriber with strong prior engagement. Last visit was 75 days ago. Recommend presenting the latest trial reprint pack.",
  "Tier-2 diabetologist with consistent prescription volume. Upcoming CME symposium invite is highly relevant — opening a dialogue now maximises attendance odds.",
  "A key neurology influencer in this territory. 65-day visit gap detected. Bring the NEURO-CARE data summary to address recent clinical queries.",
  "High-potential respiratory HCP just transitioned from a competitor product. First visit post-switch is critical — RespiFlow digital module recommended.",
  "Senior cardiologist who responded positively to the last sample drop. Follow-up to gauge patient outcomes strengthens the relationship.",
  "Tier-1 oncologist presenting at the regional conference next month. A brief courtesy call before the event builds brand visibility.",
  "Previously unreachable HCP — new contact number confirmed. Fresh outreach opportunity with the full portfolio introduction.",
  "Prescriber with strong TIER_1 profile but zero interactions in 120 days. Escalation candidate — high priority for this week.",
  "New HCP added to territory this month. First contact call should focus on introductory sample kit and clinical evidence overview.",
];

const TALKING_POINTS = [
  ["Share the latest Phase-III outcomes data showing 22% improvement over standard-of-care.", "Address the formulary update — product is now Tier-1 preferred.", "Introduce the new patient assistance programme for under-insured populations."],
  ["Highlight 18-month persistence data from the real-world registry study.", "Discuss the dosing flexibility compared to competitor options.", "Offer a sample kit for new patient trial — limited time availability."],
  ["Present the CME symposium invitation for Q3 2026 — full-day event in Mumbai.", "Review adherence support tools available via the patient app.", "Share the HCP-facing clinical case studies PDF."],
  ["Open with the new indication approval — significantly broadens the eligible patient pool.", "Discuss the updated safety profile — NNH data is best-in-class.", "Invite HCP to the advisory board meeting scheduled for next quarter."],
  ["Start with the switch-support protocol — step-by-step guide for transitioning patients.", "Provide the RespiFlow inhaler-technique patient education module.", "Offer a follow-up call in 2 weeks to assess early patient outcomes."],
];

const ACTION_TYPES = ["SCHEDULE_VISIT", "LOG_CALL", "DISMISS", "SNOOZE"] as const;
const OUTCOMES = ["Positive — prescriber engaged", "Scheduled follow-up for next week", "HCP in meeting — called back later", "Left message, awaiting callback"];

function urgencyFromScore(score: number): "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 80) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

function randomScore(): number {
  return Math.round(Math.random() * 100 * 100) / 100;
}

async function main() {
  console.log("\nopenNBA Demo Cards Seed");
  console.log("══════════════════════════════════════");

  // Fetch demo users
  const demoMR = await db.query.users.findFirst({ where: eq(users.email, "mr@demo.opennba.com") });
  const demoRSM = await db.query.users.findFirst({ where: eq(users.email, "rsm@demo.opennba.com") });

  if (!demoMR || !demoRSM) {
    throw new Error("Demo users not found — run seed.ts first");
  }

  // Ensure demo MR has a mr_profile
  const existingProfile = await db.query.mrProfiles.findFirst({
    where: eq(mrProfiles.mrId, demoMR.id),
  });
  if (!existingProfile) {
    await db.insert(mrProfiles).values({
      mrId: demoMR.id,
      name: "Demo MR",
      territory: "Mumbai Central",
      rsmId: demoRSM.id,
      tenantId: TENANT_ID,
    }).onConflictDoNothing();
    console.log("  Created mr_profile for Demo MR");
  }

  // Fetch 500 HCPs and offers
  const hcps = await db.select().from(hcpProfiles).where(eq(hcpProfiles.tenantId, TENANT_ID)).limit(500);
  const offers = await db.select().from(offerCatalog).where(eq(offerCatalog.tenantId, TENANT_ID)).limit(6);

  if (hcps.length === 0) throw new Error("No HCPs found — run seed.ts first");

  console.log(`  Found ${hcps.length} HCPs, ${offers.length} offers`);

  // Shuffle HCPs and assign first 30 to demo MR
  const shuffled = [...hcps].sort(() => Math.random() - 0.5);
  const mrHCPs = shuffled.slice(0, 30);

  // Seed pipeline run for demo MR
  const [run] = await db.insert(pipelineRuns).values({
    runId: faker.string.uuid(),
    mrId: demoMR.id,
    status: "COMPLETED",
    startedAt: new Date(Date.now() - 5 * 60 * 1000),
    completedAt: new Date(Date.now() - 2 * 60 * 1000),
    cardsGenerated: mrHCPs.length,
    stepResults: { signal_harvester: { processed: mrHCPs.length }, scoring_engine: { scored: mrHCPs.length }, context_synthesis: { cards_generated: mrHCPs.length } },
    tenantId: TENANT_ID,
  }).returning();

  // Seed NBA cards for demo MR
  const cardRows = mrHCPs.map((hcp, i) => {
    const score = randomScore();
    const offer = offers[Math.floor(Math.random() * offers.length)];
    const summaryIdx = i % SUMMARIES.length;
    const tpIdx = i % TALKING_POINTS.length;
    return {
      cardId: faker.string.uuid(),
      mrId: demoMR.id,
      hcpId: hcp.hcpId,
      runId: run?.runId ?? null,
      priorityScore: String(score),
      urgencyLevel: urgencyFromScore(score),
      daysSinceLastVisit: Math.floor(Math.random() * 150) + 5,
      summary: SUMMARIES[summaryIdx],
      talkingPoints: TALKING_POINTS[tpIdx],
      offerId: offer?.offerId ?? null,
      isPartiallyEnriched: false,
      isDismissed: false,
      tenantId: TENANT_ID,
    };
  });

  await db.insert(nbaCards).values(cardRows).onConflictDoNothing();
  console.log(`  Seeded ${cardRows.length} NBA cards for Demo MR`);

  // Seed action history for demo MR (last 14 days)
  const actionRows = mrHCPs.slice(0, 15).map((hcp, i) => ({
    actionId: faker.string.uuid(),
    mrId: demoMR.id,
    hcpId: hcp.hcpId,
    actionType: ACTION_TYPES[i % ACTION_TYPES.length],
    outcome: OUTCOMES[i % OUTCOMES.length],
    notes: `Visit completed. ${OUTCOMES[i % OUTCOMES.length]}.`,
    timestamp: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
    tenantId: TENANT_ID,
  }));

  await db.insert(nbaActionLog).values(actionRows).onConflictDoNothing();
  console.log(`  Seeded ${actionRows.length} action logs for Demo MR`);

  // Seed NBA cards for the 25 generated MRs under demo RSM
  const teamMRs = await db.query.mrProfiles.findMany({
    where: eq(mrProfiles.rsmId, demoRSM.id),
    limit: 25,
  });

  console.log(`  Seeding cards for ${teamMRs.length} team MRs under Demo RSM...`);

  for (const mrProfile of teamMRs.slice(0, 10)) {
    const teamHCPs = shuffled.slice(
      Math.floor(Math.random() * 400),
      Math.floor(Math.random() * 400) + 8
    );

    const teamCards = teamHCPs.map((hcp) => {
      const score = randomScore();
      const offer = offers[Math.floor(Math.random() * offers.length)];
      return {
        cardId: faker.string.uuid(),
        mrId: mrProfile.mrId,
        hcpId: hcp.hcpId,
        runId: null as string | null,
        priorityScore: String(score),
        urgencyLevel: urgencyFromScore(score),
        daysSinceLastVisit: Math.floor(Math.random() * 120) + 10,
        summary: SUMMARIES[Math.floor(Math.random() * SUMMARIES.length)],
        talkingPoints: TALKING_POINTS[Math.floor(Math.random() * TALKING_POINTS.length)],
        offerId: offer?.offerId ?? null,
        isPartiallyEnriched: false,
        isDismissed: false,
        tenantId: TENANT_ID,
      };
    });

    if (teamCards.length > 0) {
      await db.insert(nbaCards).values(teamCards).onConflictDoNothing();
    }

    // Add recent action for each team MR
    if (teamHCPs[0]) {
      await db.insert(nbaActionLog).values({
        actionId: faker.string.uuid(),
        mrId: mrProfile.mrId,
        hcpId: teamHCPs[0].hcpId,
        actionType: ACTION_TYPES[Math.floor(Math.random() * ACTION_TYPES.length)],
        outcome: OUTCOMES[Math.floor(Math.random() * OUTCOMES.length)],
        notes: "Routine follow-up completed.",
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
        tenantId: TENANT_ID,
      }).onConflictDoNothing();
    }
  }

  // Seed pipeline runs for admin health metrics (last 7 days)
  const pipelineStatuses = ["COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "FAILED", "COMPLETED", "COMPLETED"] as const;
  for (let i = 0; i < 7; i++) {
    const st = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const et = new Date(st.getTime() + 5 * 60 * 1000);
    await db.insert(pipelineRuns).values({
      runId: faker.string.uuid(),
      mrId: demoMR.id,
      status: pipelineStatuses[i],
      startedAt: st,
      completedAt: et,
      cardsGenerated: 25 + Math.floor(Math.random() * 10),
      stepResults: { tokens_used: 1200 + Math.floor(Math.random() * 800) },
      tenantId: TENANT_ID,
    }).onConflictDoNothing();
  }
  console.log("  Seeded 7-day pipeline run history for admin health metrics");

  console.log("\n══════════════════════════════════════");
  console.log("  Demo seed complete!");
  console.log("  MR Feed: 30 prioritised HCPs with AI summaries");
  console.log("  RSM Team: 10 MRs with cards + action history");
  console.log("  Admin: 7-day pipeline run history");
  console.log("══════════════════════════════════════\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Demo seed failed:", err);
  process.exit(1);
});
