import type {
  PortalId,
  ScrapedBrand,
  ScrapedBrandStub,
  ScrapedListingRow,
  ScrapedPromotion,
} from "@field-agent/shared";

export type SnapshotKind = "robots" | "sitemap" | "listing" | "directory" | "deal" | "store";

/** Minimal logger shape; pino satisfies it, tests pass a no-op. */
export interface Logger {
  debug(obj: Record<string, unknown>, msg?: string): void;
  info(obj: Record<string, unknown>, msg?: string): void;
  warn(obj: Record<string, unknown>, msg?: string): void;
  error(obj: Record<string, unknown>, msg?: string): void;
}

export const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

export interface ConditionalHeaders {
  etag?: string | null;
  lastModified?: string | null;
}

export interface FetchOptions {
  kind: SnapshotKind;
  signal?: AbortSignal;
  conditional?: ConditionalHeaders;
}

export interface FetchResult {
  url: string;
  finalUrl: string;
  status: number;
  body: string;
  headers: Record<string, string>;
  /** 304: body is empty; the caller substitutes the stored snapshot. */
  notModified: boolean;
}

/** Transport. HttpEngine is the default; PlaywrightEngine is the opt-in escape hatch. */
export interface ScrapeEngine {
  readonly name: string;
  fetchHtml(url: string, opts: FetchOptions): Promise<FetchResult>;
  close(): Promise<void>;
}

/** Resolves when one request may be sent to `host`. Shared across scrape and verify. */
export interface Throttle {
  acquire(host: string, signal?: AbortSignal): Promise<void>;
}

export interface SitemapEntry {
  url: string;
  lastmod: Date | null;
  expires: Date | null;
}

export interface Discovery {
  /** Crawl-delay for our UA from robots.txt, in ms; null if none stated. */
  crawlDelayMs: number | null;
  isAllowed(url: string): boolean;
  sitemap: Map<string, SitemapEntry>;
  /** Sitemap entries split by path family for convenience. */
  dealUrls: string[];
  storeUrls: string[];
}

/** The composed fetch the worker hands to the adapter: robots -> throttle -> engine -> snapshot. */
export type Fetcher = (url: string, kind: SnapshotKind) => Promise<FetchResult>;

export interface AdapterContext {
  fetch: Fetcher;
  log: Logger;
  signal?: AbortSignal;
  now: () => Date;
}

export interface PortalAdapter {
  readonly portalId: PortalId;
  readonly baseUrl: string;
  readonly timezone: string;
  canonicalize(url: string): string;
  discover(ctx: AdapterContext): Promise<Discovery>;
  fetchDirectory(ctx: AdapterContext): Promise<ScrapedBrandStub[]>;
  fetchListing(ctx: AdapterContext): Promise<ScrapedListingRow[]>;
  fetchPromotion(ctx: AdapterContext, row: ScrapedListingRow): Promise<PromotionFetch>;
  fetchBrand(ctx: AdapterContext, storeUrl: string): Promise<ScrapedBrand>;
}

export interface PromotionFetch {
  promotion: ScrapedPromotion;
  /** Brand data embedded on the deal page; used only if the store page fetch fails. */
  brandFallback: ScrapedBrand | null;
  status: number;
}
