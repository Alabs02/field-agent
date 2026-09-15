import Link from "next/link";
import { Suspense } from "react";
import { AuditEventSchema, paginated } from "@field-agent/shared";
import { ExportMenu } from "@/components/operations/export-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterForm } from "@/components/shared/filter-form";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { fmtDateTime, toIsoParam } from "@/lib/format";

export const metadata = { title: "Audit trail" };

type Params = { search?: string; actor?: string; action?: string; entityType?: string; entityId?: string; runId?: string; severity?: string; from?: string; to?: string; page?: string; pageSize?: string };

const ENTITY_OPTIONS = [
  { value: "", label: "Everything" },
  { value: "promotions", label: "Promotions (stored record changes)" },
  { value: "brands", label: "Brands" },
  { value: "verification_findings", label: "Verification observations" },
  { value: "scrape_runs,verification_runs,run", label: "Runs" },
  { value: "schedule,schedule_cycle", label: "Schedule" },
  { value: "export", label: "Exports" },
  { value: "user", label: "Users and roles" },
];

const SEVERITY_TONE = { info: "neutral", success: "ok", warning: "warn", error: "bad" } as const;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Params> }) {
  const q = await searchParams;
  const pageSize = Math.min(100, Math.max(1, Number(q.pageSize) || 50));
  const filters = {
    search: q.search || undefined,
    actor: q.actor || undefined,
    action: q.action || undefined,
    entityType: q.entityType || undefined,
    entityId: q.entityId || undefined,
    runId: q.runId || undefined,
    severity: q.severity || undefined,
    from: toIsoParam(q.from),
    to: toIsoParam(q.to),
  };
  const result = await apiFetch("/audit", paginated(AuditEventSchema), { searchParams: { ...filters, page: Number(q.page) || 1, pageSize } });
  const filtered = Object.values(filters).some(Boolean);
  return (
    <>
      <PageHeader
        eyebrow="Evidence"
        title="Audit trail"
        description="A chronological, append-only record of operational actions and observed changes. Detailed history begins with this upgrade; older runs predate it and have no reconstructed events."
        actions={<ExportMenu dataset="audit" />}
      />
      <FilterForm
        clearHref="/app/audit"
        pageSize={pageSize}
        pageSizes={[50, 100]}
        preserve={{ entityId: q.entityId, runId: q.runId }}
        fields={[
          { name: "search", label: "Search", value: q.search, placeholder: "Label or message" },
          { name: "entityType", label: "What", type: "select", value: q.entityType, options: ENTITY_OPTIONS },
          { name: "action", label: "Action", value: q.action, placeholder: "e.g. promotion.updated" },
          { name: "actor", label: "Actor", value: q.actor, placeholder: "Email, schedule, system" },
          {
            name: "severity",
            label: "Severity",
            type: "select",
            value: q.severity,
            options: [
              { value: "", label: "Any" },
              { value: "info", label: "Info" },
              { value: "success", label: "Success" },
              { value: "warning", label: "Warning" },
              { value: "error", label: "Error" },
            ],
          },
          { name: "from", label: "From", type: "datetime-local", value: q.from },
          { name: "to", label: "To", type: "datetime-local", value: q.to },
        ]}
      />
      {q.entityId || q.runId ? (
        <p className="mb-3 text-sm text-fg-muted">
          Showing events for {q.runId ? `run ${q.runId.slice(0, 8)}` : `one record`} only.{" "}
          <Link href="/app/audit" className="underline-offset-4 hover:underline">
            Show everything
          </Link>
        </p>
      ) : null}
      {result.items.length === 0 ? (
        <EmptyState title={filtered ? "No events match these filters" : "No events recorded yet"} description={filtered ? "Widen the date range or clear a filter." : "Events appear as runs, scrapes and configuration changes happen."} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-bg-elev">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-muted text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
              <tr>
                <th className="px-4 py-2.5">Observed (Denver)</th>
                <th className="px-4 py-2.5">Action and entity</th>
                <th className="px-4 py-2.5">Actor</th>
                <th className="px-4 py-2.5">Severity</th>
                <th className="px-4 py-2.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {result.items.map((event) => (
                <tr key={event.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-fg-muted tabular">{fmtDateTime(event.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{event.action.replaceAll(".", " · ").replaceAll("_", " ")}</div>
                    {event.href ? (
                      <Link className="text-fg-muted underline-offset-4 hover:underline" href={event.href}>
                        {event.label}
                      </Link>
                    ) : (
                      <p className="text-fg-muted">{event.label}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{event.actor}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={SEVERITY_TONE[event.severity]}>{event.severity}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <details>
                      <summary className="cursor-pointer text-fg-muted">{event.message}</summary>
                      <pre className="mt-2 max-w-xl overflow-auto whitespace-pre-wrap rounded-md bg-bg-muted p-2 text-xs">{JSON.stringify({ before: event.before, after: event.after, runId: event.runId, eventKey: event.eventKey }, null, 2)}</pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Suspense>
        <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} />
      </Suspense>
    </>
  );
}
