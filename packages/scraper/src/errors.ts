export type ScrapeErrorCode =
  | "http_error"
  | "network_error"
  | "fetch_timeout"
  | "robots_disallowed"
  | "listing_empty"
  | "listing_row_invalid"
  | "listing_incomplete"
  | "source_blocked"
  | "jsonld_missing"
  | "parse_error"
  | "validation_error"
  | "job_timeout"
  | "aborted";

export class ScrapeError extends Error {
  readonly code: ScrapeErrorCode;
  readonly url: string | null;
  readonly retryable: boolean;
  readonly status: number | null;

  constructor(
    code: ScrapeErrorCode,
    message: string,
    opts: { url?: string | null; retryable?: boolean; status?: number | null; cause?: unknown } = {},
  ) {
    super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = "ScrapeError";
    this.code = code;
    this.url = opts.url ?? null;
    this.retryable = opts.retryable ?? false;
    this.status = opts.status ?? null;
  }
}

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export class FetchError extends ScrapeError {
  constructor(url: string, status: number | null, message: string, cause?: unknown, public readonly retryAfter: string | null = null) {
    const code: ScrapeErrorCode = status === null ? "network_error" : "http_error";
    super(code, message, {
      url,
      status,
      retryable: status === null ? true : RETRYABLE_STATUSES.has(status),
      cause,
    });
    this.name = "FetchError";
  }
}

export class FetchTimeoutError extends ScrapeError {
  constructor(url: string, ms: number) {
    super("fetch_timeout", `fetch of ${url} exceeded ${ms}ms`, { url, retryable: true });
    this.name = "FetchTimeoutError";
  }
}

export class RobotsDisallowedError extends ScrapeError {
  constructor(url: string) {
    super("robots_disallowed", `robots.txt disallows ${url}`, { url, retryable: false });
    this.name = "RobotsDisallowedError";
  }
}

export class ParseError extends ScrapeError {
  constructor(code: "listing_empty" | "listing_row_invalid" | "listing_incomplete" | "jsonld_missing" | "parse_error", message: string, url?: string) {
    super(code, message, { url: url ?? null, retryable: false });
    this.name = "ParseError";
  }
}

export class JobTimeoutError extends ScrapeError {
  constructor(ms: number) {
    super("job_timeout", `job exceeded ${ms}ms`, { retryable: false });
    this.name = "JobTimeoutError";
  }
}

export class AbortedError extends ScrapeError {
  constructor(reason?: unknown) {
    super("aborted", reason instanceof Error ? reason.message : "aborted", {
      retryable: false,
      cause: reason,
    });
    this.name = "AbortedError";
  }
}

export function isScrapeError(e: unknown): e is ScrapeError {
  return e instanceof ScrapeError;
}

/** Turn any thrown value into a stable (code, message) pair for run error logs. */
export function describeError(e: unknown): { code: string; message: string; url: string | null } {
  if (isScrapeError(e)) return { code: e.code, message: e.message, url: e.url };
  if (e instanceof Error) return { code: e.name || "error", message: e.message, url: null };
  return { code: "unknown", message: String(e), url: null };
}
