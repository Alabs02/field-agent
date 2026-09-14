import { XMLParser } from "fast-xml-parser";
import type { SitemapEntry } from "../../types.js";
import { parseIsoDateTime } from "../../dates.js";

interface RawUrl {
  loc?: string;
  lastmod?: string;
  expires?: string;
}

export function parseSitemap(xml: string, canonicalize: (u: string) => string): Map<string, SitemapEntry> {
  const parser = new XMLParser({ ignoreAttributes: true, isArray: (name) => name === "url" });
  const doc = parser.parse(xml) as { urlset?: { url?: RawUrl[] } };
  const out = new Map<string, SitemapEntry>();
  for (const raw of doc.urlset?.url ?? []) {
    if (!raw.loc) continue;
    const url = canonicalize(String(raw.loc).trim());
    out.set(url, {
      url,
      lastmod: parseIsoDateTime(raw.lastmod),
      expires: parseIsoDateTime(raw.expires),
    });
  }
  return out;
}
