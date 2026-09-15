import { BRIARGATE_PORTAL, type ScrapedBrand, type ScrapedListingRow } from "@field-agent/shared";
import { parseRobots, permissiveRobots, type RobotsRules } from "../../robots.js";
import type { AdapterContext, Discovery, PortalAdapter, PromotionFetch } from "../../types.js";
import { makeCanonicalizer } from "../../url.js";
import { parseDealPage } from "./deal.js";
import { parseDirectory } from "./directory.js";
import { parseListing } from "./listing.js";
import { parseSitemap } from "./sitemap.js";
import { parseStorePage } from "./store.js";
import { AbortedError } from "../../errors.js";

export interface BriargateAdapterOptions {
  userAgent: string;
}

export class BriargateAdapter implements PortalAdapter {
  readonly portalId = BRIARGATE_PORTAL.id;
  readonly baseUrl = BRIARGATE_PORTAL.baseUrl;
  readonly timezone = BRIARGATE_PORTAL.timezone;
  readonly canonicalize = makeCanonicalizer(BRIARGATE_PORTAL.baseUrl);

  readonly listingUrl = this.canonicalize("/sales/");
  readonly directoryUrl = this.canonicalize("/directory/");
  readonly robotsUrl = this.canonicalize("/robots.txt");
  readonly sitemapUrl = this.canonicalize("/sitemap.xml");

  constructor(private readonly opts: BriargateAdapterOptions) {}

  async discover(ctx: AdapterContext): Promise<Discovery> {
    let robots: RobotsRules = permissiveRobots;
    try {
      const r = await ctx.fetch(this.robotsUrl, "robots");
      robots = parseRobots(this.robotsUrl, r.body, this.opts.userAgent);
    } catch (err) {
      if (ctx.signal?.aborted || err instanceof AbortedError) throw err;
      ctx.log.warn({ err: String(err) }, "robots.txt unavailable; proceeding permissively");
    }
    await ctx.onRobots?.(robots);

    let sitemap = new Map<string, { url: string; lastmod: Date | null; expires: Date | null }>();
    try {
      const s = await ctx.fetch(this.sitemapUrl, "sitemap");
      sitemap = parseSitemap(s.body, this.canonicalize);
    } catch (err) {
      if (ctx.signal?.aborted || err instanceof AbortedError) throw err;
      ctx.log.warn({ err: String(err) }, "sitemap.xml unavailable; change detection disabled for this run");
    }

    const urls = [...sitemap.keys()];
    return {
      crawlDelayMs: robots.crawlDelayMs,
      isAllowed: robots.isAllowed,
      sitemap,
      dealUrls: urls.filter((u) => u.includes("/deals/")),
      storeUrls: urls.filter((u) => u.includes("/stores/")),
    };
  }

  async fetchDirectory(ctx: AdapterContext) {
    const r = await ctx.fetch(this.directoryUrl, "directory");
    return parseDirectory(r.body, this.canonicalize);
  }

  async fetchListing(ctx: AdapterContext) {
    const r = await ctx.fetch(this.listingUrl, "listing");
    return parseListing(r.body, this.canonicalize, this.listingUrl);
  }

  async fetchPromotion(ctx: AdapterContext, row: ScrapedListingRow): Promise<PromotionFetch> {
    const url = this.canonicalize(row.detailUrl);
    const r = await ctx.fetch(url, "deal");
    const parsed = parseDealPage(r.body, url, row, this.canonicalize);
    if (parsed.jsonLdMissing) {
      ctx.log.warn({ url }, "deal page has no JSON-LD; dates fall back to listing serials");
    }
    return { promotion: parsed.promotion, brandFallback: parsed.brandFallback, status: r.status };
  }

  async fetchBrand(ctx: AdapterContext, storeUrl: string): Promise<ScrapedBrand> {
    const url = this.canonicalize(storeUrl);
    const r = await ctx.fetch(url, "store");
    return parseStorePage(r.body, url);
  }
}
