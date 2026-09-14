import { z } from "zod";

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const DayKeySchema = z.enum(DAY_KEYS);
export type DayKey = z.infer<typeof DayKeySchema>;

/** 24-hour wall-clock time in the portal's timezone, e.g. "10:00" or "20:00". */
export const TimeHHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM");
export type TimeHHMM = z.infer<typeof TimeHHMM>;

export const DayHoursSchema = z.object({ open: TimeHHMM, close: TimeHHMM });
export type DayHours = z.infer<typeof DayHoursSchema>;

/**
 * Structured opening hours. A day is `null` when the store is closed that day.
 * The whole object is `null` on the brand when the portal's hours block could
 * not be parsed; the raw text is kept alongside in `hoursRaw` so nothing is lost.
 */
export const HoursSchema = z.object({
  mon: DayHoursSchema.nullable(),
  tue: DayHoursSchema.nullable(),
  wed: DayHoursSchema.nullable(),
  thu: DayHoursSchema.nullable(),
  fri: DayHoursSchema.nullable(),
  sat: DayHoursSchema.nullable(),
  sun: DayHoursSchema.nullable(),
});
export type Hours = z.infer<typeof HoursSchema>;
