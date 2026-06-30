import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  decimal,
  timestamp,
  jsonb,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  userRoleEnum,
  prescriberTierEnum,
  urgencyLevelEnum,
  therapyAreaEnum,
  visitOutcomeEnum,
  nbaActionTypeEnum,
  offerTypeEnum,
  auditEventTypeEnum,
  pipelineRunStatusEnum,
} from "./enums";

// ─────────────────────────────────────────────────────────────
// Users (Auth.js compatible)
// ─────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    passwordHash: text("password_hash"),
    role: userRoleEnum("role").notNull().default("MR"),
    isActive: boolean("is_active").notNull().default(true),
    tenantId: uuid("tenant_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("users_email_idx").on(t.email), index("users_tenant_idx").on(t.tenantId)]
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (t) => [
    uniqueIndex("accounts_provider_unique").on(t.provider, t.providerAccountId),
    index("accounts_user_idx").on(t.userId),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [uniqueIndex("verification_tokens_unique").on(t.identifier, t.token)]
);

// ─────────────────────────────────────────────────────────────
// MR Profiles
// ─────────────────────────────────────────────────────────────

export const mrProfiles = pgTable(
  "mr_profiles",
  {
    mrId: uuid("mr_id")
      .defaultRandom()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    territory: text("territory").notNull(),
    rsmId: uuid("rsm_id").references(() => users.id),
    tenantId: uuid("tenant_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("mr_profiles_rsm_idx").on(t.rsmId),
    index("mr_profiles_territory_idx").on(t.territory),
    index("mr_profiles_tenant_idx").on(t.tenantId),
  ]
);

// ─────────────────────────────────────────────────────────────
// HCP Profiles
// ─────────────────────────────────────────────────────────────

export const hcpProfiles = pgTable(
  "hcp_profiles",
  {
    hcpId: uuid("hcp_id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    specialty: therapyAreaEnum("specialty").notNull(),
    tier: prescriberTierEnum("tier").notNull().default("TIER_3"),
    territory: text("territory").notNull(),
    npi: varchar("npi", { length: 10 }),
    isActive: boolean("is_active").notNull().default(true),
    tenantId: uuid("tenant_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("hcp_profiles_territory_idx").on(t.territory),
    index("hcp_profiles_specialty_idx").on(t.specialty),
    index("hcp_profiles_tier_idx").on(t.tier),
    index("hcp_profiles_tenant_idx").on(t.tenantId),
    uniqueIndex("hcp_profiles_npi_tenant_unique").on(t.npi, t.tenantId),
  ]
);

// ─────────────────────────────────────────────────────────────
// Visit Logs
// ─────────────────────────────────────────────────────────────

export const visitLogs = pgTable(
  "visit_logs",
  {
    visitId: uuid("visit_id").defaultRandom().primaryKey(),
    hcpId: uuid("hcp_id")
      .notNull()
      .references(() => hcpProfiles.hcpId),
    mrId: uuid("mr_id")
      .notNull()
      .references(() => users.id),
    visitDate: date("visit_date", { mode: "date" }).notNull(),
    outcome: visitOutcomeEnum("outcome").notNull().default("COMPLETED"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    tenantId: uuid("tenant_id").notNull(),
  },
  (t) => [
    index("visit_logs_hcp_idx").on(t.hcpId),
    index("visit_logs_mr_idx").on(t.mrId),
    index("visit_logs_date_idx").on(t.visitDate),
    index("visit_logs_tenant_idx").on(t.tenantId),
  ]
);

// ─────────────────────────────────────────────────────────────
// NBA Action Log
// ─────────────────────────────────────────────────────────────

export const nbaActionLog = pgTable(
  "nba_action_log",
  {
    actionId: uuid("action_id").defaultRandom().primaryKey(),
    mrId: uuid("mr_id")
      .notNull()
      .references(() => users.id),
    hcpId: uuid("hcp_id")
      .notNull()
      .references(() => hcpProfiles.hcpId),
    actionType: nbaActionTypeEnum("action_type").notNull(),
    metadata: jsonb("metadata"),
    timestamp: timestamp("timestamp", { mode: "date" }).notNull().defaultNow(),
    tenantId: uuid("tenant_id").notNull(),
  },
  (t) => [
    index("nba_action_log_mr_idx").on(t.mrId),
    index("nba_action_log_hcp_idx").on(t.hcpId),
    index("nba_action_log_timestamp_idx").on(t.timestamp),
    index("nba_action_log_tenant_idx").on(t.tenantId),
  ]
);

// ─────────────────────────────────────────────────────────────
// Offer Catalog
// ─────────────────────────────────────────────────────────────

export const offerCatalog = pgTable(
  "offer_catalog",
  {
    offerId: uuid("offer_id").defaultRandom().primaryKey(),
    type: offerTypeEnum("type").notNull(),
    therapyArea: therapyAreaEnum("therapy_area").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    eligibilityRules: jsonb("eligibility_rules").notNull().default({}),
    assetUrl: text("asset_url"),
    expiryDate: date("expiry_date", { mode: "date" }),
    isActive: boolean("is_active").notNull().default(true),
    tenantId: uuid("tenant_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("offer_catalog_therapy_idx").on(t.therapyArea),
    index("offer_catalog_tenant_idx").on(t.tenantId),
    index("offer_catalog_expiry_idx").on(t.expiryDate),
  ]
);

// ─────────────────────────────────────────────────────────────
// Audit Log (append-only — no UPDATE or DELETE permissions granted)
// ─────────────────────────────────────────────────────────────

export const auditLog = pgTable(
  "audit_log",
  {
    eventId: uuid("event_id").defaultRandom().primaryKey(),
    eventType: auditEventTypeEnum("event_type").notNull(),
    userId: uuid("user_id"),
    resourceId: text("resource_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),
    timestamp: timestamp("timestamp", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_event_type_idx").on(t.eventType),
    index("audit_log_user_idx").on(t.userId),
    index("audit_log_timestamp_idx").on(t.timestamp),
  ]
);

// ─────────────────────────────────────────────────────────────
// NBA Cards (pipeline output cache)
// ─────────────────────────────────────────────────────────────

export const nbaCards = pgTable(
  "nba_cards",
  {
    cardId: uuid("card_id").defaultRandom().primaryKey(),
    mrId: uuid("mr_id")
      .notNull()
      .references(() => users.id),
    hcpId: uuid("hcp_id")
      .notNull()
      .references(() => hcpProfiles.hcpId),
    runId: uuid("run_id"),
    priorityScore: decimal("priority_score", { precision: 5, scale: 2 }).notNull(),
    urgencyLevel: urgencyLevelEnum("urgency_level").notNull(),
    daysSinceLastVisit: integer("days_since_last_visit"),
    summary: text("summary"),
    talkingPoints: jsonb("talking_points").default([]),
    offerId: uuid("offer_id").references(() => offerCatalog.offerId),
    isPartiallyEnriched: boolean("is_partially_enriched").notNull().default(false),
    snoozedUntil: timestamp("snoozed_until", { mode: "date" }),
    isDismissed: boolean("is_dismissed").notNull().default(false),
    generatedAt: timestamp("generated_at", { mode: "date" }).notNull().defaultNow(),
    tenantId: uuid("tenant_id").notNull(),
  },
  (t) => [
    index("nba_cards_mr_idx").on(t.mrId),
    index("nba_cards_hcp_idx").on(t.hcpId),
    index("nba_cards_score_idx").on(t.priorityScore),
    index("nba_cards_urgency_idx").on(t.urgencyLevel),
    index("nba_cards_tenant_idx").on(t.tenantId),
  ]
);

// ─────────────────────────────────────────────────────────────
// Pipeline Runs
// ─────────────────────────────────────────────────────────────

export const pipelineRuns = pgTable(
  "pipeline_runs",
  {
    runId: uuid("run_id").defaultRandom().primaryKey(),
    mrId: uuid("mr_id")
      .notNull()
      .references(() => users.id),
    status: pipelineRunStatusEnum("status").notNull().default("QUEUED"),
    startedAt: timestamp("started_at", { mode: "date" }),
    completedAt: timestamp("completed_at", { mode: "date" }),
    cardsGenerated: integer("cards_generated"),
    errorMessage: text("error_message"),
    stepResults: jsonb("step_results").default({}),
    tenantId: uuid("tenant_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("pipeline_runs_mr_idx").on(t.mrId),
    index("pipeline_runs_status_idx").on(t.status),
    index("pipeline_runs_tenant_idx").on(t.tenantId),
  ]
);

// ─────────────────────────────────────────────────────────────
// MR Feedback
// ─────────────────────────────────────────────────────────────

export const mrFeedback = pgTable(
  "mr_feedback",
  {
    feedbackId: uuid("feedback_id").defaultRandom().primaryKey(),
    mrId: uuid("mr_id")
      .notNull()
      .references(() => users.id),
    hcpId: uuid("hcp_id")
      .notNull()
      .references(() => hcpProfiles.hcpId),
    actionType: nbaActionTypeEnum("action_type").notNull(),
    outcome: text("outcome"),
    weekOf: date("week_of", { mode: "date" }).notNull(),
    tenantId: uuid("tenant_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("mr_feedback_mr_idx").on(t.mrId),
    index("mr_feedback_hcp_idx").on(t.hcpId),
    index("mr_feedback_week_idx").on(t.weekOf),
    index("mr_feedback_tenant_idx").on(t.tenantId),
  ]
);

// ─────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  mrProfile: one(mrProfiles, { fields: [users.id], references: [mrProfiles.mrId] }),
  visitLogs: many(visitLogs),
  nbaActions: many(nbaActionLog),
  nbaCards: many(nbaCards),
  pipelineRuns: many(pipelineRuns),
}));

export const hcpProfilesRelations = relations(hcpProfiles, ({ many }) => ({
  visitLogs: many(visitLogs),
  nbaActions: many(nbaActionLog),
  nbaCards: many(nbaCards),
}));

export const nbaCardsRelations = relations(nbaCards, ({ one }) => ({
  mr: one(users, { fields: [nbaCards.mrId], references: [users.id] }),
  hcp: one(hcpProfiles, { fields: [nbaCards.hcpId], references: [hcpProfiles.hcpId] }),
  offer: one(offerCatalog, { fields: [nbaCards.offerId], references: [offerCatalog.offerId] }),
}));
