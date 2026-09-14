import { isValid, parse } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);

/**
 * The listing rows carry Excel-style day serials (days since 1899-12-30).
 * Only the day part is trustworthy: the fractional part does not line up with
 * the JSON-LD times on the same promotions (see ASSUMPTIONS.md), so the
 * fallback interprets a serial as a whole day in the portal's timezone.
 */
export function excelSerialToDay(serial: number): { y: number; m: number; d: number } {
  const wall = new Date(EXCEL_EPOCH_UTC_MS + Math.floor(serial) * 86_400_000);
  return { y: wall.getUTCFullYear(), m: wall.getUTCMonth() + 1, d: wall.getUTCDate() };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Start of the serial's day in `tz`, as an instant. */
export function excelSerialToStartOfDay(serial: number, tz: string): Date {
  const { y, m, d } = excelSerialToDay(serial);
  return fromZonedTime(`${y}-${pad(m)}-${pad(d)}T00:00:00`, tz);
}

/** End of the serial's day (23:59:59) in `tz`, as an instant. */
export function excelSerialToEndOfDay(serial: number, tz: string): Date {
  const { y, m, d } = excelSerialToDay(serial);
  return fromZonedTime(`${y}-${pad(m)}-${pad(d)}T23:59:59`, tz);
}

/**
 * Placewise JSON-LD dates look like "September, 14 2026 23:59:59 -0600".
 * Try that exact shape first, then let the platform parser have a go.
 */
export function parseJsonLdDate(input: unknown): Date | null {
  if (typeof input !== "string" || !input.trim()) return null;
  const s = input.trim();
  const strict = parse(s, "MMMM, d yyyy HH:mm:ss xx", new Date(0));
  if (isValid(strict)) return strict;
  const loose = new Date(s);
  return isValid(loose) ? loose : null;
}

/** Calendar day of an instant in `tz`, e.g. "2026-09-14". */
export function dayInZone(date: Date | null | undefined, tz: string): string | null {
  if (!date) return null;
  return formatInTimeZone(date, tz, "yyyy-MM-dd");
}

export function parseIsoDateTime(input: unknown): Date | null {
  if (typeof input !== "string") return null;
  const d = new Date(input);
  return isValid(d) ? d : null;
}
