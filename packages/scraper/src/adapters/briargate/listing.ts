import * as cheerio from "cheerio";
import { ScrapedListingRowSchema, type Collection, type ListingResult, type ScrapedListingRow } from "@field-agent/shared";
import { ParseError } from "../../errors.js";
import { normalizeText } from "../../normalize.js";
import { safeHttpUrl } from "../../url.js";

/** Placewise collection ids on this portal; anything else is "other". */
export const COLLECTION_IDS: Record<string, Collection> = {
  "1013480": "deals",
  "1013483": "style_notes",
  "1013481": "new_arrivals",
};

const DEAL_ID_RE = /\/deals\/(\d+)\/?/;

export function parseListing(html: string, canonicalize: (u: string) => string, pageUrl: string): ListingResult {
  const $ = cheerio.load(html);
  const rows: ScrapedListingRow[] = [];
  const problems: string[] = [];
  const rowErrors: ListingResult["rowErrors"] = [];
  const seen = new Set<string>();
  const reject = (sourceId: string | null, message: string) => {
    problems.push(message);
    rowErrors.push({ sourceId, message });
  };

  $(".deal-row").each((_, el) => {
    const row = $(el);
    const href = row.find("a[href]").first().attr("href") ?? "";
    const idMatch = DEAL_ID_RE.exec(href);
    if (!idMatch) {
      reject(null, `deal-row without /deals/{id}/ link (href=${href})`);
      return;
    }
    const sourceId = idMatch[1]!;
    const title = normalizeText(row.find(".deal-meta .major").first().text()) ?? normalizeText(row.find("img").attr("alt"));
    const brandName = normalizeText(row.find(".deal-meta .minor").not(".motice").last().text());
    const brandSourceId = normalizeText(row.attr("data-store-id"));
    const collectionId = row.attr("data-collection-id") ?? "";
    const startSerial = toNumber(row.attr("data-start"));
    const endSerial = toNumber(row.attr("data-end"));
    const imageUrl = safeHttpUrl(row.find("img").attr("src"), pageUrl);
    const endsText = normalizeText(row.find(".motice").first().text());

    const candidate = {
      sourceId,
      title,
      brandName,
      brandSourceId,
      imageUrl,
      startSerial,
      endSerial,
      collection: COLLECTION_IDS[collectionId] ?? "other",
      detailUrl: canonicalize(href),
      endsText,
    };
    const parsed = ScrapedListingRowSchema.safeParse(candidate);
    if (!parsed.success) {
      reject(sourceId, `row ${sourceId}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
      return;
    }
    if (seen.has(sourceId)) {
      reject(sourceId, `duplicate listing identity ${sourceId}`);
      return;
    }
    seen.add(sourceId);
    rows.push(parsed.data);
  });

  if (rows.length === 0) {
    // A 200 with zero rows is the "quietly returned nothing" case; fail loudly.
    throw new ParseError(
      "listing_empty",
      problems.length ? `listing parsed 0 rows: ${problems.slice(0, 3).join(" | ")}` : "listing page contained no .deal-row elements",
      pageUrl,
    );
  }
  const completenessReasons = rowErrors.length ? ["Some listing rows were rejected"] : [];
  // This portal currently publishes its complete catalog in one document.
  // A new pagination mechanism must be implemented before removals are safe.
  if ($('a[rel="next"], link[rel="next"], [data-next-page], [data-infinite-scroll]').length) {
    completenessReasons.push("Unsupported source pagination detected");
  }
  return { rows, rowErrors, complete: completenessReasons.length === 0, completenessReasons, observedRows: $(".deal-row").length };
}

function toNumber(v: string | undefined): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
