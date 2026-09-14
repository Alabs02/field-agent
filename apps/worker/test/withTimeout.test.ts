import { describe, expect, it } from "vitest";
import { abortableSleep, JobTimeoutError } from "@field-agent/scraper";
import { withTimeout } from "../src/lib/withTimeout.js";

describe("withTimeout", () => {
  it("returns the result when the work finishes in time", async () => {
    await expect(withTimeout(500, async () => "done")).resolves.toBe("done");
  });

  it("aborts real in-flight work, not just the promise", async () => {
    let sawAbort = false;
    const p = withTimeout(50, async (signal) => {
      try {
        await abortableSleep(5_000, signal);
      } catch (e) {
        sawAbort = signal.aborted;
        throw e;
      }
      return "should not get here";
    });
    await expect(p).rejects.toBeInstanceOf(JobTimeoutError);
    expect(sawAbort).toBe(true);
  });

  it("propagates a parent abort", async () => {
    const parent = new AbortController();
    const p = withTimeout(5_000, (signal) => abortableSleep(5_000, signal), parent.signal);
    parent.abort(new Error("shutdown"));
    await expect(p).rejects.toMatchObject({ message: "shutdown" });
  });
});
