import type { Database } from "@field-agent/db";
import { snapshotsRepo } from "@field-agent/db";
import {
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
    await deps.throttle.acquire(host, deps.signal);
    deps.onRequest();

    const res = await deps.engine.fetchHtml(url, {
      kind,
      signal: deps.signal,
      conditional: prior ? { etag: prior.etag, lastModified: prior.lastModified } : undefined,
    });
    deps.log.debug({ url, status: res.status, notModified: res.notModified, kind }, "fetched");

    if (res.notModified) {
      if (!prior) throw new Error(`304 for ${url} without a stored snapshot`);
      return { ...res, body: prior.body, notModified: true };
    }

    if (deps.snapshotMode !== "off") {
      const digest = sha256(res.body);
      const shouldSave =
        deps.snapshotMode === "all" ||
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
    return res;
  };
}
