import { index, integer, jsonb, pgTable, real, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { RunError, ScrapeOptions } from "@field-agent/shared";
import { runStatusEnum, scrapePhaseEnum } from "./enums.js";
import { portals } from "./portals.js";

/**
 * The durable record of a scrape job. `id` doubles as the BullMQ job id, so
 * POST /scrape -> GET /scrape/:jobId -> this row is one identifier. Counts,
 * phase, errors, and heartbeat live here so the API can answer even when
 * Redis was flushed or no worker is alive.
 *
 * Invariant: attempted = persisted + updated + skipped + failed.
 */
export const scrapeRuns = pgTable(
  "scrape_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portalId: text("portal_id")
      .notNull()
      .references(() => portals.id),
    triggeredBy: text("triggered_by"),
    status: runStatusEnum("status").notNull().default("queued"),
    phase: scrapePhaseEnum("phase").notNull().default("queued"),
    progress: smallint("progress").notNull().default(0),
    attemptsMade: smallint("attempts_made").notNull().default(0),
    attempted: integer("attempted").notNull().default(0),
    persisted: integer("persisted").notNull().default(0),
    updated: integer("updated").notNull().default(0),
    skipped: integer("skipped").notNull().default(0),
    failed: integer("failed").notNull().default(0),
    brandsAttempted: integer("brands_attempted").notNull().default(0),
    brandsFailed: integer("brands_failed").notNull().default(0),
    /** Politeness evidence: every HTTP request the run made against the portal. */
    requestsMade: integer("requests_made").notNull().default(0),
    errors: jsonb("errors").$type<RunError[]>().notNull().default([]),
    error: text("error"),
    options: jsonb("options").$type<ScrapeOptions>().notNull(),
    queuedAt: timestamp("queued_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    index("scrape_runs_portal_queued_idx").on(t.portalId, t.queuedAt),
    index("scrape_runs_status_idx").on(t.status),
  ],
);

export const verificationRuns = pgTable(
  "verification_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portalId: text("portal_id")
      .notNull()
      .references(() => portals.id),
    triggeredBy: text("triggered_by"),
    status: runStatusEnum("status").notNull().default("queued"),
    attemptsMade: smallint("attempts_made").notNull().default(0),
    sampleRate: real("sample_rate").notNull(),
    checked: integer("checked").notNull().default(0),
    clean: integer("clean").notNull().default(0),
    changed: integer("changed").notNull().default(0),
    missing: integer("missing").notNull().default(0),
    unverifiable: integer("unverifiable").notNull().default(0),
    requestsMade: integer("requests_made").notNull().default(0),
    errors: jsonb("errors").$type<RunError[]>().notNull().default([]),
    error: text("error"),
    options: jsonb("options").$type<{ promotionIds?: string[] }>().notNull().default({}),
    queuedAt: timestamp("queued_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    index("verification_runs_portal_queued_idx").on(t.portalId, t.queuedAt),
    index("verification_runs_status_idx").on(t.status),
  ],
);
