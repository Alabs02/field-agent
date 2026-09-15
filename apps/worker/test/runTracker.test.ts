import { describe, expect, it, vi } from "vitest";
import { RunTracker } from "../src/lib/runTracker.js";

describe("RunTracker recovery", () => {
  it("retains earlier attempt errors and recovers after a failed heartbeat write", async () => {
    const prior = { stage: "run", code: "network_error", message: "First attempt failed", url: null, sourceId: null, at: new Date().toISOString() };
    const persist = vi.fn().mockRejectedValueOnce(new Error("database temporarily offline")).mockResolvedValue(undefined);
    const tracker = new RunTracker({ checked: 1 }, persist, null, s => s, [prior]);
    await expect(tracker.flush(true)).rejects.toThrow("database temporarily offline");
    tracker.state.checked = 2;
    await tracker.flush(true);
    expect(persist).toHaveBeenLastCalledWith(expect.objectContaining({ checked: 2, errors: [prior] }));
  });
});
