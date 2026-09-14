import { z } from "zod";
import { HoursSchema } from "./hours.js";
import { PortalIdSchema } from "./portal.js";
import { HttpUrl, IsoDateTime, Uuid } from "./primitives.js";
import { SocialLinksSchema } from "./social.js";

/**
 * A brand (store) as served by the API.
 *
 * Missing-data rule, applied everywhere: unknown scalar -> null, unknown list -> [],
 * never "". `storePageFetchedAt === null` means we have not looked at the store page
 * yet, which is different from the portal not listing a value.
 */
export const BrandSchema = z.object({
  id: Uuid,
  portalId: PortalIdSchema,
  /** Placewise store id, e.g. "1035999". Stable across scrapes. */
  sourceId: z.string(),
  /** URL slug from the store page, e.g. "altard-state". */
  slug: z.string(),
  name: z.string(),
  /** Canonical store page on the portal. */
  sourceUrl: HttpUrl,
  /** The brand's own site. May be an affiliate redirect; see websiteIsRedirect. */
  websiteUrl: HttpUrl.nullable(),
  /** True when websiteUrl points at a known affiliate/redirect host (kept as-is, never followed). */
  websiteIsRedirect: z.boolean(),
  hours: HoursSchema.nullable(),
  hoursRaw: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  description: z.string().nullable(),
  logoUrl: HttpUrl.nullable(),
  categories: z.array(z.string()),
  socialLinks: SocialLinksSchema,
  storePageFetchedAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Brand = z.infer<typeof BrandSchema>;

/** What a promotion carries about its brand in list responses. */
export const BrandSummarySchema = BrandSchema.pick({
  id: true,
  name: true,
  slug: true,
  sourceId: true,
  websiteUrl: true,
  logoUrl: true,
});
export type BrandSummary = z.infer<typeof BrandSummarySchema>;

export const BrandWithCountSchema = BrandSchema.extend({
  /** Count of currently listed (non-removed) promotions. */
  promotionCount: z.number().int().nonnegative(),
});
export type BrandWithCount = z.infer<typeof BrandWithCountSchema>;
