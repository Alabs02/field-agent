import { createHash } from "node:crypto";
import he from "he";

/**
 * Text normalization used for storage of plain-text fields and for the
 * verification diff. Whitespace, entity encoding, and typographic quotes
 * are below the discrepancy line; wording is not.
 */
export function normalizeText(input: string | null | undefined): string | null {
  if (input == null) return null;
  const decoded = he.decode(stripTags(input));
  const out = decoded
    .normalize("NFC")
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/[\u00A0\u2007\u202F\u2060\uFEFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return out.length ? out : null;
}

export function stripTags(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
}

/**
 * Identity of an image regardless of CDN transforms. Placewise serves
 * `https://cdn-files.eu.placewise.com/f/<opaque-id>?transform=...`; the path
 * is the identity, the query string is churn.
 */
export function imageKey(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const path = u.pathname
      .replace(/\/(w|h|s|q)_\d+(\/|$)/g, "/") // generic size segments
      .replace(/-\d+x\d+(\.\w+)$/i, "$1") // -200x200.jpg suffixes
      .replace(/\/+$/, "");
    return `${u.hostname.toLowerCase()}${path}`;
  } catch {
    return url;
  }
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Stable hash over comparable fields; null and undefined hash identically. */
export function hashFields(fields: Record<string, unknown>): string {
  const entries = Object.keys(fields)
    .sort()
    .map((k) => [k, fields[k] ?? null] as const);
  return sha256(JSON.stringify(entries));
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => (w === "and" ? "&" : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
