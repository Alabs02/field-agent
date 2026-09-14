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
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: this.opts.timeoutMs });
      const status = res?.status() ?? 200;
      if (status >= 400) throw new FetchError(url, status, `HTTP ${status} for ${url}`);
      const body = await page.content();
      return {
        url,
        finalUrl: res?.url() ?? url,
        status,
        body,
        headers: res?.headers() ?? {},
        notModified: false,
      };
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
    this.context = null;
    this.browser = null;
  }
}
