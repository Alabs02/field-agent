import * as cheerio from "cheerio";
import type { Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";
import sanitizeHtml from "sanitize-html";
import {
  ScrapedBrandSchema,
  ScrapedPromotionSchema,
  type ScrapedBrand,
  type ScrapedListingRow,
  type ScrapedPromotion,
} from "@field-agent/shared";
import { ParseError } from "../../errors.js";
import { parseJsonLdDate } from "../../dates.js";
import { normalizeText } from "../../normalize.js";
import { safeHttpUrl } from "../../url.js";
import { findByType, str } from "./jsonld.js";
import { parseSocialLinks } from "./socials.js";
import { parseStoreInfoBlock, STORE_URL_RE } from "./store.js";

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "ul", "ol", "li", "strong", "em", "b", "i", "a", "span"],
  allowedAttributes: { a: ["href", "rel", "target"] },
  transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener nofollow", target: "_blank" }) },
};

export interface DealParse {
  promotion: ScrapedPromotion;
  brandFallback: ScrapedBrand | null;
  jsonLdMissing: boolean;
}

/**
 * Deal page: JSON-LD SaleEvent first (name, description, image, dates, url),
 * og:* and DOM as fallbacks. Also lifts the embedded store-info block so a
 * failed store-page fetch still leaves us with hours/website for the brand.
 */
export function parseDealPage(
  html: string,
  pageUrl: string,
  row: ScrapedListingRow,
  canonicalize: (u: string) => string,
): DealParse {
  const $ = cheerio.load(html);
  const ld = findByType($, "SaleEvent") ?? findByType($, "Event") ?? findByType($, "Offer");
  const main: Cheerio<AnyNode> = $("main").length ? $("main") : $.root();

  const descEl = main.find(".deal-detail-description").first();
  const descriptionHtml = descEl.length ? sanitizeHtml(descEl.html() ?? "", SANITIZE).trim() || null : null;
  const description =
    normalizeText(descEl.text()) ??
    normalizeText(str(ld?.["description"])) ??
    normalizeText($('meta[property="og:description"]').attr("content"));

  const title =
    normalizeText(str(ld?.["name"])) ??
    normalizeText(main.find("h1").first().text()) ??
    row.title;

  const imageUrl =
    safeHttpUrl(str(ld?.["image"]), pageUrl) ??
    safeHttpUrl($('meta[property="og:image"]').attr("content"), pageUrl) ??
    safeHttpUrl(main.find("img.image-deal").first().attr("src"), pageUrl) ??
    row.imageUrl;

  const startsAt = parseJsonLdDate(ld?.["startDate"]);
  const endsAt = parseJsonLdDate(ld?.["endDate"]);

  const canonicalUrl = canonicalize(str(ld?.["url"]) ?? $('link[rel="canonical"]').attr("href") ?? pageUrl);

  const storeHref = main.find("a.store-link[href], header a[href*='/stores/']").first().attr("href") ?? null;
  const brandStoreUrl = storeHref ? canonicalize(storeHref) : null;

  const candidate: ScrapedPromotion = {
    ...row,
    title,
    imageUrl,
    canonicalUrl,
    description,
    descriptionHtml,
    startsAt: startsAt ? startsAt.toISOString() : null,
    endsAt: endsAt ? endsAt.toISOString() : null,
    brandStoreUrl,
    jsonLd: ld,
  };
  const parsed = ScrapedPromotionSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new ParseError(
      "parse_error",
      `deal ${row.sourceId}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`,
      pageUrl,
    );
  }

  return {
    promotion: parsed.data,
    brandFallback: brandStoreUrl ? buildBrandFallback($, main, brandStoreUrl, pageUrl) : null,
    jsonLdMissing: ld === null,
  };
}

function buildBrandFallback(
  $: cheerio.CheerioAPI,
  main: Cheerio<AnyNode>,
  storeUrl: string,
  pageUrl: string,
): ScrapedBrand | null {
  const m = STORE_URL_RE.exec(storeUrl);
  const block = main.find(".component-store-info").first();
  if (!m || !block.length) return null;
  const info = parseStoreInfoBlock($, block, pageUrl);
  const name = normalizeText(main.find("a.store-link").first().text()) ?? normalizeText(main.find("header a[title]").attr("title"));
  const candidate: ScrapedBrand = {
    sourceId: m[1]!,
    slug: m[2]!,
    name: name ?? m[2]!,
    sourceUrl: storeUrl,
    websiteUrl: info.websiteUrl,
    websiteIsRedirect: info.websiteIsRedirect,
    hours: info.hours,
    hoursRaw: info.hoursRaw,
    phone: info.phone,
    location: info.location,
    description: null,
    logoUrl: safeHttpUrl(main.find("img.store-logo, img.image-retailer").first().attr("src"), pageUrl),
    socialLinks: parseSocialLinks($, block),
  };
  const parsed = ScrapedBrandSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
