import { z } from "zod";
import { IsoDateTime, Uuid } from "./primitives";
import { PageQuerySchema } from "./pagination";

export const PeriodQuerySchema = z.object({
  period: z.enum(["24h", "7d", "30d", "custom"]).default("7d"),
  from: IsoDateTime.optional(), to: IsoDateTime.optional(),
}).refine(q => !q.from || !q.to || q.from <= q.to, "from must precede to");
export const AuditQuerySchema = PageQuerySchema.extend({
  search: z.string().optional(), action: z.string().optional(), actor: z.string().optional(),
  entityId: z.string().optional(), runId: Uuid.optional(),
  /** Comma-separated entity types, e.g. "promotions,brands" for data changes only. */
  entityType: z.string().optional(),
  severity: z.enum(["info", "success", "warning", "error"]).optional(),
  from: IsoDateTime.optional(), to: IsoDateTime.optional(),
});
export type AuditQuery = z.infer<typeof AuditQuerySchema>;
export const AuditEventSchema = z.object({
  id: Uuid, portalId: z.string(), eventKey: z.string(), action: z.string(),
  actor: z.string(), entityType: z.string(), entityId: z.string(), label: z.string(),
  runId: Uuid.nullable(), severity: z.enum(["info", "success", "warning", "error"]),
  before: z.record(z.string(), z.unknown()).nullable(), after: z.record(z.string(), z.unknown()).nullable(),
  message: z.string(), href: z.string().nullable(), notify: z.boolean(), createdAt: IsoDateTime,
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export const NotificationSchema = AuditEventSchema.extend({ readAt: IsoDateTime.nullable() });
export const ScheduleInputSchema = z.object({
  enabled: z.boolean(), intervalHours: z.number().int().min(1).max(168),
  coverage: z.enum(["quick", "full"]),
});
export type ScheduleInput = z.infer<typeof ScheduleInputSchema>;
export const ScheduleSchema = ScheduleInputSchema.extend({
  portalId: z.string(), nextRunAt: IsoDateTime.nullable(), updatedAt: IsoDateTime,
  updatedBy: z.string(), lastStartedAt: IsoDateTime.nullable(), lastOutcome: z.string().nullable(),
  activeCycleId: Uuid.nullable(), schedulerSynced: z.boolean(),
});
export const ExportRequestSchema = z.object({
  dataset: z.enum(["promotions", "brands", "runs", "findings", "audit"]),
  format: z.enum(["csv", "json", "print"]),
  filters: z.record(z.string(), z.string()).default({}),
});
export const OperationPolicySchema = z.object({
  canRun: z.boolean(), canAdvanced: z.boolean(), canSchedule: z.boolean(), authRequired: z.boolean(),
  minDelayMs: z.number(), sampleRate: z.number(), reviewerCooldownSeconds: z.number(),
});
export const OverviewSchema = z.object({
  generatedAt: IsoDateTime, from: IsoDateTime, to: IsoDateTime,
  inventory: z.object({ listed: z.number(), endingSoon: z.number(), unknownEnd: z.number(), needsAttention: z.number(),
    listingChecked: z.number(), detailChecked: z.number(), unverified: z.number(),
    brands: z.number(), brandsFetched: z.number(), brandsWithWebsite: z.number(), brandsWithHours: z.number(), brandsWithSocials: z.number() }),
  activity: z.object({ discovered: z.number(), runs: z.number(), requests: z.number(), failed: z.number(), changed: z.number() }),
  expirations: z.array(z.object({ day: z.string(), count: z.number() })),
  brands: z.array(z.object({ name: z.string(), slug: z.string(), count: z.number() })),
  outcomes: z.array(z.object({ day: z.string(), completed: z.number(), partial: z.number(), failed: z.number() })),
  lastScrapeAt: IsoDateTime.nullable(), lastVerifyAt: IsoDateTime.nullable(), auditStartedAt: IsoDateTime.nullable(),
});
