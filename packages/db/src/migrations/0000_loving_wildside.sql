CREATE TYPE "public"."audit_event_type" AS ENUM('HCP_READ', 'HCP_ACTION_TAKEN', 'USER_LOGIN', 'USER_LOGOUT', 'USER_LOGIN_FAILED', 'TOKEN_REFRESH', 'TOKEN_REVOKED', 'DATA_MODE_CHANGED', 'OFFER_CREATED', 'OFFER_UPDATED', 'OFFER_DELETED');--> statement-breakpoint
CREATE TYPE "public"."nba_action_type" AS ENUM('SCHEDULE_VISIT', 'LOG_CALL', 'DISMISS', 'SNOOZE', 'DRAFT_MESSAGE');--> statement-breakpoint
CREATE TYPE "public"."offer_type" AS ENUM('SAMPLE', 'DETAIL_AID', 'REPRINTS', 'CME_INVITE', 'DIGITAL_ASSET');--> statement-breakpoint
CREATE TYPE "public"."pipeline_run_status" AS ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMEOUT', 'PARTIALLY_ENRICHED');--> statement-breakpoint
CREATE TYPE "public"."prescriber_tier" AS ENUM('TIER_1', 'TIER_2', 'TIER_3');--> statement-breakpoint
CREATE TYPE "public"."therapy_area" AS ENUM('CARDIOLOGY', 'ONCOLOGY', 'DIABETOLOGY', 'NEUROLOGY', 'RESPIRATORY');--> statement-breakpoint
CREATE TYPE "public"."urgency_level" AS ENUM('HIGH', 'MEDIUM', 'LOW');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('MR', 'RSM', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."visit_outcome" AS ENUM('COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED', 'CALL_ONLY');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "audit_event_type" NOT NULL,
	"user_id" uuid,
	"resource_id" text,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hcp_profiles" (
	"hcp_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"specialty" "therapy_area" NOT NULL,
	"tier" "prescriber_tier" DEFAULT 'TIER_3' NOT NULL,
	"territory" text NOT NULL,
	"npi" varchar(10),
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mr_feedback" (
	"feedback_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mr_id" uuid NOT NULL,
	"hcp_id" uuid NOT NULL,
	"action_type" "nba_action_type" NOT NULL,
	"outcome" text,
	"week_of" date NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mr_profiles" (
	"mr_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"territory" text NOT NULL,
	"rsm_id" uuid,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nba_action_log" (
	"action_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mr_id" uuid NOT NULL,
	"hcp_id" uuid NOT NULL,
	"action_type" "nba_action_type" NOT NULL,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nba_cards" (
	"card_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mr_id" uuid NOT NULL,
	"hcp_id" uuid NOT NULL,
	"run_id" uuid,
	"priority_score" numeric(5, 2) NOT NULL,
	"urgency_level" "urgency_level" NOT NULL,
	"days_since_last_visit" integer,
	"summary" text,
	"talking_points" jsonb DEFAULT '[]'::jsonb,
	"offer_id" uuid,
	"is_partially_enriched" boolean DEFAULT false NOT NULL,
	"snoozed_until" timestamp,
	"is_dismissed" boolean DEFAULT false NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_catalog" (
	"offer_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "offer_type" NOT NULL,
	"therapy_area" "therapy_area" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"eligibility_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"asset_url" text,
	"expiry_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_runs" (
	"run_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mr_id" uuid NOT NULL,
	"status" "pipeline_run_status" DEFAULT 'QUEUED' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"cards_generated" integer,
	"error_message" text,
	"step_results" jsonb DEFAULT '{}'::jsonb,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"password_hash" text,
	"role" "user_role" DEFAULT 'MR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_logs" (
	"visit_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hcp_id" uuid NOT NULL,
	"mr_id" uuid NOT NULL,
	"visit_date" date NOT NULL,
	"outcome" "visit_outcome" DEFAULT 'COMPLETED' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"tenant_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mr_feedback" ADD CONSTRAINT "mr_feedback_mr_id_users_id_fk" FOREIGN KEY ("mr_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mr_feedback" ADD CONSTRAINT "mr_feedback_hcp_id_hcp_profiles_hcp_id_fk" FOREIGN KEY ("hcp_id") REFERENCES "public"."hcp_profiles"("hcp_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mr_profiles" ADD CONSTRAINT "mr_profiles_mr_id_users_id_fk" FOREIGN KEY ("mr_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mr_profiles" ADD CONSTRAINT "mr_profiles_rsm_id_users_id_fk" FOREIGN KEY ("rsm_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nba_action_log" ADD CONSTRAINT "nba_action_log_mr_id_users_id_fk" FOREIGN KEY ("mr_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nba_action_log" ADD CONSTRAINT "nba_action_log_hcp_id_hcp_profiles_hcp_id_fk" FOREIGN KEY ("hcp_id") REFERENCES "public"."hcp_profiles"("hcp_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nba_cards" ADD CONSTRAINT "nba_cards_mr_id_users_id_fk" FOREIGN KEY ("mr_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nba_cards" ADD CONSTRAINT "nba_cards_hcp_id_hcp_profiles_hcp_id_fk" FOREIGN KEY ("hcp_id") REFERENCES "public"."hcp_profiles"("hcp_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nba_cards" ADD CONSTRAINT "nba_cards_offer_id_offer_catalog_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offer_catalog"("offer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_mr_id_users_id_fk" FOREIGN KEY ("mr_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_logs" ADD CONSTRAINT "visit_logs_hcp_id_hcp_profiles_hcp_id_fk" FOREIGN KEY ("hcp_id") REFERENCES "public"."hcp_profiles"("hcp_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_logs" ADD CONSTRAINT "visit_logs_mr_id_users_id_fk" FOREIGN KEY ("mr_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_unique" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_event_type_idx" ON "audit_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "audit_log_user_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_timestamp_idx" ON "audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "hcp_profiles_territory_idx" ON "hcp_profiles" USING btree ("territory");--> statement-breakpoint
CREATE INDEX "hcp_profiles_specialty_idx" ON "hcp_profiles" USING btree ("specialty");--> statement-breakpoint
CREATE INDEX "hcp_profiles_tier_idx" ON "hcp_profiles" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "hcp_profiles_tenant_idx" ON "hcp_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hcp_profiles_npi_tenant_unique" ON "hcp_profiles" USING btree ("npi","tenant_id");--> statement-breakpoint
CREATE INDEX "mr_feedback_mr_idx" ON "mr_feedback" USING btree ("mr_id");--> statement-breakpoint
CREATE INDEX "mr_feedback_hcp_idx" ON "mr_feedback" USING btree ("hcp_id");--> statement-breakpoint
CREATE INDEX "mr_feedback_week_idx" ON "mr_feedback" USING btree ("week_of");--> statement-breakpoint
CREATE INDEX "mr_feedback_tenant_idx" ON "mr_feedback" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "mr_profiles_rsm_idx" ON "mr_profiles" USING btree ("rsm_id");--> statement-breakpoint
CREATE INDEX "mr_profiles_territory_idx" ON "mr_profiles" USING btree ("territory");--> statement-breakpoint
CREATE INDEX "mr_profiles_tenant_idx" ON "mr_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "nba_action_log_mr_idx" ON "nba_action_log" USING btree ("mr_id");--> statement-breakpoint
CREATE INDEX "nba_action_log_hcp_idx" ON "nba_action_log" USING btree ("hcp_id");--> statement-breakpoint
CREATE INDEX "nba_action_log_timestamp_idx" ON "nba_action_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "nba_action_log_tenant_idx" ON "nba_action_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "nba_cards_mr_idx" ON "nba_cards" USING btree ("mr_id");--> statement-breakpoint
CREATE INDEX "nba_cards_hcp_idx" ON "nba_cards" USING btree ("hcp_id");--> statement-breakpoint
CREATE INDEX "nba_cards_score_idx" ON "nba_cards" USING btree ("priority_score");--> statement-breakpoint
CREATE INDEX "nba_cards_urgency_idx" ON "nba_cards" USING btree ("urgency_level");--> statement-breakpoint
CREATE INDEX "nba_cards_tenant_idx" ON "nba_cards" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "offer_catalog_therapy_idx" ON "offer_catalog" USING btree ("therapy_area");--> statement-breakpoint
CREATE INDEX "offer_catalog_tenant_idx" ON "offer_catalog" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "offer_catalog_expiry_idx" ON "offer_catalog" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "pipeline_runs_mr_idx" ON "pipeline_runs" USING btree ("mr_id");--> statement-breakpoint
CREATE INDEX "pipeline_runs_status_idx" ON "pipeline_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pipeline_runs_tenant_idx" ON "pipeline_runs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_tenant_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_unique" ON "verification_tokens" USING btree ("identifier","token");--> statement-breakpoint
CREATE INDEX "visit_logs_hcp_idx" ON "visit_logs" USING btree ("hcp_id");--> statement-breakpoint
CREATE INDEX "visit_logs_mr_idx" ON "visit_logs" USING btree ("mr_id");--> statement-breakpoint
CREATE INDEX "visit_logs_date_idx" ON "visit_logs" USING btree ("visit_date");--> statement-breakpoint
CREATE INDEX "visit_logs_tenant_idx" ON "visit_logs" USING btree ("tenant_id");