import { beforeEach, describe, expect, it, vi } from "vitest";

const listRuns = vi.fn();
const appendAudit = vi.fn();
vi.mock("@field-agent/db", () => ({
  runsRepo: { listRuns: (...args: unknown[]) => listRuns(...args) },
  operationsRepo: { appendAudit: (...args: unknown[]) => appendAudit(...args), listAudit: vi.fn() },
  promotionsRepo: { listPromotions: vi.fn() },
  brandsRepo: { listBrands: vi.fn() },
  findingsRepo: { listFindings: vi.fn() },
}));

import { csvCell, escapeHtml, flattenRow, generateExport, normalizeExportFilters } from "../src/services/export.js";
import { HttpError } from "../src/plugins/error-handler.js";

const deps = { env: { PORTAL_ID: "briargate" }, db: {} } as unknown as Parameters<typeof generateExport>[0];
const row = (i: number) => ({ id: `run-${i}`, type: "scrape", status: "completed", queuedAt: "2026-09-15T00:00:00.000Z", counts: { attempted: i, failed: 0 } });

describe("export encoding", () => {
  it("escapes CSV and neutralizes spreadsheet formulas including whitespace prefixes", () => {
    expect(csvCell('A, "quoted" value\nnext')).toBe('"A, ""quoted"" value\nnext"');
    for (const value of ["=1+1", "+SUM(A1)", "-cmd", "@formula", "  =1"]) expect(csvCell(value)).toContain("'");
    expect(csvCell(-12)).toBe('"-12"');
  });
  it("preserves nested values and escapes source evidence in print output", () => {
    expect(flattenRow({ brand: { name: "A" }, evidence: [{ before: "old", after: "new" }] })).toEqual({ "Brand / Name": "A", Evidence: [{ before: "old", after: "new" }] });
    expect(escapeHtml('<script>alert("x")</script>')).not.toContain("<script>");
  });
});

describe("export filters", () => {
  it("drops blank form fields and pagination keys, and normalises datetime-local values", () => {
    expect(normalizeExportFilters({ type: "", status: "failed", page: "3", pageSize: "50", view: "table", from: "2026-09-15T04:00", to: "", search: " promo " })).toEqual({
      status: "failed",
      from: new Date("2026-09-15T04:00").toISOString(),
      search: "promo",
    });
  });
  it("leaves date-only values (the promotions date filters) and ordinary text alone", () => {
    expect(normalizeExportFilters({ startDate: "2026-09-01", endDate: "2026-09-30", brand: "victoria-s-secret" })).toEqual({ startDate: "2026-09-01", endDate: "2026-09-30", brand: "victoria-s-secret" });
  });
});

describe("export assembly", () => {
  beforeEach(() => {
    listRuns.mockReset();
    appendAudit.mockReset();
  });

  it("walks every page so the export matches the screen's total, then records one audit event", async () => {
    const total = 250;
    listRuns.mockImplementation(async (_db: unknown, _portal: string, q: { page: number; pageSize: number }) => ({
      total,
      items: Array.from({ length: Math.min(q.pageSize, total - (q.page - 1) * q.pageSize) }, (_, i) => row((q.page - 1) * q.pageSize + i)),
    }));
    const out = await generateExport(deps, { dataset: "runs", format: "csv", filters: { status: "completed", page: "9" } }, "tester@example.com");
    expect(listRuns).toHaveBeenCalledTimes(3);
    expect(listRuns.mock.calls[0]?.[2]).toMatchObject({ status: "completed", page: 1, pageSize: 100 });
    expect(out.body.split("\r\n")).toHaveLength(total + 1);
    expect(out.contentType).toContain("text/csv");
    expect(appendAudit).toHaveBeenCalledTimes(1);
    expect(appendAudit.mock.calls[0]?.[1]).toMatchObject({ action: "export.generated", actor: "tester@example.com", after: { total, dataset: "runs" } });
  });

  it("refuses oversized exports explicitly instead of truncating", async () => {
    listRuns.mockResolvedValue({ total: 10_001, items: [row(0)] });
    await expect(generateExport(deps, { dataset: "runs", format: "json", filters: {} }, "tester")).rejects.toSatisfy((e: unknown) => e instanceof HttpError && e.code === "EXPORT_TOO_LARGE");
    expect(appendAudit).not.toHaveBeenCalled();
  });

  it("stops when the matching set changes between pages", async () => {
    listRuns.mockResolvedValueOnce({ total: 150, items: Array.from({ length: 100 }, (_, i) => row(i)) }).mockResolvedValueOnce({ total: 149, items: Array.from({ length: 49 }, (_, i) => row(100 + i)) });
    await expect(generateExport(deps, { dataset: "runs", format: "json", filters: {} }, "tester")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("wraps JSON exports with metadata and prints a self-contained report", async () => {
    listRuns.mockResolvedValue({ total: 1, items: [row(1)] });
    const json = await generateExport(deps, { dataset: "runs", format: "json", filters: { status: "completed" } }, "tester");
    const parsed = JSON.parse(json.body) as { metadata: Record<string, unknown>; items: unknown[] };
    expect(parsed.metadata).toMatchObject({ portalId: "briargate", timezone: "America/Denver", filters: { status: "completed" }, total: 1 });
    expect(parsed.items).toHaveLength(1);
    const html = await generateExport(deps, { dataset: "runs", format: "print", filters: {} }, "tester");
    expect(html.contentType).toContain("text/html");
    expect(html.body).toContain("Runs report");
    expect(html.body).toContain("America/Denver");
    expect(html.body).toContain("1 matching records");
  });
});
