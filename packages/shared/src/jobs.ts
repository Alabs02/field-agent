import { z } from "zod";
import { PortalIdSchema } from "./portal.js";
import { Uuid } from "./primitives.js";

export const ScrapeOptionsSchema = z.object({
  /** Walk into each promotion's detail page (FR-1). Off = listing-level data only. */
  fetchDetails: z.boolean().default(true),
  /** Visit each brand's store page (FR-2). */
  fetchBrands: z.boolean().default(true),
  /** Re-fetch everything even when the sitemap says nothing changed. */
  force: z.boolean().default(false),
  /** Cap the number of listing rows processed; handy for demos and tests. */
  maxItems: z.number().int().positive().optional(),
});
export type ScrapeOptions = z.infer<typeof ScrapeOptionsSchema>;

/** Payload of a BullMQ scrape job. jobId === runId. */
export const ScrapeJobPayloadSchema = z.object({
  portalId: PortalIdSchema,
  runId: Uuid,
  requestedBy: z.string().nullable(),
  options: ScrapeOptionsSchema,
});
export type ScrapeJobPayload = z.infer<typeof ScrapeJobPayloadSchema>;

export const VerifyJobPayloadSchema = z.object({
  portalId: PortalIdSchema,
  runId: Uuid,
  requestedBy: z.string().nullable(),
  /** Share (0..1) of unflagged promotions whose detail page is re-fetched anyway. */
  sampleRate: z.number().min(0).max(1),
  /** Restrict the run to these promotion ids (used by the drift demo and targeted checks). */
  promotionIds: z.array(Uuid).optional(),
});
export type VerifyJobPayload = z.infer<typeof VerifyJobPayloadSchema>;
