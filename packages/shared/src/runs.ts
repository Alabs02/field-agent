import { z } from "zod";
import { ScrapeOptionsSchema } from "./jobs.js";
import { PortalIdSchema } from "./portal.js";
import { IsoDateTime, Uuid } from "./primitives.js";

export const RUN_STATUSES = [
  "queued",
  "running",
  "completed",
  "completed_with_errors",
  "failed",
  "stalled",
  "cancelled",
] as const;
export const RunStatusSchema = z.enum(RUN_STATUSES);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const TERMINAL_RUN_STATUSES: ReadonlySet<RunStatus> = new Set([
  "completed",
  "completed_with_errors",
  "failed",
  "cancelled",
]);
export const isTerminalStatus = (s: RunStatus): boolean => TERMINAL_RUN_STATUSES.has(s);

export const SCRAPE_PHASES = [
  "queued",
  "discover",
  "listing",
  "details",
  "brands",
  "finalize",
  "done",
] as const;
export const ScrapePhaseSchema = z.enum(SCRAPE_PHASES);
export type ScrapePhase = z.infer<typeof ScrapePhaseSchema>;

export const RunErrorSchema = z.object({
  stage: z.string(),
  code: z.string(),
  message: z.string(),
  url: z.string().nullable(),
  sourceId: z.string().nullable(),
  at: IsoDateTime,
});
export type RunError = z.infer<typeof RunErrorSchema>;

/** The five counts the brief asks for. Invariant: attempted = persisted + updated + skipped + failed. */
export const ScrapeCountsSchema = z.object({
  attempted: z.number().int().nonnegative(),
  persisted: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});
export type ScrapeCounts = z.infer<typeof ScrapeCountsSchema>;

export const BrandCountsSchema = z.object({
  attempted: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});
export type BrandCounts = z.infer<typeof BrandCountsSchema>;

/** What `job.updateProgress` carries. */
export const ScrapeProgressSchema = z.object({
  phase: ScrapePhaseSchema,
  pct: z.number().int().min(0).max(100),
  counts: ScrapeCountsSchema,
});
export type ScrapeProgress = z.infer<typeof ScrapeProgressSchema>;

const runBase = {
  id: Uuid,
  portalId: PortalIdSchema,
  jobId: z.string(),
  triggeredBy: z.string().nullable(),
  status: RunStatusSchema,
  attemptsMade: z.number().int().nonnegative(),
  requestsMade: z.number().int().nonnegative(),
  errors: z.array(RunErrorSchema),
  error: z.string().nullable(),
  queuedAt: IsoDateTime,
  startedAt: IsoDateTime.nullable(),
  heartbeatAt: IsoDateTime.nullable(),
  finishedAt: IsoDateTime.nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
};

export const ScrapeRunSchema = z.object({
  ...runBase,
  type: z.literal("scrape"),
  phase: ScrapePhaseSchema,
  progress: z.number().int().min(0).max(100),
  counts: ScrapeCountsSchema,
  brandCounts: BrandCountsSchema,
  options: ScrapeOptionsSchema,
});
export type ScrapeRun = z.infer<typeof ScrapeRunSchema>;

export const VerificationCountsSchema = z.object({
  checked: z.number().int().nonnegative(),
  clean: z.number().int().nonnegative(),
  changed: z.number().int().nonnegative(),
  missingAtSource: z.number().int().nonnegative(),
  unverifiable: z.number().int().nonnegative(),
});
export type VerificationCounts = z.infer<typeof VerificationCountsSchema>;

export const VerificationRunSchema = z.object({
  ...runBase,
  type: z.literal("verify"),
  sampleRate: z.number().min(0).max(1),
  counts: VerificationCountsSchema,
});
export type VerificationRun = z.infer<typeof VerificationRunSchema>;

export const RunListItemSchema = z.discriminatedUnion("type", [ScrapeRunSchema, VerificationRunSchema]);
export type RunListItem = z.infer<typeof RunListItemSchema>;

/** BullMQ's view of the job, merged with the durable DB row. */
export const QueueStateSchema = z.enum([
  "waiting",
  "delayed",
  "prioritized",
  "active",
  "completed",
  "failed",
  "unknown",
]);
export type QueueState = z.infer<typeof QueueStateSchema>;

export const ScrapeJobStatusSchema = ScrapeRunSchema.extend({
  queueState: QueueStateSchema,
  /**
   * Status after reconciling the DB row with the queue: a row that says
   * "running" but whose heartbeat is stale and whose job is not active is
   * reported as "stalled" even before BullMQ's own stall checker fires.
   */
  effectiveStatus: RunStatusSchema,
});
export type ScrapeJobStatus = z.infer<typeof ScrapeJobStatusSchema>;

export const EMPTY_SCRAPE_COUNTS: ScrapeCounts = {
  attempted: 0,
  persisted: 0,
  updated: 0,
  skipped: 0,
  failed: 0,
};
export const EMPTY_BRAND_COUNTS: BrandCounts = { attempted: 0, failed: 0 };
export const EMPTY_VERIFICATION_COUNTS: VerificationCounts = {
  checked: 0,
  clean: 0,
  changed: 0,
  missingAtSource: 0,
  unverifiable: 0,
};
