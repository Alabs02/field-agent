CREATE TYPE "public"."date_source" AS ENUM('jsonld', 'listing_serial', 'none');--> statement-breakpoint
CREATE TYPE "public"."promotion_collection" AS ENUM('deals', 'style_notes', 'new_arrivals', 'other');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('queued', 'running', 'completed', 'completed_with_errors', 'failed', 'stalled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."scrape_phase" AS ENUM('queued', 'discover', 'listing', 'details', 'brands', 'finalize', 'done');--> statement-breakpoint
CREATE TYPE "public"."snapshot_kind" AS ENUM('robots', 'sitemap', 'listing', 'directory', 'deal', 'store');--> statement-breakpoint
CREATE TYPE "public"."verification_outcome" AS ENUM('clean', 'changed', 'missing_at_source', 'unverifiable');--> statement-breakpoint
CREATE TABLE "portals" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"base_url" text NOT NULL,
	"timezone" text DEFAULT 'America/Denver' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portal_id" text NOT NULL,
	"source_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"source_url" text NOT NULL,
	"website_url" text,
	"website_is_redirect" boolean DEFAULT false NOT NULL,
	"hours" jsonb,
	"hours_raw" text,
	"phone" text,
	"location" text,
	"description" text,
	"logo_url" text,
	"categories" text[] DEFAULT '{}' NOT NULL,
	"social_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content_hash" text,
	"store_page_fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portal_id" text NOT NULL,
	"brand_id" uuid NOT NULL,
	"source_id" text NOT NULL,
	"previous_source_ids" text[] DEFAULT '{}' NOT NULL,
	"fingerprint" text NOT NULL,
	"collection" "promotion_collection" DEFAULT 'other' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"description_html" text,
	"image_url" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"date_source" date_source DEFAULT 'none' NOT NULL,
	"canonical_url" text NOT NULL,
	"source_payload" jsonb,
	"content_hash" text NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"scraped_at" timestamp with time zone NOT NULL,
	"detail_fetched_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"last_scrape_run_id" uuid,
	"last_verified_at" timestamp with time zone,
	"last_verification_outcome" "verification_outcome",
	"last_verification_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrape_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portal_id" text NOT NULL,
	"triggered_by" text,
	"status" "run_status" DEFAULT 'queued' NOT NULL,
	"phase" "scrape_phase" DEFAULT 'queued' NOT NULL,
	"progress" smallint DEFAULT 0 NOT NULL,
	"attempts_made" smallint DEFAULT 0 NOT NULL,
	"attempted" integer DEFAULT 0 NOT NULL,
	"persisted" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"skipped" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"brands_attempted" integer DEFAULT 0 NOT NULL,
	"brands_failed" integer DEFAULT 0 NOT NULL,
	"requests_made" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"options" jsonb NOT NULL,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"heartbeat_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verification_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portal_id" text NOT NULL,
	"triggered_by" text,
	"status" "run_status" DEFAULT 'queued' NOT NULL,
	"attempts_made" smallint DEFAULT 0 NOT NULL,
	"sample_rate" real NOT NULL,
	"checked" integer DEFAULT 0 NOT NULL,
	"clean" integer DEFAULT 0 NOT NULL,
	"changed" integer DEFAULT 0 NOT NULL,
	"missing" integer DEFAULT 0 NOT NULL,
	"unverifiable" integer DEFAULT 0 NOT NULL,
	"requests_made" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"heartbeat_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verification_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"promotion_id" uuid NOT NULL,
	"kind" "verification_outcome" NOT NULL,
	"field_changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reason" text,
	"evidence" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "html_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portal_id" text NOT NULL,
	"run_id" uuid,
	"kind" "snapshot_kind" NOT NULL,
	"url" text NOT NULL,
	"final_url" text NOT NULL,
	"http_status" integer NOT NULL,
	"sha256" text NOT NULL,
	"etag" text,
	"last_modified" text,
	"body" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_last_scrape_run_id_scrape_runs_id_fk" FOREIGN KEY ("last_scrape_run_id") REFERENCES "public"."scrape_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_last_verification_run_id_verification_runs_id_fk" FOREIGN KEY ("last_verification_run_id") REFERENCES "public"."verification_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_runs" ADD CONSTRAINT "verification_runs_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_findings" ADD CONSTRAINT "verification_findings_run_id_verification_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."verification_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_findings" ADD CONSTRAINT "verification_findings_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "html_snapshots" ADD CONSTRAINT "html_snapshots_portal_id_portals_id_fk" FOREIGN KEY ("portal_id") REFERENCES "public"."portals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brands_portal_source_uq" ON "brands" USING btree ("portal_id","source_id");--> statement-breakpoint
CREATE INDEX "brands_portal_name_idx" ON "brands" USING btree ("portal_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "promotions_portal_source_uq" ON "promotions" USING btree ("portal_id","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "promotions_portal_canonical_uq" ON "promotions" USING btree ("portal_id","canonical_url");--> statement-breakpoint
CREATE INDEX "promotions_brand_idx" ON "promotions" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "promotions_active_ends_idx" ON "promotions" USING btree ("portal_id","removed_at","ends_at");--> statement-breakpoint
CREATE INDEX "promotions_fingerprint_idx" ON "promotions" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "scrape_runs_portal_queued_idx" ON "scrape_runs" USING btree ("portal_id","queued_at");--> statement-breakpoint
CREATE INDEX "scrape_runs_status_idx" ON "scrape_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "verification_runs_portal_queued_idx" ON "verification_runs" USING btree ("portal_id","queued_at");--> statement-breakpoint
CREATE INDEX "verification_runs_status_idx" ON "verification_runs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_findings_run_promotion_uq" ON "verification_findings" USING btree ("run_id","promotion_id");--> statement-breakpoint
CREATE INDEX "verification_findings_promotion_idx" ON "verification_findings" USING btree ("promotion_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "html_snapshots_url_sha_uq" ON "html_snapshots" USING btree ("url","sha256");--> statement-breakpoint
CREATE INDEX "html_snapshots_url_fetched_idx" ON "html_snapshots" USING btree ("url","fetched_at");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");