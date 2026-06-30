import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["MR", "RSM", "ADMIN"]);

export const prescriberTierEnum = pgEnum("prescriber_tier", ["TIER_1", "TIER_2", "TIER_3"]);

export const urgencyLevelEnum = pgEnum("urgency_level", ["HIGH", "MEDIUM", "LOW"]);

export const therapyAreaEnum = pgEnum("therapy_area", [
  "CARDIOLOGY",
  "ONCOLOGY",
  "DIABETOLOGY",
  "NEUROLOGY",
  "RESPIRATORY",
]);

export const visitOutcomeEnum = pgEnum("visit_outcome", [
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "RESCHEDULED",
  "CALL_ONLY",
]);

export const nbaActionTypeEnum = pgEnum("nba_action_type", [
  "SCHEDULE_VISIT",
  "LOG_CALL",
  "DISMISS",
  "SNOOZE",
  "DRAFT_MESSAGE",
]);

export const offerTypeEnum = pgEnum("offer_type", [
  "SAMPLE",
  "DETAIL_AID",
  "REPRINTS",
  "CME_INVITE",
  "DIGITAL_ASSET",
]);

export const auditEventTypeEnum = pgEnum("audit_event_type", [
  "HCP_READ",
  "HCP_ACTION_TAKEN",
  "USER_LOGIN",
  "USER_LOGOUT",
  "USER_LOGIN_FAILED",
  "TOKEN_REFRESH",
  "TOKEN_REVOKED",
  "DATA_MODE_CHANGED",
  "OFFER_CREATED",
  "OFFER_UPDATED",
  "OFFER_DELETED",
]);

export const pipelineRunStatusEnum = pgEnum("pipeline_run_status", [
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "TIMEOUT",
  "PARTIALLY_ENRICHED",
]);
