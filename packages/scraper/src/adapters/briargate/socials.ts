import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import type { SocialLink, SocialPlatform } from "@field-agent/shared";

const HOST_TO_PLATFORM: Array<[RegExp, SocialPlatform]> = [
  [/(^|\.)instagram\.com$/i, "instagram"],
  [/(^|\.)facebook\.com$/i, "facebook"],
  [/(^|\.)fb\.com$/i, "facebook"],
  [/(^|\.)tiktok\.com$/i, "tiktok"],
  [/(^|\.)twitter\.com$/i, "x"],
  [/(^|\.)x\.com$/i, "x"],
  [/(^|\.)youtube\.com$/i, "youtube"],
  [/(^|\.)youtu\.be$/i, "youtube"],
  [/(^|\.)pinterest\.com$/i, "pinterest"],
  [/(^|\.)linkedin\.com$/i, "linkedin"],
  [/(^|\.)threads\.net$/i, "threads"],
  [/(^|\.)snapchat\.com$/i, "snapchat"],
];

/** The mall's own accounts, which appear in the footer and must not be attributed to a brand. */
const EXCLUDED_HANDLES = /shopsbriargate|promenadeshopsatbriargate|thepromenadeshops/i;
const SHARE_PATHS = /\/share(\.php)?(\?|$)|\/sharer|intent\/tweet/i;

/**
 * Social links that belong to the store itself. Scans the given container
 * (never the footer), skips share widgets, and drops the mall's handles.
 * On this portal the result is expected to be [] for every brand.
 */
export function parseSocialLinks($: CheerioAPI, container: Cheerio<AnyNode>): SocialLink[] {
  const seen = new Set<string>();
  const out: SocialLink[] = [];
  container.find("a[href]").each((_, a) => {
    const href = $(a).attr("href")?.trim();
    if (!href) return;
    if ($(a).closest("footer, .social-page-share, .social-page-shares").length) return;
    let u: URL;
    try {
      u = new URL(href);
    } catch {
      return;
    }
    const platform = HOST_TO_PLATFORM.find(([re]) => re.test(u.hostname))?.[1];
    if (!platform) return;
    if (SHARE_PATHS.test(u.pathname + u.search)) return;
    if (EXCLUDED_HANDLES.test(u.pathname)) return;
    const key = `${platform}:${u.toString()}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ platform, url: u.toString() });
  });
  return out;
}
