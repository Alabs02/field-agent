import { gotScraping } from "got-scraping";
import { CookieJar } from "tough-cookie";
import { FetchError, FetchTimeoutError, AbortedError } from "../errors.js";
import type { FetchOptions, FetchResult, ScrapeEngine } from "../types.js";

export interface HttpEngineOptions {
  userAgent: string;
  timeoutMs: number;
}

/**
 * HTTP transport. got-scraping gives us a browser-shaped TLS/HTTP2 stack and
 * proper redirect handling; the header generator is switched off so we send an
 * honest, stable User-Agent with a contact address instead of a spoofed one.
 * Retries are the caller's job (they are tied to job semantics), so `retry` is 0.
 */
export class HttpEngine implements ScrapeEngine {
  readonly name = "http";
  private readonly jar = new CookieJar();
  private readonly client;

  constructor(private readonly opts: HttpEngineOptions) {
    this.client = gotScraping.extend({
      cookieJar: this.jar,
      followRedirect: true,
      maxRedirects: 5,
      throwHttpErrors: false,
      responseType: "text",
      useHeaderGenerator: false,
      // The portal (Lucee behind a load balancer) stalls reused HTTP/2 streams; plain HTTP/1.1 is reliable.
      http2: false,
      retry: { limit: 0 },
      timeout: { request: opts.timeoutMs },
      headers: {
        "user-agent": opts.userAgent,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });
  }

  async fetchHtml(url: string, opts: FetchOptions): Promise<FetchResult> {
    const headers: Record<string, string> = {};
    if (opts.conditional?.etag) headers["if-none-match"] = opts.conditional.etag;
    if (opts.conditional?.lastModified) headers["if-modified-since"] = opts.conditional.lastModified;

    let res;
    try {
      res = await this.client(url, { headers, signal: opts.signal });
    } catch (err) {
      if (opts.signal?.aborted) throw new AbortedError(opts.signal.reason);
      const name = err instanceof Error ? err.name : "";
      if (name === "TimeoutError") throw new FetchTimeoutError(url, this.opts.timeoutMs);
      throw new FetchError(url, null, err instanceof Error ? err.message : String(err), err);
    }

    const status = res.statusCode;
    const flatHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(res.headers)) {
      if (typeof v === "string") flatHeaders[k.toLowerCase()] = v;
      else if (Array.isArray(v)) flatHeaders[k.toLowerCase()] = v.join(", ");
    }
    const finalUrl = res.url || url;

    if (status === 304) {
      return { url, finalUrl, status, body: "", headers: flatHeaders, notModified: true };
    }
    if (status >= 400) {
      throw new FetchError(url, status, `HTTP ${status} for ${url}`);
    }
    return {
      url,
      finalUrl,
      status,
      body: typeof res.body === "string" ? res.body : String(res.body),
      headers: flatHeaders,
      notModified: false,
    };
  }

  async close(): Promise<void> {
    /* nothing to release; sockets are pooled by got and closed on process exit */
  }
}
