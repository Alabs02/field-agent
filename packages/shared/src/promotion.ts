import { z } from "zod";
import { BrandSchema, BrandSummarySchema, BrandWithCountSchema } from "./brand";
import { paginated } from "./pagination";
import { PortalIdSchema } from "./portal";
import { HttpUrl, IsoDateTime, Uuid } from "./primitives";

/** The listing page holds three collections; all are ingested as promotions. */
export const COLLECTIONS = ["deals", "style_notes", "new_arrivals", "other"] as const;
export const CollectionSchema = z.enum(COLLECTIONS);
export type Collection = z.infer<typeof CollectionSchema>;

export const VERIFICATION_OUTCOMES = ["clean", "changed", "missing_at_source", "unverifiable"] as const;
export const VerificationOutcomeSchema = z.enum(VERIFICATION_OUTCOMES);
export type VerificationOutcome = z.infer<typeof VerificationOutcomeSchema>;

/** Which source the stored dates came from. JSON-LD is authoritative; listing serials are the fallback. */
export const DateSourceSchema = z.enum(["jsonld", "listing_serial", "none"]);
export type DateSource = z.infer<typeof DateSourceSchema>;

export const VerificationCoverageSchema = z.enum(["listing", "detail"]);
export type VerificationCoverage = z.infer<typeof VerificationCoverageSchema>;

export const PromotionVerificationSchema = z.object({
  lastVerifiedAt: IsoDateTime.nullable(),
  lastOutcome: VerificationOutcomeSchema.nullable(),
  lastRunId: Uuid.nullable(),
  /** What the last check actually covered: the listing row only, or the detail page. null = never checked. */
  coverage: VerificationCoverageSchema.nullable(),
  /** Field names the last check found different at the source; empty when clean or unchecked. */
  changedFields: z.array(z.string()),
});
export type PromotionVerification = z.infer<typeof PromotionVerificationSchema>;

export const PromotionSchema = z.object({
  id: Uuid,
  portalId: PortalIdSchema,
  /** Placewise deal id from the URL, e.g. "3444509". Stable across scrapes. */
  sourceId: z.string(),
  collection: CollectionSchema,
  title: z.string(),
  /** Plain text: entities decoded, tags stripped, whitespace collapsed. */
  description: z.string().nullable(),
  /** Sanitized HTML for the detail page. */
  descriptionHtml: z.string().nullable(),
  imageUrl: HttpUrl.nullable(),
  startsAt: IsoDateTime.nullable(),
  endsAt: IsoDateTime.nullable(),
  dateSource: DateSourceSchema,
  /** Canonical promotion URL on the source portal. */
  canonicalUrl: HttpUrl,
  brand: BrandSummarySchema,
  firstSeenAt: IsoDateTime,
  lastSeenAt: IsoDateTime,
  scrapedAt: IsoDateTime,
  /** null = the detail page was never fetched successfully (listing-level data only). */
  detailFetchedAt: IsoDateTime.nullable(),
  /** Set when the promotion disappeared from the listing; cleared if it reappears. Never deleted. */
  removedAt: IsoDateTime.nullable(),
  verification: PromotionVerificationSchema,
});
export type Promotion = z.infer<typeof PromotionSchema>;

/** Detail response carries the full brand instead of the summary. */
export const PromotionDetailSchema = PromotionSchema.extend({ brand: BrandSchema });
export type PromotionDetail = z.infer<typeof PromotionDetailSchema>;

export const BrandDetailSchema = BrandWithCountSchema.extend({
  promotions: z.array(PromotionSchema),
});
export type BrandDetail = z.infer<typeof BrandDetailSchema>;

/** A list page plus the count of matching records whose known validity window includes now. */
export const PromotionListSchema = paginated(PromotionSchema).extend({
  withinValidity: z.number().int().nonnegative(),
});
export type PromotionList = z.infer<typeof PromotionListSchema>;

/** One brand with its complete filtered promotion group (see GET /promotions/grouped). */
export const PromotionGroupSchema = z.object({
  brand: BrandWithCountSchema,
  promotions: z.array(PromotionSchema),
});
export type PromotionGroup = z.infer<typeof PromotionGroupSchema>;
