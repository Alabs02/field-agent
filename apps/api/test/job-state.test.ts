import { describe, expect, it } from "vitest";
import type { VerificationRun } from "@field-agent/shared";
import { effectiveStatus } from "../src/plugins/job-state.js";
import { resultOf } from "../src/routes/verify.js";

const now = Date.parse("2026-09-14T12:00:00Z");
const iso = (secAgo: number) => new Date(now - secAgo * 1000).toISOString();

describe("effectiveStatus", () => {
  it("reports a running row with a stale heartbeat and no active job as stalled", () => {
    expect(effectiveStatus("running", iso(120), "waiting", now)).toBe("stalled");
    expect(effectiveStatus("running", iso(120), "unknown", now)).toBe("stalled");
  });
  it("trusts a fresh heartbeat or an active job", () => {
    expect(effectiveStatus("running", iso(5), "waiting", now)).toBe("running");
    expect(effectiveStatus("running", iso(300), "active", now)).toBe("running");
  });
  it("lets the queue's failed state win over a stale row", () => {
    expect(effectiveStatus("running", iso(5), "failed", now)).toBe("failed");
    expect(effectiveStatus("queued", null, "failed", now)).toBe("failed");
  });
  it("passes terminal statuses through untouched", () => {
    expect(effectiveStatus("completed", iso(9999), "unknown", now)).toBe("completed");
  });
});

function run(partial: Partial<VerificationRun> & { counts?: Partial<VerificationRun["counts"]> }): VerificationRun {
  return {
    type: "verify",
    id: "5f9a2c1e-6b8d-4f1a-9c2b-7d3e4f5a6b7c",
    portalId: "briargate",
    jobId: "x",
    triggeredBy: null,
    status: "completed",
    attemptsMade: 1,
    sampleRate: 0.2,
    requestsMade: 3,
    errors: [],
    error: null,
    queuedAt: iso(60),
    startedAt: iso(50),
    heartbeatAt: iso(1),
    finishedAt: iso(0),
    durationMs: 50_000,
    ...partial,
    counts: { checked: 0, clean: 0, changed: 0, missingAtSource: 0, unverifiable: 0, ...partial.counts },
  };
}

describe("resultOf", () => {
  it("never calls an empty run clean", () => {
    expect(resultOf(run({ counts: { checked: 0 } }))).toBe("nothing_to_verify");
  });
  it("is clean only when everything checked matched", () => {
    expect(resultOf(run({ counts: { checked: 30, clean: 30 } }))).toBe("clean");
    expect(resultOf(run({ counts: { checked: 30, clean: 29, changed: 1 } }))).toBe("discrepancies");
    expect(resultOf(run({ counts: { checked: 30, clean: 29, unverifiable: 1 } }))).toBe("discrepancies");
  });
  it("reports in-progress and failed runs as such", () => {
    expect(resultOf(run({ status: "running" }))).toBe("in_progress");
    expect(resultOf(run({ status: "failed" }))).toBe("failed");
  });
});
