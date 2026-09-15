import type { Database } from "@field-agent/db";
import { snapshotsRepo } from "@field-agent/db";
import {
  isScrapeError,
  FetchError,
  AbortedError,
  ScrapeError,
  retryAfterUntil,
  isChallengePage,
  RobotsDisallowedError,
  sha256,
  type FetchResult,
  type Fetcher,
  type Logger,
  type ScrapeEngine,
  type SnapshotKind,
  type Throttle,
} from "@field-agent/scraper";

export interface FetcherDeps {
  db: Database;
  engine: ScrapeEngine;
  throttle: Throttle;
  log: Logger;
  portalId: string;
  runId: string;
  snapshotMode: "first" | "changed" | "all" | "off";
  signal: AbortSignal;
  /** Set after discover(); before that every URL is allowed (robots.txt itself must be fetchable). */
  isAllowed: () => (url: string) => boolean;
  onRequest: () => void;
}

/**
 * The single path every request takes: robots -> throttle -> engine ->
 * snapshot. Conditional headers come from the newest stored snapshot; a 304
 * is answered from that snapshot's body so parsers never see an empty page.
 */
export function makeFetcher(deps: FetcherDeps): Fetcher {
  return async function fetchPortal(url: string, kind: SnapshotKind): Promise<FetchResult> {
    if (!deps.isAllowed()(url)) throw new RobotsDisallowedError(url);

    const prior = deps.snapshotMode === "off" ? undefined : await snapshotsRepo.latestSnapshot(deps.db, url);
    const host = new URL(url).hostname;

    const opts = {
      kind,
      signal: deps.signal,
      conditional: prior ? { etag: prior.etag, lastModified: prior.lastModified } : undefined,
      beforeSubrequest: async (target: string) => {
        if (!deps.isAllowed()(target)) throw new RobotsDisallowedError(target);
        await deps.throttle.acquire(new URL(target).hostname, deps.signal);
        deps.onRequest();
      },
    };
    let res: FetchResult;
    const request = async () => {
      const release = await deps.throttle.lease?.(host, deps.signal);
      try {
        await deps.throttle.acquire(host, deps.signal);
        if (deps.signal.aborted) throw new AbortedError(deps.signal.reason);
        deps.onRequest();
        return await deps.engine.fetchHtml(url, opts);
      } finally { await release?.(); }
    };
    try {
      res = await request();
    } catch (err) {
      // One polite retry for transient failures (timeouts, 5xx, resets); it waits its turn like any request.
      if (!(isScrapeError(err) && err.retryable)) throw err;
      if (err instanceof FetchError && (err.status === 429 || err.retryAfter)) {
        await deps.throttle.cooldown?.(host, retryAfterUntil(err.retryAfter));
      }
      deps.log.warn({ url, code: err.code }, "transient fetch error; retrying once");
      res = await request();
    }
    deps.log.debug({ url, status: res.status, notModified: res.notModified, kind }, "fetched");
    if (deps.signal.aborted) throw new AbortedError(deps.signal.reason);

    if (res.notModified) {
      if (!prior) throw new Error(`304 for ${url} without a stored snapshot`);
      return { ...res, body: prior.body, notModified: true };
    }

    const blocked = isChallengePage(res.body);
    if (deps.snapshotMode !== "off" || blocked) {
      const digest = sha256(res.body);
      const shouldSave =
        blocked || deps.snapshotMode === "all" ||
        (deps.snapshotMode === "first" && !prior) ||
        (deps.snapshotMode === "changed" && prior?.sha256 !== digest);
      if (shouldSave) {
        await snapshotsRepo.saveSnapshot(deps.db, {
          portalId: deps.portalId,
          runId: deps.runId,
          kind,
          url,
          finalUrl: res.finalUrl,
          httpStatus: res.status,
          sha256: digest,
          etag: res.headers["etag"] ?? null,
          lastModified: res.headers["last-modified"] ?? null,
          body: res.body,
        });
      }
    }
    if (blocked) throw new ScrapeError("source_blocked", "Source returned an anti-bot challenge. Diagnostic HTML retained; operator review required", { url, retryable: false });
    return res;
  };
}
