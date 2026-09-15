import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { AuditEvent } from "@field-agent/shared";

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(), portalId: text("portal_id").notNull(),
  eventKey: text("event_key").notNull(), action: text("action").notNull(), actor: text("actor").notNull(),
  entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), label: text("label").notNull(),
  runId: uuid("run_id"), severity: text("severity").$type<AuditEvent["severity"]>().notNull().default("info"),
  before: jsonb("before").$type<Record<string, unknown>>(), after: jsonb("after").$type<Record<string, unknown>>(),
  message: text("message").notNull(), href: text("href"), notify: boolean("notify").notNull().default(false),
  // clock_timestamp(): events written in one transaction (cycle started + run launched) still order.
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`clock_timestamp()`),
}, t => [uniqueIndex("audit_event_key_uq").on(t.eventKey), index("audit_portal_time_idx").on(t.portalId, t.createdAt), index("audit_entity_idx").on(t.entityId), index("audit_run_idx").on(t.runId)]);

export const notificationReceipts = pgTable("notification_receipts", {
  id: uuid("id").primaryKey().defaultRandom(), userId: text("user_id").notNull(),
  eventId: uuid("event_id").notNull().references(() => auditEvents.id),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex("notification_receipt_uq").on(t.userId, t.eventId)]);

export const portalSchedules = pgTable("portal_schedules", {
  portalId: text("portal_id").primaryKey(), enabled: boolean("enabled").notNull().default(false),
  intervalHours: integer("interval_hours").notNull().default(24), coverage: text("coverage").$type<"quick" | "full">().notNull().default("quick"),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by").notNull().default("system"), lastStartedAt: timestamp("last_started_at", { withTimezone: true }),
  lastOutcome: text("last_outcome"), activeCycleId: uuid("active_cycle_id"),
  schedulerSynced: boolean("scheduler_synced").notNull().default(false),
});

export const scheduleCycles = pgTable("schedule_cycles", {
  id: uuid("id").primaryKey().defaultRandom(), portalId: text("portal_id").notNull(),
  actor: text("actor").notNull(), coverage: text("coverage").$type<"quick" | "full">().notNull(),
  status: text("status").notNull().default("running"), bootstrap: boolean("bootstrap").notNull(),
  firstRunId: uuid("first_run_id"), secondRunId: uuid("second_run_id"),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(), finishedAt: timestamp("finished_at", { withTimezone: true }),
});
