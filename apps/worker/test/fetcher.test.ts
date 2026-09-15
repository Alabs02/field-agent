import { beforeEach, describe, expect, it, vi } from "vitest";
import { FetchError, MemoryThrottle, type FetchResult, type ScrapeEngine, type Throttle } from "@field-agent/scraper";

const latestSnapshot = vi.fn();
const saveSnapshot = vi.fn();
vi.mock("@field-agent/db", () => ({ snapshotsRepo: { latestSnapshot: (...a: unknown[]) => latestSnapshot(...a), saveSnapshot: (...a: unknown[]) => saveSnapshot(...a) } }));

import { makeFetcher } from "../src/lib/fetcher.js";

const URL_ = "https://www.thepromenadeshopsatbriargate.com/sales/";
const ok = (body: string): FetchResult => ({ url: URL_, finalUrl: URL_, status: 200, body, headers: {}, notModified: false });
const silentLog = { debug() {}, info() {}, warn() {}, error() {}, child() { return silentLog; } } as never;

function fetcherWith(engine: ScrapeEngine, throttle: Throttle, snapshotMode: "first" | "changed" | "all" | "off" = "off") {
  const onRequest = vi.fn();
  const fetcher = makeFetcher({ db: {} as never, engine, throttle, log: silentLog, portalId: "briargate", runId: "run-1", snapshotMode, signal: new AbortController().signal, isAllowed: () => () => true, onRequest });
  return { fetcher, onRequest };
}

beforeEach(() => {
  latestSnapshot.mockReset().mockResolvedValue(undefined);
  saveSnapshot.mockReset().mockResolvedValue(undefined);
});

describe("fetcher politeness", () => {
  it("honours Retry-After on a 429 by extending the shared host cooldown before the single retry", async () => {
    const fetchHtml = vi.fn<ScrapeEngine["fetchHtml"]>().mockRejectedValueOnce(new FetchError(URL_, 429, "HTTP 429", undefined, "2")).mockResolvedValueOnce(ok("<html>fine</html>"));
    const cooldown = vi.fn<NonNullable<Throttle["cooldown"]>>().mockResolvedValue(undefined);
    const throttle: Throttle = { acquire: async () => {}, cooldown };
    const { fetcher, onRequest } = fetcherWith({ fetchHtml, close: async () => {} } as unknown as ScrapeEngine, throttle);
    const before = Date.now();
    const res = await fetcher(URL_, "listing");
    expect(res.body).toBe("<html>fine</html>");
    expect(fetchHtml).toHaveBeenCalledTimes(2);
    expect(onRequest).toHaveBeenCalledTimes(2);
    expect(cooldown).toHaveBeenCalledTimes(1);
    const until = cooldown.mock.calls[0]![1];
    expect(until).toBeGreaterThanOrEqual(before + 2_000);
    expect(until).toBeLessThan(before + 5_000);
  });

  it("holds the per-host in-flight lease for the whole request and releases it on failure", async () => {
    const order: string[] = [];
    const throttle: Throttle = {
      acquire: async () => { order.push("acquire"); },
      lease: async () => { order.push("lease"); return async () => { order.push("release"); }; },
    };
    const engine = { fetchHtml: async () => { order.push("fetch"); throw new FetchError(URL_, 500, "HTTP 500"); }, close: async () => {} } as unknown as ScrapeEngine;
    const { fetcher } = fetcherWith(engine, throttle);
    await expect(fetcher(URL_, "listing")).rejects.toBeInstanceOf(FetchError);
    expect(order).toEqual(["lease", "acquire", "fetch", "release", "lease", "acquire", "fetch", "release"]);
  });

  it("classifies a challenge page as source_blocked, keeps the HTML even with snapshots off, and does not retry", async () => {
    const fetchHtml = vi.fn<ScrapeEngine["fetchHtml"]>().mockResolvedValue(ok('<html><head><title>Just a moment...</title></head><body class="cf-chl-body"></body></html>'));
    const { fetcher } = fetcherWith({ fetchHtml, close: async () => {} } as unknown as ScrapeEngine, new MemoryThrottle(0), "off");
    await expect(fetcher(URL_, "listing")).rejects.toMatchObject({ code: "source_blocked", retryable: false });
    expect(fetchHtml).toHaveBeenCalledTimes(1);
    expect(saveSnapshot).toHaveBeenCalledTimes(1);
    expect(saveSnapshot.mock.calls[0]![1]).toMatchObject({ url: URL_, kind: "listing", runId: "run-1" });
  });

  it("answers a 304 from the stored snapshot so parsers never see an empty body", async () => {
    latestSnapshot.mockResolvedValue({ body: "<html>cached</html>", sha256: "x", etag: '"e"', lastModified: null });
    const fetchHtml = vi.fn<ScrapeEngine["fetchHtml"]>().mockResolvedValue({ ...ok(""), status: 304, notModified: true });
    const { fetcher } = fetcherWith({ fetchHtml, close: async () => {} } as unknown as ScrapeEngine, new MemoryThrottle(0), "changed");
    const res = await fetcher(URL_, "listing");
    expect(res.body).toBe("<html>cached</html>");
    expect(fetchHtml.mock.calls[0]![1]).toMatchObject({ conditional: { etag: '"e"' } });
    expect(saveSnapshot).not.toHaveBeenCalled();
  });
});
