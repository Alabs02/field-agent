import { describe, expect, it } from "vitest";
import type { SessionUser } from "@field-agent/shared";
import { enforceLaunchPolicy } from "../src/services/launch.js";
import { HttpError } from "../src/plugins/error-handler.js";

const deps = { env: { VERIFY_SAMPLE_RATE: 0.2 } } as Parameters<typeof enforceLaunchPolicy>[0];
const user = (role: SessionUser["role"]): SessionUser => ({ id: "u1", email: `${role}@example.com`, name: role, role });
const code = (fn: () => unknown) => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof HttpError ? e.code : String(e);
  }
};

describe("enforceLaunchPolicy", () => {
  it("lets a reviewer run the bounded incremental scrape and quick check", () => {
    expect(enforceLaunchPolicy(deps, { type: "scrape", user: user("reviewer") }).options.force).toBe(false);
    expect(enforceLaunchPolicy(deps, { type: "verify", user: user("reviewer") }).sampleRate).toBe(0.2);
    expect(enforceLaunchPolicy(deps, { type: "verify", user: user("reviewer"), promotionIds: ["b", "a", "a"] }).promotionIds).toEqual(["a", "b"]);
  });

  it("refuses advanced options to a reviewer but not to operations", () => {
    expect(code(() => enforceLaunchPolicy(deps, { type: "scrape", user: user("reviewer"), options: { force: true, fetchDetails: true, fetchBrands: true } }))).toBe("BOUNDED_CONTROLS");
    expect(code(() => enforceLaunchPolicy(deps, { type: "scrape", user: user("reviewer"), options: { force: false, fetchDetails: false, fetchBrands: true } }))).toBe("BOUNDED_CONTROLS");
    expect(code(() => enforceLaunchPolicy(deps, { type: "scrape", user: user("reviewer"), options: { force: false, fetchDetails: true, fetchBrands: true, maxItems: 5 } }))).toBe("BOUNDED_CONTROLS");
    expect(code(() => enforceLaunchPolicy(deps, { type: "verify", user: user("reviewer"), sampleRate: 1 }))).toBe("BOUNDED_CONTROLS");
    expect(code(() => enforceLaunchPolicy(deps, { type: "verify", user: user("reviewer"), promotionIds: Array.from({ length: 26 }, (_, i) => `id-${i}`) }))).toBe("BOUNDED_CONTROLS");
    expect(code(() => enforceLaunchPolicy(deps, { type: "scrape", user: user("operations"), options: { force: true, fetchDetails: true, fetchBrands: true } }))).toBeNull();
    expect(code(() => enforceLaunchPolicy(deps, { type: "verify", user: user("data_engineer"), sampleRate: 1 }))).toBeNull();
  });

  it("refuses roles without the capability and allows system launches without a user", () => {
    expect(code(() => enforceLaunchPolicy(deps, { type: "scrape", user: user("account_manager") }))).toBe("FORBIDDEN");
    expect(code(() => enforceLaunchPolicy(deps, { type: "scrape", actor: "schedule" }))).toBeNull();
  });
});
