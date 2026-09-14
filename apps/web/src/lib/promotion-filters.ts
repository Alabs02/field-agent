import { parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server";
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
  view: parseAsStringLiteral(["flat", "brand"] as const).withDefault("flat"),
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(24),
};
