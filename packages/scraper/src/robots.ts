import robotsParser from "robots-parser";

export interface RobotsRules {
  isAllowed(url: string): boolean;
  /** Crawl-delay for our UA in ms, or null when the file does not state one. */
  crawlDelayMs: number | null;
}

export function parseRobots(robotsUrl: string, body: string, userAgent: string): RobotsRules {
  const parsed = robotsParser(robotsUrl, body);
  const delaySec = parsed.getCrawlDelay(userAgent);
  return {
    isAllowed: (url) => parsed.isAllowed(url, userAgent) !== false,
    crawlDelayMs: typeof delaySec === "number" && Number.isFinite(delaySec) ? delaySec * 1000 : null,
  };
}

/** Everything allowed; used when robots.txt could not be fetched (fail open, but log it). */
export const permissiveRobots: RobotsRules = { isAllowed: () => true, crawlDelayMs: null };

/**
 * Effective spacing between requests. With `respectCrawlDelay` the stated
 * Crawl-delay is a floor; otherwise the configured delay stands alone (local
 * default, documented in ASSUMPTIONS.md).
 */
export function effectiveDelayMs(
  configuredMs: number,
  robotsDelayMs: number | null,
  respectCrawlDelay: boolean,
): number {
  if (respectCrawlDelay && robotsDelayMs != null) return Math.max(configuredMs, robotsDelayMs);
  return configuredMs;
}
