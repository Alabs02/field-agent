import { z } from "zod";
import { ScrapeOptionsSchema } from "./jobs";
import { PageQuerySchema } from "./pagination";
import { IsoDate, NonEmpty, QueryBool, Uuid } from "./primitives";
import { CollectionSchema, VerificationOutcomeSchema } from "./promotion";

export const PromotionSortSchema = z.enum(["endingSoon", "newest", "alpha", "brand"]);
export type PromotionSort = z.infer<typeof PromotionSortSchema>;

/** GET /promotions query. The brief's six params plus a few the UI earns. */
export const PromotionsQuerySchema = PageQuerySchema.extend({
  /** Case-insensitive match across promotion title and brand name. */
  search: NonEmpty.optional(),
  /** Overlap filter: promotions still running on/after this day (Denver). */
  startDate: IsoDate.optional(),
  /** Overlap filter: promotions that started on/before this day (Denver). */
  endDate: IsoDate.optional(),
  /** Brand id (uuid), slug, or name. */
  brand: NonEmpty.optional(),
  sort: PromotionSortSchema.default("endingSoon"),
  collection: CollectionSchema.optional(),
  category: NonEmpty.optional(),
  /** Filter by last verification outcome; "never" = never verified. */
  verification: z.union([VerificationOutcomeSchema, z.literal("never")]).optional(),
  includeRemoved: QueryBool.default(false),
}).refine((q) => !(q.startDate && q.endDate) || q.startDate <= q.endDate, {
  message: "startDate must be on or before endDate",
  path: ["startDate"],
});
export type PromotionsQuery = z.infer<typeof PromotionsQuerySchema>;
export type PromotionsQueryInput = z.input<typeof PromotionsQuerySchema>;

export const BrandsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  search: NonEmpty.optional(),
  hasPromotions: QueryBool.default(false),
  sort: z.enum(["promotions", "alpha"]).default("promotions"),
});
export type BrandsQuery = z.infer<typeof BrandsQuerySchema>;

export const RunsQuerySchema = PageQuerySchema.extend({
  type: z.enum(["scrape", "verify"]).optional(),
});
export type RunsQuery = z.infer<typeof RunsQuerySchema>;

export const ScrapeRequestSchema = ScrapeOptionsSchema.partial();
export type ScrapeRequest = z.infer<typeof ScrapeRequestSchema>;

export const VerifyRequestSchema = z.object({
  sampleRate: z.number().min(0).max(1).optional(),
  promotionIds: z.array(Uuid).optional(),
});
export type VerifyRequest = z.infer<typeof VerifyRequestSchema>;

export const EnqueueResponseSchema = z.object({
  jobId: Uuid,
  runId: Uuid,
  /** True when an identical run was already queued/running and was returned instead of a new one. */
  reused: z.boolean(),
  statusUrl: z.string(),
});
export type EnqueueResponse = z.infer<typeof EnqueueResponseSchema>;

export const HealthSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  checks: z.object({ db: z.boolean(), redis: z.boolean() }),
  version: z.string(),
  uptimeSec: z.number().nonnegative(),
  authRequired: z.boolean(),
});
export type Health = z.infer<typeof HealthSchema>;

export const IdParamsSchema = z.object({ id: Uuid });
export const JobIdParamsSchema = z.object({ jobId: Uuid });
export const RunIdParamsSchema = z.object({ runId: Uuid });
export const BrandRefParamsSchema = z.object({ ref: NonEmpty });
