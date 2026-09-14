import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import { DAY_KEYS, type DayKey, type Hours } from "@field-agent/shared";
import { normalizeText } from "../../normalize.js";

const DAY_RE = /\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/gi;
const ALL_DAYS_RE = /\b(daily|every ?day|all week|7 days)\b/i;
const TIME_RE = /\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/gi;

export interface HoursParse {
  hours: Hours | null;
  hoursRaw: string | null;
}

/**
 * Parses the portal's `.opening-hours` list. Each <li> has a label ("Mon – Sat:")
 * and a value with <time datetime="HH:MM"> pairs, or "Closed". Ranges are
 * expanded per day. Anything unparseable keeps the raw text and yields null.
 */
export function parseHours($: CheerioAPI, container: Cheerio<AnyNode>): HoursParse {
  const list = container.find(".opening-hours").first();
  if (!list.length) return { hours: null, hoursRaw: null };

  const lines: string[] = [];
  const result: Partial<Record<DayKey, { open: string; close: string } | null>> = {};
  let parsedAny = false;

  list.find("li").each((_, li) => {
    const item = $(li);
    const labelText = normalizeText(item.find(".label").text()) ?? "";
    const valueEl = item.find(".value");
    const valueText = normalizeText(valueEl.text()) ?? "";
    const lineText = normalizeText(item.text());
    if (lineText) lines.push(lineText);

    const days = daysFromLabel(labelText);
    if (!days.length) return;

    const times = valueEl
      .find("time[datetime]")
      .map((__, t) => $(t).attr("datetime")?.trim() ?? "")
      .get()
      .filter((t) => /^\d{2}:\d{2}$/.test(t));

    let slot: { open: string; close: string } | null | undefined;
    if (/closed/i.test(valueText)) slot = null;
    else if (times.length >= 2) slot = { open: times[0]!, close: times[1]! };
    else {
      const fromText = timesFromText(valueText);
      if (fromText) slot = fromText;
    }
    if (slot === undefined) return;
    parsedAny = true;
    for (const d of days) result[d] = slot;
  });

  const hoursRaw = lines.length ? lines.join("; ") : (normalizeText(list.text()) ?? null);
  if (!parsedAny) return { hours: null, hoursRaw };

  const hours = Object.fromEntries(DAY_KEYS.map((d) => [d, result[d] ?? null])) as Hours;
  return { hours, hoursRaw };
}

function daysFromLabel(label: string): DayKey[] {
  if (ALL_DAYS_RE.test(label)) return [...DAY_KEYS];
  const found = [...label.matchAll(DAY_RE)].map((m) => m[1]!.toLowerCase() as DayKey);
  if (found.length === 0) return [];
  if (found.length === 1) return [found[0]!];
  const a = DAY_KEYS.indexOf(found[0]!);
  const b = DAY_KEYS.indexOf(found[found.length - 1]!);
  if (a <= b) return DAY_KEYS.slice(a, b + 1);
  // Wrap-around, e.g. "Fri – Mon"
  return [...DAY_KEYS.slice(a), ...DAY_KEYS.slice(0, b + 1)];
}

function timesFromText(text: string): { open: string; close: string } | null {
  const matches = [...text.matchAll(TIME_RE)];
  if (matches.length < 2) return null;
  const to24 = (m: RegExpMatchArray) => {
    let h = Number(m[1]);
    const min = m[2] ?? "00";
    const ap = m[3]!.toLowerCase();
    if (ap === "pm" && h !== 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${min}`;
  };
  return { open: to24(matches[0]!), close: to24(matches[1]!) };
}
