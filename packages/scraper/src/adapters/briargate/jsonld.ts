import type { CheerioAPI } from "cheerio";

/** Return every parseable JSON-LD object on the page (flattening @graph). */
export function readJsonLd($: CheerioAPI): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text();
    if (!raw.trim()) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      collect(parsed, out);
    } catch {
      // Malformed JSON-LD is common in the wild; the DOM fallbacks cover it.
    }
  });
  return out;
}

function collect(node: unknown, out: Record<string, unknown>[]): void {
  if (Array.isArray(node)) {
    node.forEach((n) => collect(n, out));
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (Array.isArray(obj["@graph"])) collect(obj["@graph"], out);
    if (typeof obj["@type"] === "string" || Array.isArray(obj["@type"])) out.push(obj);
  }
}

export function findByType($: CheerioAPI, type: string): Record<string, unknown> | null {
  for (const obj of readJsonLd($)) {
    const t = obj["@type"];
    if (t === type || (Array.isArray(t) && t.includes(type))) return obj;
  }
  return null;
}

export function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}
