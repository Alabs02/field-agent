import { describe, expect, it } from "vitest";
import {
  PromotionsQuerySchema,
  can,
  paginate,
  rolesWith,
  ScrapeJobPayloadSchema,
  VerificationReportSchema,
} from "../src/index.js";

describe("PromotionsQuerySchema", () => {
  it("applies defaults and coerces query strings", () => {
    const q = PromotionsQuerySchema.parse({ page: "2", pageSize: "10", includeRemoved: "true" });
    expect(q).toMatchObject({ page: 2, pageSize: 10, sort: "endingSoon", includeRemoved: true });
  });

  it('treats includeRemoved="false" as false (coerce.boolean would not)', () => {
    expect(PromotionsQuerySchema.parse({ includeRemoved: "false" }).includeRemoved).toBe(false);
  });

  it("rejects an inverted date range", () => {
    const r = PromotionsQuerySchema.safeParse({ startDate: "2026-09-20", endDate: "2026-09-10" });
    expect(r.success).toBe(false);
  });

  it("caps pageSize at 100", () => {
    expect(PromotionsQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
  });
});

describe("paginate", () => {
  it("computes totals and navigation flags", () => {
    expect(paginate([1, 2], 45, 2, 20)).toMatchObject({
      total: 45,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    });
    expect(paginate([], 0, 1, 20)).toMatchObject({ totalPages: 0, hasNext: false, hasPrev: false });
  });
});

describe("RBAC", () => {
  it("lets operators scrape but not administer", () => {
    expect(can("operations", "scrape")).toBe(true);
    expect(can("operations", "admin")).toBe(false);
    expect(can("reviewer", "scrape")).toBe(false);
    expect(can(null, "read")).toBe(false);
    expect(rolesWith("admin")).toEqual(["super_admin"]);
  });
});

describe("job payloads", () => {
  it("fills scrape option defaults", () => {
    const p = ScrapeJobPayloadSchema.parse({
      portalId: "briargate",
      runId: "5f9a2c1e-6b8d-4f1a-9c2b-7d3e4f5a6b7c",
      requestedBy: null,
      options: {},
    });
    expect(p.options).toEqual({ fetchDetails: true, fetchBrands: true, force: false });
  });
});

describe("VerificationReportSchema", () => {
  it("accepts an explicit clean report", () => {
    const r = VerificationReportSchema.parse({
      runId: "5f9a2c1e-6b8d-4f1a-9c2b-7d3e4f5a6b7c",
      status: "completed",
      result: "clean",
      clean: true,
      summary: {
        checked: 29,
        clean: 29,
        changed: 0,
        missingAtSource: 0,
        unverifiable: 0,
        requestsMade: 8,
        sampleRate: 0.2,
      },
      findings: [],
      error: null,
      startedAt: "2026-09-14T10:00:00Z",
      finishedAt: "2026-09-14T10:01:00Z",
      generatedAt: "2026-09-14T10:01:01Z",
    });
    expect(r.clean).toBe(true);
  });
});
