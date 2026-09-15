import { brandsRepo, findingsRepo, operationsRepo, promotionsRepo, runsRepo } from "@field-agent/db";
import { AuditQuerySchema, BrandsQuerySchema, FindingsQuerySchema, PromotionsQuerySchema, RunsQuerySchema, type ExportRequestSchema } from "@field-agent/shared";
import type { z } from "zod";
import type { AppDeps } from "../deps.js";
import { HttpError } from "../plugins/error-handler.js";

const MAX_EXPORT_ROWS = 10_000;
export const csvCell = (value: unknown) => {
  let text = value == null ? "Not available" : typeof value === "object" ? JSON.stringify(value) : String(value);
  if (typeof value !== "number" && /^[\s]*[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};
export const escapeHtml = (value: unknown) => String(value ?? "Not available").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]!);
const label = (key: string) => key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
export function flattenRow(row: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).flatMap(([key,value]) => {
    const name = prefix ? `${prefix} / ${label(key)}` : label(key);
    return value && typeof value === "object" && !Array.isArray(value) ? Object.entries(flattenRow(value as Record<string,unknown>,name)) : [[name,value]];
  }));
}

/**
 * Filters arrive verbatim from the screen's query string: empty fields from a GET form,
 * datetime-local values without an offset, and pagination keys. Normalise them so the
 * export matches exactly what the page showed instead of failing validation.
 */
export function normalizeExportFilters(filters: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(filters)) {
    const value = raw.trim();
    if (!value || ["page", "pageSize", "view"].includes(key)) continue;
    if (/(?:^|[a-z])(?:from|to)$/i.test(key) && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const ms = Date.parse(value);
      if (Number.isFinite(ms)) { out[key] = new Date(ms).toISOString(); continue; }
    }
    out[key] = value;
  }
  return out;
}

export async function generateExport(deps: AppDeps, request: z.infer<typeof ExportRequestSchema>, actor: string) {
  const portalId = deps.env.PORTAL_ID;
  const filters = normalizeExportFilters(request.filters);
  const fetchPage = async (page: number) => {
    const input = { ...filters, page, pageSize: 100 };
    switch (request.dataset) {
      case "promotions": return promotionsRepo.listPromotions(deps.db, portalId, PromotionsQuerySchema.parse(input), "America/Denver");
      case "brands": return brandsRepo.listBrands(deps.db, portalId, BrandsQuerySchema.parse(input));
      case "runs": return runsRepo.listRuns(deps.db, portalId, RunsQuerySchema.parse(input));
      case "findings": return findingsRepo.listFindings(deps.db, portalId, FindingsQuerySchema.parse(input));
      case "audit": return operationsRepo.listAudit(deps.db, portalId, AuditQuerySchema.parse(input));
    }
  };
  const first = await fetchPage(1);
  if (first.total > MAX_EXPORT_ROWS) throw new HttpError(413, "EXPORT_TOO_LARGE", `This export matches ${first.total} records. Narrow the filters to at most ${MAX_EXPORT_ROWS} records`);
  const items: object[] = [...first.items];
  for (let page=2; items.length < first.total; page++) {
    const next = await fetchPage(page);
    if (next.total !== first.total || next.items.length === 0) throw new HttpError(409, "CONFLICT", "The matching data changed while generating this export. Please retry");
    items.push(...next.items);
  }
  const generatedAt = new Date().toISOString();
  const metadata = { portal: "The Promenade Shops at Briargate", portalId, timezone: "America/Denver", generatedAt, dataset: request.dataset, filters: request.filters, total: first.total };
  const rows = items.map(item => flattenRow(item as Record<string,unknown>));
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  let body: string;
  if (request.format === "json") body = JSON.stringify({ metadata, items }, null, 2);
  else if (request.format === "csv") body = "\uFEFF" + [columns.map(csvCell).join(","), ...rows.map(row => columns.map(column => csvCell(row[column])).join(","))].join("\r\n");
  else body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(label(request.dataset))} report</title><style>body{font:12px/1.5 system-ui;color:#291d31;margin:28px}h1{font-size:26px}article{border-top:1px solid #ddd;padding:16px 0;break-inside:avoid}dl{display:grid;grid-template-columns:180px 1fr;gap:5px}dt{font-weight:600}dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}header{border-bottom:3px solid #6b4a7e;padding-bottom:15px}footer{margin-top:20px}@page{size:A4;margin:15mm}@media print{body{margin:0}a{color:inherit}}</style></head><body><header><h1>${escapeHtml(label(request.dataset))} report</h1><p>${escapeHtml(metadata.portal)} · ${escapeHtml(metadata.timezone)}</p><p>Generated ${escapeHtml(generatedAt)} · ${metadata.total} matching records</p><p>Filters: ${escapeHtml(JSON.stringify(request.filters))}</p></header>${rows.map((row,index)=>`<article><h2>Record ${index+1}</h2><dl>${Object.entries(row).map(([key,value])=>`<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(typeof value === "object" && value != null ? JSON.stringify(value,null,2) : value)}</dd>`).join("")}</dl></article>`).join("")}<footer>Historical observations reflect the source at the recorded time. Use your browser's Print command to print or save as PDF.</footer></body></html>`;
  await operationsRepo.appendAudit(deps.db, { portalId, eventKey: crypto.randomUUID(), actor, action: "export.generated", entityType: "export", entityId: request.dataset,
    label: `${label(request.dataset)} ${request.format.toUpperCase()}`, message: "Export generated", after: metadata });
  return { body, contentType: request.format === "json" ? "application/json" : request.format === "csv" ? "text/csv; charset=utf-8" : "text/html; charset=utf-8",
    filename: `field-agent-${request.dataset}-${generatedAt.slice(0,10)}.${request.format === "print" ? "html" : request.format}` };
}
