import * as cheerio from "cheerio";
import { ScrapedBrandStubSchema, type ScrapedBrandStub } from "@field-agent/shared";
import { humanizeSlug, normalizeText } from "../../normalize.js";

const CAT_PREFIX = "js-cat-";
const NON_CATEGORY = new Set(["now-open"]);

/**
 * The directory grid: one `.card[data-store-id]` per store with category
 * classes. Cards are JS-clickable, so store URLs are resolved from the
 * page's anchors instead of the card itself.
 */
export function parseDirectory(html: string, canonicalize: (u: string) => string): ScrapedBrandStub[] {
  const $ = cheerio.load(html);
  const urlById = new Map<string, string>();
  $("a[href*='/stores/']").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    const m = /\/stores\/(\d+)-/.exec(href);
    if (m && !urlById.has(m[1]!)) urlById.set(m[1]!, canonicalize(href));
  });

  const out: ScrapedBrandStub[] = [];
  $(".card[data-store-id]").each((_, el) => {
    const card = $(el);
    const sourceId = card.attr("data-store-id")?.trim();
    if (!sourceId) return;
    const name = normalizeText(card.find("img.store-logo").attr("alt")) ?? normalizeText(card.find(".store-name, .name").text());
    const classes = (card.attr("class") ?? "").split(/\s+/);
    const categories = classes
      .filter((c) => c.startsWith(CAT_PREFIX))
      .map((c) => c.slice(CAT_PREFIX.length))
      .filter((c) => !NON_CATEGORY.has(c))
      .map(humanizeSlug);
    const sourceUrl = urlById.get(sourceId) ?? null;
    const slug = sourceUrl ? (/\/stores\/\d+-([^/]+)\//.exec(sourceUrl)?.[1] ?? null) : null;
    const parsed = ScrapedBrandStubSchema.safeParse({
      sourceId,
      name: name ?? slug ?? sourceId,
      slug,
      sourceUrl,
      categories,
      hasDeals: classes.includes("store-has-deals"),
    });
    if (parsed.success) out.push(parsed.data);
  });
  return out;
}
