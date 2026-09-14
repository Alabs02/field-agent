import { z } from "zod";
import { VerificationOutcomeSchema } from "./promotion";
import { IsoDateTime, Uuid } from "./primitives";
import { RunStatusSchema, VerificationCountsSchema } from "./runs";

/** Fields the verifier compares. Anything not listed is below the discrepancy line. */
export const FIELD_NAMES = [
  "title",
  "description",
  "imageUrl",
  "startsOn",
  "endsOn",
  "brand",
  "collection",
  "listed",
] as const;
export const FieldNameSchema = z.enum(FIELD_NAMES);
export type FieldName = z.infer<typeof FieldNameSchema>;

const ComparableValue = z.union([z.string(), z.boolean(), z.null()]);

export const FieldChangeSchema = z.object({
  field: FieldNameSchema,
  before: ComparableValue,
  after: ComparableValue,
  /** Long values (description) are truncated in the report; the flag says so. */
  truncated: z.boolean().optional(),
});
export type FieldChange = z.infer<typeof FieldChangeSchema>;

export const FindingEvidenceSchema = z.object({
  inSitemap: z.boolean(),
  inListing: z.boolean(),
  /** How the verdict was reached: from the listing alone, or by re-fetching the detail page. */
  checkedVia: z.enum(["listing", "detail"]),
  detailStatus: z.number().int().nullable(),
  url: z.string(),
  /** Listing-level differences that triggered a detail fetch (informational). */
  listingFlags: z.array(FieldNameSchema).optional(),
});
export type FindingEvidence = z.infer<typeof FindingEvidenceSchema>;

export const FindingSchema = z.object({
  id: Uuid,
  kind: VerificationOutcomeSchema,
  promotion: z.object({
    id: Uuid,
    sourceId: z.string(),
    title: z.string(),
    canonicalUrl: z.string(),
    brandName: z.string(),
  }),
  /** Empty for clean / missing / unverifiable. */
  fieldChanges: z.array(FieldChangeSchema),
  /** Why a record could not be verified, e.g. "http_503", "robots_disallowed", "fetch_timeout". */
  reason: z.string().nullable(),
  evidence: FindingEvidenceSchema,
  createdAt: IsoDateTime,
});
export type Finding = z.infer<typeof FindingSchema>;

export const VerificationSummarySchema = VerificationCountsSchema.extend({
  requestsMade: z.number().int().nonnegative(),
  sampleRate: z.number().min(0).max(1),
});
export type VerificationSummary = z.infer<typeof VerificationSummarySchema>;

/**
 * `clean` requires checked > 0. A run over zero promotions reports
 * `nothing_to_verify`, never a clean bill of health.
 */
export const VerificationResultSchema = z.enum([
  "clean",
  "discrepancies",
  "nothing_to_verify",
  "failed",
  "in_progress",
]);
export type VerificationResult = z.infer<typeof VerificationResultSchema>;

export const VerificationReportSchema = z.object({
  runId: Uuid,
  status: RunStatusSchema,
  result: VerificationResultSchema,
  clean: z.boolean(),
  summary: VerificationSummarySchema,
  findings: z.array(FindingSchema),
  error: z.string().nullable(),
  startedAt: IsoDateTime.nullable(),
  finishedAt: IsoDateTime.nullable(),
  generatedAt: IsoDateTime,
});
export type VerificationReport = z.infer<typeof VerificationReportSchema>;
