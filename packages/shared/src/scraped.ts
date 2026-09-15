import { z } from "zod";
import { HoursSchema } from "./hours";
import { CollectionSchema } from "./promotion";
import { HttpUrl, IsoDateTime } from "./primitives";
import { SocialLinksSchema } from "./social";

/**
 * Contracts between the portal adapter and the persistence layer.
 * The adapter's output is parsed with these before anything is written, so a
 * parser regression fails loudly in the run counts instead of poisoning the DB.
 */

export const ScrapedListingRowSchema = z.object({
  sourceId: z.string().min(1),
  title: z.string().min(1),
  brandName: z.string().min(1),
  brandSourceId: z.string().min(1),
  imageUrl: HttpUrl.nullable(),
  /** Excel-style day serial from data-start / data-end on the listing row. */
  startSerial: z.number().nullable(),
  endSerial: z.number().nullable(),
  collection: CollectionSchema,
  detailUrl: HttpUrl,
  /** The "Ends Today" / "Ends 9/20" label, kept for sanity checks only. */
  endsText: z.string().nullable(),
});
export type ScrapedListingRow = z.infer<typeof ScrapedListingRowSchema>;

export const ListingResultSchema = z.object({
  rows: z.array(ScrapedListingRowSchema),
  rowErrors: z.array(z.object({ sourceId: z.string().nullable(), message: z.string() })),
  complete: z.boolean(),
  completenessReasons: z.array(z.string()),
  observedRows: z.number().int().nonnegative(),
});
export type ListingResult = z.infer<typeof ListingResultSchema>;

export const ScrapedPromotionSchema = ScrapedListingRowSchema.extend({
  canonicalUrl: HttpUrl,
  description: z.string().nullable(),
  descriptionHtml: z.string().nullable(),
  startsAt: IsoDateTime.nullable(),
  endsAt: IsoDateTime.nullable(),
  /** Store page URL discovered on the deal page; null if the deal page had no store link. */
  brandStoreUrl: HttpUrl.nullable(),
  /** Raw JSON-LD object (provenance / debugging); null when absent. */
  jsonLd: z.record(z.string(), z.unknown()).nullable(),
});
export type ScrapedPromotion = z.infer<typeof ScrapedPromotionSchema>;

export const ScrapedBrandStubSchema = z.object({
  sourceId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().nullable(),
  sourceUrl: HttpUrl.nullable(),
  categories: z.array(z.string()),
  hasDeals: z.boolean(),
});
export type ScrapedBrandStub = z.infer<typeof ScrapedBrandStubSchema>;

export const ScrapedBrandSchema = z.object({
  sourceId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  sourceUrl: HttpUrl,
  websiteUrl: HttpUrl.nullable(),
  websiteIsRedirect: z.boolean(),
  hours: HoursSchema.nullable(),
  hoursRaw: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  description: z.string().nullable(),
  logoUrl: HttpUrl.nullable(),
  socialLinks: SocialLinksSchema,
});
export type ScrapedBrand = z.infer<typeof ScrapedBrandSchema>;
