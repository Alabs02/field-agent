import { z } from "zod";

/** ISO-8601 date-time with offset, e.g. 2026-09-14T23:59:59-06:00. Every API timestamp uses this. */
export const IsoDateTime = z.iso.datetime({ offset: true });
export type IsoDateTime = z.infer<typeof IsoDateTime>;

/** Calendar day, e.g. 2026-09-14. Used for query params and day-granularity diffs. */
export const IsoDate = z.iso.date();
export type IsoDate = z.infer<typeof IsoDate>;

export const Uuid = z.uuid();
export type Uuid = z.infer<typeof Uuid>;

/** Absolute http(s) URL. */
export const HttpUrl = z.url({ protocol: /^https?$/ });
export type HttpUrl = z.infer<typeof HttpUrl>;

/**
 * Query-string boolean. Zod's coerce.boolean() turns "false" into true, so
 * stringbool is used everywhere a flag arrives as text.
 */
export const QueryBool = z.stringbool();

/** Non-empty trimmed string; the codebase never stores "" for missing text. */
export const NonEmpty = z.string().trim().min(1);
