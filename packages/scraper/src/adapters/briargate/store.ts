import * as cheerio from "cheerio";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import { ScrapedBrandSchema, type ScrapedBrand } from "@field-agent/shared";
import { ParseError } from "../../errors.js";
import { normalizeText } from "../../normalize.js";
import { isAffiliateUrl, safeHttpUrl } from "../../url.js";
import { parseHours } from "./hours.js";
import { findByType, str } from "./jsonld.js";
import { parseSocialLinks } from "./socials.js";

export const STORE_URL_RE = /\/stores\/(\d+)-([^/?#]+)\/?/;

export interface StoreInfoBlock {
  websiteUrl: string | null;
  websiteIsRedirect: boolean;
  hours: ScrapedBrand["hours"];
  hoursRaw: string | null;
  phone: string | null;
  location: string | null;
}

/** Shared between the store page and the deal page (which embeds the same block). */
export function parseStoreInfoBlock($: CheerioAPI, block: Cheerio<AnyNode>, pageUrl: string): StoreInfoBlock {
  const { hours, hoursRaw } = parseHours($, block);
  const websiteUrl = safeHttpUrl(block.find(".link-item a[href], a.external_link.ext_retailer").first().attr("href"), pageUrl);
  const phone = normalizeText(block.find(".phone-item a[href^='tel:']").first().text());
  const locationDd = block.find(".location-item dd").first().clone();
  locationDd.find("a").remove();
  const location = normalizeText(locationDd.text());
  return {
    websiteUrl,
    websiteIsRedirect: isAffiliateUrl(websiteUrl),
    hours,
    hoursRaw,
    phone,
    location,
  };
}

export function parseStorePage(html: string, pageUrl: string): ScrapedBrand {
  const $ = cheerio.load(html);
  const m = STORE_URL_RE.exec(pageUrl);
  if (!m) throw new ParseError("parse_error", `store url has no /stores/{id}-{slug}/: ${pageUrl}`, pageUrl);
  const sourceId = m[1]!;
  const slug = m[2]!;

  const ld = findByType($, "Store") ?? findByType($, "LocalBusiness");
  const main: Cheerio<AnyNode> = $("main").length ? $("main") : $.root();
  const name =
    normalizeText(str(ld?.["name"])) ??
    normalizeText(main.find("h1").first().text()) ??
    normalizeText($("title").text()?.split("::").pop());
  const description = normalizeText(str(ld?.["description"])) ?? normalizeText(main.find(".store-description, .wysiwyg").first().text());
  const info = parseStoreInfoBlock($, main.find(".component-store-info").first(), pageUrl);
  const logoUrl = safeHttpUrl(main.find("img.store-logo, img.image-retailer").first().attr("src"), pageUrl);
  const phone = info.phone ?? normalizeText(str(ld?.["telephone"]));

  const candidate: ScrapedBrand = {
    sourceId,
    slug,
    name: name ?? slug,
    sourceUrl: pageUrl,
    websiteUrl: info.websiteUrl,
    websiteIsRedirect: info.websiteIsRedirect,
    hours: info.hours,
    hoursRaw: info.hoursRaw,
    phone,
    location: info.location,
    description,
    logoUrl,
    socialLinks: parseSocialLinks($, main),
  };
  const parsed = ScrapedBrandSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new ParseError("parse_error", `store ${sourceId}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`, pageUrl);
  }
  return parsed.data;
}
