import { FetchError, AbortedError } from "../errors.js";
import type { FetchOptions, FetchResult, ScrapeEngine } from "../types.js";

export interface PlaywrightEngineOptions {
  userAgent: string;
  timeoutMs: number;
}

type PwBrowser = {
  newContext(o: { userAgent: string }): Promise<PwContext>;
  close(): Promise<void>;
};
type PwContext = {
  newPage(): Promise<PwPage>;
  close(): Promise<void>;
};
type PwPage = {
  route(pattern: string, handler: (route: { request(): { url(): string; resourceType(): string; isNavigationRequest(): boolean }; abort(): Promise<void>; continue(): Promise<void> }) => Promise<void>): Promise<void>;
  waitForSelector(selector: string, options: { timeout: number; state: "attached" }): Promise<unknown>;
  goto(
    url: string,
    o: { waitUntil: "domcontentloaded"; timeout: number },
  ): Promise<{ status(): number; url(): string; headers(): Record<string, string> } | null>;
  content(): Promise<string>;
  close(): Promise<void>;
};

/**
 * Opt-in browser transport for portals that render client-side. Loaded
 * lazily so the default worker image never needs Playwright installed.
 * Selected with SCRAPE_ENGINE=playwright (compose profile `browser`).
 */
export class PlaywrightEngine implements ScrapeEngine {
  readonly name = "playwright";
  private browser: PwBrowser | null = null;
  private context: PwContext | null = null;

  constructor(private readonly opts: PlaywrightEngineOptions) {}

  private async ensure(): Promise<PwContext> {
    if (this.context) return this.context;
    const moduleName = "playwright";
    const pw = (await import(moduleName)) as { chromium: { launch(o: { headless: boolean }): Promise<PwBrowser> } };
    this.browser = await pw.chromium.launch({ headless: true });
    this.context = await this.browser.newContext({ userAgent: this.opts.userAgent });
    return this.context;
  }

  async fetchHtml(url: string, opts: FetchOptions): Promise<FetchResult> {
    if (opts.signal?.aborted) throw new AbortedError(opts.signal.reason);
    const ctx = await this.ensure();
    const page = await ctx.newPage();
    const abort = () => { void page.close().catch(() => {}); };
    opts.signal?.addEventListener("abort", abort, { once: true });
    try {
      if (opts.signal?.aborted) throw new AbortedError(opts.signal.reason);
      await page.route("**/*", async route => {
        const request = route.request();
        if (["image", "font", "media"].includes(request.resourceType()) || new URL(request.url()).hostname !== new URL(url).hostname) return route.abort();
        if (!request.isNavigationRequest()) {
          try { await opts.beforeSubrequest?.(request.url()); } catch { return route.abort(); }
        }
        return route.continue();
      });
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: this.opts.timeoutMs });
      const status = res?.status() ?? 200;
      if (status >= 400) throw new FetchError(url, status, `HTTP ${status} for ${url}`);
      const readiness = opts.kind === "listing" ? ".deal-row" : opts.kind === "deal" ? 'script[type="application/ld+json"], .deal-detail' : null;
      if (readiness && !/cf-chl-|verify you are human/i.test(await page.content())) await page.waitForSelector(readiness, { timeout: this.opts.timeoutMs, state: "attached" });
      const body = await page.content();
      return {
        url,
        finalUrl: res?.url() ?? url,
        status,
        body,
        headers: res?.headers() ?? {},
        notModified: false,
      };
    } catch (err) {
      if (opts.signal?.aborted) throw new AbortedError(opts.signal.reason);
      throw err;
    } finally {
      opts.signal?.removeEventListener("abort", abort);
      await page.close().catch(() => {});
    }
  }

  async close(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
    this.context = null;
    this.browser = null;
  }
}
