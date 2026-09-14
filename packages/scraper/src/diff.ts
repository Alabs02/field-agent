import type { Collection, FieldChange, FieldName, ScrapedListingRow } from "@field-agent/shared";
import { dayInZone } from "./dates.js";
import { imageKey, normalizeText } from "./normalize.js";

/** The subset of a promotion the verifier compares. Built from a DB row or a fresh scrape alike. */
export interface ComparablePromotion {
  title: string;
  description: string | null;
  imageUrl: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  brandSourceId: string;
  collection: Collection;
}

const DESCRIPTION_PREVIEW = 300;

function preview(v: string | null): { value: string | null; truncated: boolean } {
  if (v == null) return { value: null, truncated: false };
  if (v.length <= DESCRIPTION_PREVIEW) return { value: v, truncated: false };
  return { value: `${v.slice(0, DESCRIPTION_PREVIEW)}…`, truncated: true };
}

/**
 * Field-level diff between what we stored and what the source now says.
 * Whitespace/entities/quotes, CDN transforms on the same image, and sub-day
 * time shifts are below the line; wording, image identity, calendar day,
 * brand, and collection are not.
 */
export function detailDiff(stored: ComparablePromotion, fresh: ComparablePromotion, tz: string): FieldChange[] {
  const changes: FieldChange[] = [];

  const t0 = normalizeText(stored.title);
  const t1 = normalizeText(fresh.title);
  if (t0 !== t1) changes.push({ field: "title", before: t0, after: t1 });

  const d0 = normalizeText(stored.description);
  const d1 = normalizeText(fresh.description);
  if (d0 !== d1) {
    const b = preview(d0);
    const a = preview(d1);
    changes.push({ field: "description", before: b.value, after: a.value, truncated: b.truncated || a.truncated });
  }

  const i0 = imageKey(stored.imageUrl);
  const i1 = imageKey(fresh.imageUrl);
  if (i0 !== i1) changes.push({ field: "imageUrl", before: stored.imageUrl, after: fresh.imageUrl });

  const s0 = dayInZone(stored.startsAt, tz);
  const s1 = dayInZone(fresh.startsAt, tz);
  if (s0 !== s1) changes.push({ field: "startsOn", before: s0, after: s1 });

  const e0 = dayInZone(stored.endsAt, tz);
  const e1 = dayInZone(fresh.endsAt, tz);
  if (e0 !== e1) changes.push({ field: "endsOn", before: e0, after: e1 });

  if (stored.brandSourceId !== fresh.brandSourceId) {
    changes.push({ field: "brand", before: stored.brandSourceId, after: fresh.brandSourceId });
  }
  if (stored.collection !== fresh.collection) {
    changes.push({ field: "collection", before: stored.collection, after: fresh.collection });
  }
  return changes;
}

/**
 * Cheap comparison against the listing row only. Produces *flags* that
 * justify a detail fetch; it never asserts a change on its own because the
 * listing carries less information than the detail page.
 */
export function listingFlags(stored: ComparablePromotion, row: ScrapedListingRow, endsOnFromRow: string | null, tz: string): FieldName[] {
  const flags: FieldName[] = [];
  if (normalizeText(stored.title) !== normalizeText(row.title)) flags.push("title");
  if (stored.brandSourceId !== row.brandSourceId) flags.push("brand");
  if (imageKey(stored.imageUrl) !== imageKey(row.imageUrl)) flags.push("imageUrl");
  if (stored.collection !== row.collection) flags.push("collection");
  const storedEnd = dayInZone(stored.endsAt, tz);
  if (endsOnFromRow && storedEnd && endsOnFromRow !== storedEnd) flags.push("endsOn");
  return flags;
}
