/**
 * openNBA Mock Data Seed Script
 *
 * Configurable via DATA_SEED_PARAMS environment variable (JSON) or defaults.
 *
 * Default config:
 *   NUM_HCPS=500, NUM_MRS=25, HISTORY_MONTHS=18, GAP_RATE=0.35
 *
 * Therapy areas: Cardiology, Oncology, Diabetology, Neurology, Respiratory
 * Prescriber tiers: Tier 1 (20%), Tier 2 (50%), Tier 3 (30%)
 * At least 35% of HCPs have a 60+ day visit gap
 */

import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import { db } from "./client";
import {
  users,
  mrProfiles,
  hcpProfiles,
  visitLogs,
  offerCatalog,
  nbaActionLog,
  auditLog,
} from "./schema";

interface SeedParams {
  NUM_HCPS: number;
  NUM_MRS: number;
  HISTORY_MONTHS: number;
  GAP_RATE: number;
  TENANT_ID: string;
}

const DEFAULT_PARAMS: SeedParams = {
  NUM_HCPS: 500,
  NUM_MRS: 25,
  HISTORY_MONTHS: 18,
  GAP_RATE: 0.35,
  TENANT_ID: "00000000-0000-0000-0000-000000000001",
};

function loadParams(): SeedParams {
  const raw = process.env.DATA_SEED_PARAMS;
  if (!raw) return DEFAULT_PARAMS;
  try {
    return { ...DEFAULT_PARAMS, ...JSON.parse(raw) };
  } catch {
    console.warn("Invalid DATA_SEED_PARAMS — using defaults");
    return DEFAULT_PARAMS;
  }
}

const THERAPY_AREAS = [
  "CARDIOLOGY",
  "ONCOLOGY",
  "DIABETOLOGY",
  "NEUROLOGY",
  "RESPIRATORY",
] as const;

const TERRITORIES = [
  "North Mumbai",
  "South Mumbai",
  "Pune Central",
  "Bangalore East",
  "Bangalore West",
  "Delhi NCR",
  "Chennai",
  "Hyderabad",
  "Kolkata",
  "Ahmedabad",
];

const OFFER_DATA = [
  {
    title: "CARDI-FORTE Samples",
    therapyArea: "CARDIOLOGY",
    type: "SAMPLE",
    description: "3-day sample pack of CARDI-FORTE 10mg for new patient trial",
    eligibilityRules: { minTier: "TIER_2", specialty: "CARDIOLOGY" },
  },
  {
    title: "Oncology Comprehensive Detail Aid",
    therapyArea: "ONCOLOGY",
    type: "DETAIL_AID",
    description: "Clinical evidence summary for ONCO-MAX — latest trial data",
    eligibilityRules: { specialty: "ONCOLOGY" },
  },
  {
    title: "Diabetology CME Invite",
    therapyArea: "DIABETOLOGY",
    type: "CME_INVITE",
    description: "Invitation to the DIABE-CON Annual Symposium, Mumbai 2026",
    eligibilityRules: { specialty: "DIABETOLOGY", minTier: "TIER_1" },
  },
  {
    title: "Neuro-CARE Reprint Pack",
    therapyArea: "NEUROLOGY",
    type: "REPRINTS",
    description: "Key journal reprints supporting NEURO-CARE's efficacy profile",
    eligibilityRules: { specialty: "NEUROLOGY" },
  },
  {
    title: "RespiFlow Digital Asset",
    therapyArea: "RESPIRATORY",
    type: "DIGITAL_ASSET",
    description: "Interactive patient education module for RespiFlow inhaler technique",
    eligibilityRules: { specialty: "RESPIRATORY" },
  },
  {
    title: "Cardiology Tier-1 Exclusive Sample",
    therapyArea: "CARDIOLOGY",
    type: "SAMPLE",
    description: "Premium sample kit for top-tier cardiologists",
    eligibilityRules: { minTier: "TIER_1", specialty: "CARDIOLOGY" },
  },
] as const;

function weightedTier(): "TIER_1" | "TIER_2" | "TIER_3" {
  const r = Math.random();
  if (r < 0.2) return "TIER_1";
  if (r < 0.7) return "TIER_2";
  return "TIER_3";
}

function randomTherapyArea() {
  return THERAPY_AREAS[Math.floor(Math.random() * THERAPY_AREAS.length)];
}

function randomTerritory() {
  return TERRITORIES[Math.floor(Math.random() * TERRITORIES.length)];
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function seedUsers(params: SeedParams) {
  console.log("  Seeding demo users…");

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const demoUsers = [
    {
      id: faker.string.uuid(),
      name: "Demo MR",
      email: "mr@demo.opennba.com",
      role: "MR" as const,
      passwordHash,
      tenantId: params.TENANT_ID,
      emailVerified: new Date(),
    },
    {
      id: faker.string.uuid(),
      name: "Demo RSM",
      email: "rsm@demo.opennba.com",
      role: "RSM" as const,
      passwordHash,
      tenantId: params.TENANT_ID,
      emailVerified: new Date(),
    },
    {
      id: faker.string.uuid(),
      name: "Demo Admin",
      email: "admin@demo.opennba.com",
      role: "ADMIN" as const,
      passwordHash,
      tenantId: params.TENANT_ID,
      emailVerified: new Date(),
    },
  ];

  await db.insert(users).values(demoUsers).onConflictDoNothing();
  return demoUsers;
}

async function seedMRs(params: SeedParams) {
  console.log(`  Seeding ${params.NUM_MRS} MR users…`);

  const rsmUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, "rsm@demo.opennba.com"),
  });

  const mrUsers = Array.from({ length: params.NUM_MRS }, () => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    role: "MR" as const,
    passwordHash: null,
    tenantId: params.TENANT_ID,
    emailVerified: new Date(),
  }));

  await db.insert(users).values(mrUsers).onConflictDoNothing();

  const mrProfileData = mrUsers.map((u) => ({
    mrId: u.id,
    name: u.name,
    territory: randomTerritory(),
    rsmId: rsmUser?.id,
    tenantId: params.TENANT_ID,
  }));

  await db.insert(mrProfiles).values(mrProfileData).onConflictDoNothing();

  return mrUsers;
}

