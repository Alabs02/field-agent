import { describe, expect, it } from "vitest";
import { nextDue, planCycle, stagesFor, successfulStage } from "../src/services/scheduler.js";

describe("scheduled cycles", () => {
  it("computes the next due time in whole hours from now", () => {
    const now = new Date("2026-09-15T12:00:00Z");
    expect(nextDue(now, 1).toISOString()).toBe("2026-09-15T13:00:00.000Z");
    expect(nextDue(now, 24).toISOString()).toBe("2026-09-16T12:00:00.000Z");
  });

  it("orders stages verify then scrape, and scrape then verify when bootstrapping an empty database", () => {
    expect(stagesFor(false)).toEqual(["verify", "scrape"]);
    expect(stagesFor(true)).toEqual(["scrape", "verify"]);
  });

  it("treats discrepancies as a successful stage and failures as not", () => {
    expect(successfulStage("completed")).toBe(true);
    expect(successfulStage("completed_with_errors")).toBe(true);
    expect(successfulStage("failed")).toBe(false);
    expect(successfulStage("cancelled")).toBe(false);
  });

  it("launches the first stage, waits while it runs, then launches the second", () => {
    expect(planCycle(false, undefined, undefined)).toEqual({ action: "launch", type: "verify" });
    expect(planCycle(false, { status: "running" }, undefined)).toEqual({ action: "wait" });
    expect(planCycle(false, { status: "completed" }, undefined)).toEqual({ action: "launch", type: "scrape" });
    expect(planCycle(false, { status: "completed" }, { status: "queued" })).toEqual({ action: "wait" });
    expect(planCycle(false, { status: "completed" }, { status: "completed" })).toEqual({ action: "finish", outcome: "completed" });
  });

  it("lets discrepancies continue into the refresh but stops after a failed or cancelled verification", () => {
    expect(planCycle(false, { status: "completed_with_errors" }, undefined)).toEqual({ action: "launch", type: "scrape" });
    expect(planCycle(false, { status: "failed" }, undefined)).toEqual({ action: "finish", outcome: "failed" });
    expect(planCycle(false, { status: "cancelled" }, undefined)).toEqual({ action: "finish", outcome: "cancelled" });
  });

  it("never launches the same stage twice: an existing second run is observed, not relaunched", () => {
    expect(planCycle(true, { status: "completed" }, { status: "running" })).toEqual({ action: "wait" });
    expect(planCycle(true, { status: "completed" }, { status: "completed_with_errors" })).toEqual({ action: "finish", outcome: "completed_with_errors" });
  });
});
