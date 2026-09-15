import { parseAsBoolean, parseAsInteger, parseAsString, parseAsStringLiteral, type inferParserType } from "nuqs/server";
import { COLLECTIONS } from "@field-agent/shared";

/** URL is the state. Shared by the server loader and the client filter bar. */
export const promotionFilterParsers = {
  search: parseAsString.withDefault(""),
  brand: parseAsString.withDefault(""),
  collection: parseAsStringLiteral(["", ...COLLECTIONS] as const).withDefault(""),
  startDate: parseAsString.withDefault(""),
  endDate: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(["endingSoon", "newest", "alpha", "brand"] as const).withDefault("endingSoon"),
  verification: parseAsStringLiteral(["", "clean", "changed", "missing_at_source", "unverifiable", "never"] as const).withDefault(""),
  /** "listed" is the portal's current inventory; "removed" are records the listing no longer carries. */
  presence: parseAsStringLiteral(["", "listed", "removed", "all"] as const).withDefault(""),
  /** Freshness of the last source observation, or "never_detail" for records whose detail page was never fetched. */
  freshness: parseAsStringLiteral(["", "fresh", "stale", "never_detail"] as const).withDefault(""),
  firstSeenFrom: parseAsString.withDefault(""),
  firstSeenTo: parseAsString.withDefault(""),
  endingSoon: parseAsBoolean.withDefault(false),
  attention: parseAsBoolean.withDefault(false),
  view: parseAsStringLiteral(["flat", "table", "brand"] as const).withDefault("flat"),
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(24),
};

export type PromotionFilterState = inferParserType<typeof promotionFilterParsers>;

/** The subset of filter state that changes which records match (not how they are shown). */
export const PROMOTION_FILTER_KEYS = ["search", "brand", "collection", "startDate", "endDate", "verification", "presence", "freshness", "firstSeenFrom", "firstSeenTo", "endingSoon", "attention"] as const;

export function countActiveFilters(q: Pick<PromotionFilterState, (typeof PROMOTION_FILTER_KEYS)[number]>): number {
  return PROMOTION_FILTER_KEYS.filter((k) => (typeof q[k] === "boolean" ? q[k] : q[k] !== "")).length;
}

/** A date-only value from the date picker covers the whole day; anything else is passed through as an instant. */
function toIso(value: string, edge: "start" | "end"): string | undefined {
  if (!value) return undefined;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const ms = Date.parse(dateOnly && edge === "end" ? `${value}T23:59:59.999Z` : dateOnly ? `${value}T00:00:00.000Z` : value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}

/** Query params for GET /promotions built from the URL state; blanks are omitted. */
export function toPromotionsQuery(q: PromotionFilterState) {
  return {
    search: q.search || undefined,
    brand: q.brand || undefined,
    collection: q.collection || undefined,
    startDate: q.startDate || undefined,
    endDate: q.endDate || undefined,
    verification: q.verification || undefined,
    presence: q.presence || undefined,
    freshness: q.freshness || undefined,
    firstSeenFrom: toIso(q.firstSeenFrom, "start"),
    firstSeenTo: toIso(q.firstSeenTo, "end"),
    endingSoon: q.endingSoon || undefined,
    attention: q.attention || undefined,
    sort: q.sort,
    page: q.page,
    pageSize: q.pageSize,
  };
}