async function seedHCPs(params: SeedParams) {
  console.log(`  Seeding ${params.NUM_HCPS} HCP profiles…`);

  const hcps = Array.from({ length: params.NUM_HCPS }, () => ({
    hcpId: faker.string.uuid(),
    name: `Dr. ${faker.person.fullName()}`,
    specialty: randomTherapyArea(),
    tier: weightedTier(),
    territory: randomTerritory(),
    npi: faker.string.numeric(10),
    isActive: true,
    tenantId: params.TENANT_ID,
  }));

  await db.insert(hcpProfiles).values(hcps).onConflictDoNothing();
  return hcps;
}

async function seedVisitLogs(params: SeedParams, mrUsers: { id: string }[], hcps: { hcpId: string }[]) {
  console.log("  Seeding visit logs…");

  const historyDays = params.HISTORY_MONTHS * 30;
  const gapHcps = new Set<string>();
  const targetGapCount = Math.floor(params.NUM_HCPS * params.GAP_RATE);

  const shuffled = [...hcps].sort(() => Math.random() - 0.5);
  shuffled.slice(0, targetGapCount).forEach((h) => gapHcps.add(h.hcpId));

  const logs: Array<{
    visitId: string;
    hcpId: string;
    mrId: string;
    visitDate: Date;
    outcome: "COMPLETED" | "CANCELLED" | "NO_SHOW" | "RESCHEDULED" | "CALL_ONLY";
    notes: string;
    tenantId: string;
  }> = [];

  const outcomes = ["COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED", "CALL_ONLY"] as const;

  for (const hcp of hcps) {
    const assignedMR = mrUsers[Math.floor(Math.random() * mrUsers.length)];
    const hasGap = gapHcps.has(hcp.hcpId);

    const minDaysAgo = hasGap ? 65 : 5;
    const maxDaysAgo = historyDays;
    const numVisits = Math.floor(Math.random() * 8) + (hasGap ? 0 : 1);

    let lastVisitDays = minDaysAgo + Math.floor(Math.random() * (maxDaysAgo - minDaysAgo));

    for (let i = 0; i < numVisits; i++) {
      logs.push({
        visitId: faker.string.uuid(),
        hcpId: hcp.hcpId,
        mrId: assignedMR.id,
        visitDate: daysAgo(lastVisitDays),
        outcome: outcomes[Math.floor(Math.random() * outcomes.length)],
        notes: faker.lorem.sentence(),
        tenantId: params.TENANT_ID,
      });
      lastVisitDays += Math.floor(Math.random() * 45) + 15;
    }
  }

  const BATCH = 500;
  for (let i = 0; i < logs.length; i += BATCH) {
    await db.insert(visitLogs).values(logs.slice(i, i + BATCH)).onConflictDoNothing();
  }

  console.log(`    → ${logs.length} visit log rows inserted`);
}

async function seedOffers(params: SeedParams) {
  console.log("  Seeding offer catalog…");

  const offers = OFFER_DATA.map((o) => ({
    offerId: faker.string.uuid(),
    type: o.type as "SAMPLE" | "DETAIL_AID" | "REPRINTS" | "CME_INVITE" | "DIGITAL_ASSET",
    therapyArea: o.therapyArea as "CARDIOLOGY" | "ONCOLOGY" | "DIABETOLOGY" | "NEUROLOGY" | "RESPIRATORY",
    title: o.title,
    description: o.description,
    eligibilityRules: o.eligibilityRules,
    assetUrl: `https://assets.opennba.com/offers/${faker.string.alphanumeric(8)}.pdf`,
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    isActive: true,
    tenantId: params.TENANT_ID,
  }));

  await db.insert(offerCatalog).values(offers).onConflictDoNothing();
  return offers;
}

async function main() {
  const params = loadParams();

  console.log("\nopenNBA Seed Script");
  console.log("══════════════════════════════════════");
  console.log(`  NUM_HCPS      : ${params.NUM_HCPS}`);
  console.log(`  NUM_MRS       : ${params.NUM_MRS}`);
  console.log(`  HISTORY_MONTHS: ${params.HISTORY_MONTHS}`);
  console.log(`  GAP_RATE      : ${(params.GAP_RATE * 100).toFixed(0)}%`);
  console.log(`  TENANT_ID     : ${params.TENANT_ID}`);
  console.log("──────────────────────────────────────\n");

  const demoUsers = await seedUsers(params);
  const mrUsers = await seedMRs(params);
  const hcps = await seedHCPs(params);
  await seedVisitLogs(params, [...mrUsers, ...demoUsers.filter((u) => u.role === "MR")], hcps);
  await seedOffers(params);

  console.log("\n══════════════════════════════════════");
  console.log("  Seed complete!");
  console.log(`  Demo login: mr@demo.opennba.com / demo1234`);
  console.log("══════════════════════════════════════\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
