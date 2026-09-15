import { differenceInCalendarDays, formatDistanceToNowStrict } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import type { DayKey, Hours } from "@field-agent/shared";

export const PORTAL_TZ = "America/Denver";

export function fmtDay(iso: string | null, tz = PORTAL_TZ): string {
  if (!iso) return "Not available";
  return formatInTimeZone(new Date(iso), tz, "MMM d");
}

export function fmtDayLong(iso: string | null, tz = PORTAL_TZ): string {
  if (!iso) return "Not available";
  return formatInTimeZone(new Date(iso), tz, "EEE, MMM d, yyyy");
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return "Not available";
  return formatInTimeZone(new Date(iso), PORTAL_TZ, "MMM d, HH:mm");
}

export function relative(iso: string | null): string {
  if (!iso) return "never";
  return `${formatDistanceToNowStrict(new Date(iso))} ago`;
}

/** "Ends today", "Ends tomorrow", "Ends in 5 days", "Ended 2 days ago", or the date. */
export function endsLabel(endsAt: string | null, tz = PORTAL_TZ, now = new Date()): { text: string; tone: "urgent" | "soon" | "normal" | "past" | "none" } {
  if (!endsAt) return { text: "No end date", tone: "none" };
  const end = toZonedTime(new Date(endsAt), tz);
  const today = toZonedTime(now, tz);
  const days = differenceInCalendarDays(end, today);
  if (days < 0) return { text: `Ended ${fmtDay(endsAt, tz)}`, tone: "past" };
  if (days === 0) return { text: "Ends today", tone: "urgent" };
  if (days === 1) return { text: "Ends tomorrow", tone: "urgent" };
  if (days <= 7) return { text: `Ends in ${days} days`, tone: "soon" };
  return { text: `Ends ${fmtDay(endsAt, tz)}`, tone: "normal" };
}

const DAY_LABEL: Record<DayKey, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

function fmt12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const hour = h! % 12 === 0 ? 12 : h! % 12;
  const ap = h! < 12 ? "AM" : "PM";
  return m ? `${hour}:${String(m).padStart(2, "0")} ${ap}` : `${hour} ${ap}`;
}

/** Collapse consecutive identical days: "Mon–Sat 10 AM–8 PM · Sun 11 AM–6 PM". */
export function summarizeHours(hours: Hours | null): string | null {
  if (!hours) return null;
  const keys: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const groups: { from: DayKey; to: DayKey; slot: string }[] = [];
  for (const k of keys) {
    const v = hours[k];
    const slot = v ? `${fmt12(v.open)}–${fmt12(v.close)}` : "Closed";
    const last = groups[groups.length - 1];
    if (last && last.slot === slot) last.to = k;
    else groups.push({ from: k, to: k, slot });
  }
  return groups.map((g) => `${g.from === g.to ? DAY_LABEL[g.from] : `${DAY_LABEL[g.from]}–${DAY_LABEL[g.to]}`} ${g.slot}`).join(" · ");
}

export function todayHours(hours: Hours | null, tz = PORTAL_TZ, now = new Date()): string | null {
  if (!hours) return null;
  const idx = toZonedTime(now, tz).getDay(); // 0 = Sun
  const keys: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const v = hours[keys[idx]!];
  return v ? `Open today ${fmt12(v.open)}–${fmt12(v.close)}` : "Closed today";
}

export function fmtDuration(ms: number | null): string {
  if (ms == null) return "Not recorded";
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Turn a form value (datetime-local "2026-09-15T04:00", a date, or an ISO string)
 * into the offset-qualified ISO string the API's IsoDateTime fields accept.
 * Returns undefined for blank or unparseable input so the filter is simply omitted.
 */
export function toIsoParam(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}
