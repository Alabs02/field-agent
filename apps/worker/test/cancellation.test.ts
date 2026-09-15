import { describe, expect, it, vi } from "vitest";
import { AbortedError } from "@field-agent/scraper";

const getScrapeRun = vi.fn();
vi.mock("@field-agent/db", () => ({ runsRepo: { getScrapeRun: (...a: unknown[]) => getScrapeRun(...a), getVerificationRun: vi.fn() } }));

import { watchCancellation } from "../src/lib/cancellation.js";

describe("watchCancellation", () => {
  it("aborts the job's signal once the run row carries a cancellation request, and stops polling on demand", async () => {
    getScrapeRun.mockResolvedValueOnce({ cancelRequestedAt: null }).mockResolvedValue({ cancelRequestedAt: new Date() });
    const watch = watchCancellation({} as never, "scrape", "run-1");
    try {
      await watch.check();
      expect(watch.signal.aborted).toBe(false);
      await watch.check();
      expect(watch.signal.aborted).toBe(true);
      expect(watch.signal.reason).toBeInstanceOf(AbortedError);
    } finally {
      watch.stop();
    }
  });

  it("never lets a transient database error abort the run", async () => {
    getScrapeRun.mockRejectedValueOnce(new Error("connection reset"));
    const watch = watchCancellation({} as never, "scrape", "run-2");
    try {
      await expect(watch.check()).rejects.toThrow("connection reset");
      expect(watch.signal.aborted).toBe(false);
    } finally {
      watch.stop();
    }
  });
});
