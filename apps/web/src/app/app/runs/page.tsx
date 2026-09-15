import Link from "next/link";
import { Suspense } from "react";
import { paginated, RUN_STATUSES, RunListItemSchema } from "@field-agent/shared";
import { ExportMenu } from "@/components/operations/export-menu";
import { RunsChart } from "@/components/runs/runs-chart";
import { ScrapeButton } from "@/components/runs/job-buttons";
import { LaunchDialog } from "@/components/runs/launch-dialog";
import { RunStatusPill, StatTile } from "@/components/runs/run-bits";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterForm } from "@/components/shared/filter-form";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { apiFetch } from "@/lib/api";
import { fmtDateTime, fmtDuration, toIsoParam } from "@/lib/format";

export const metadata = { title: "Runs" };

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  completed_with_errors: "Completed with errors",
  failed: "Failed",
  stalled: "Stalled",
  cancelled: "Cancelled",
};

type Params = { type?: string; status?: string; from?: string; to?: string; page?: string; pageSize?: string };

export default async function RunsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const q = await searchParams;
  const pageSize = Math.min(100, Math.max(1, Number(q.pageSize) || 20));
  const filters = { type: q.type || undefined, status: q.status || undefined, from: toIsoParam(q.from), to: toIsoParam(q.to) };
  const [runs, lastScrapePage, lastVerifyPage] = await Promise.all([
    apiFetch("/runs", paginated(RunListItemSchema), { searchParams: { ...filters, page: Number(q.page) || 1, pageSize } }),
    apiFetch("/runs", paginated(RunListItemSchema), { searchParams: { type: "scrape", pageSize: 1 } }),
    apiFetch("/runs", paginated(RunListItemSchema), { searchParams: { type: "verify", pageSize: 1 } }),
  ]);
  const lastScrape = lastScrapePage.items[0];
  const lastVerify = lastVerifyPage.items[0];
  const scrapes = runs.items.filter((r) => r.type === "scrape");
  const reqTotal = runs.items.reduce((n, r) => n + r.requestsMade, 0);
  const filtered = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader
        eyebrow="Run health"
        title="Runs"
        description="Did last night's run actually do what it claims? Every scrape and verification, with its counts, requests, and errors."
        actions={
          <>
            <ExportMenu dataset="runs" />
            <LaunchDialog job="verify" />
            <LaunchDialog job="scrape" />
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Last scrape"
          value={lastScrape ? <RunStatusPill status={lastScrape.status} /> : "None yet"}
          hint={lastScrape && lastScrape.type === "scrape" ? `${lastScrape.counts.attempted} attempted · ${lastScrape.counts.failed} failed · ${fmtDateTime(lastScrape.finishedAt ?? lastScrape.queuedAt)}` : "No scrape yet"}
        />
        <StatTile
          label="Last verification"
          value={lastVerify ? <RunStatusPill status={lastVerify.status} /> : "None yet"}
          hint={lastVerify && lastVerify.type === "verify" ? `${lastVerify.counts.checked} checked · ${lastVerify.counts.changed + lastVerify.counts.missingAtSource} discrepancies` : "No verification yet"}
        />
        <StatTile label={filtered ? "Runs matching filters" : "Runs recorded"} value={runs.total} hint={`${lastScrapePage.total} scrapes · ${lastVerifyPage.total} verifications in total`} />
        <StatTile label="Requests to portal" value={reqTotal} hint={`Across the ${runs.items.length} runs on this page (politeness evidence)`} />
      </div>

      <FilterForm
        clearHref="/app/runs"
        pageSize={pageSize}
        pageSizes={[20, 50, 100]}
        fields={[
          { name: "type", label: "Type", type: "select", value: q.type, options: [{ value: "", label: "Scrapes and verifications" }, { value: "scrape", label: "Scrapes" }, { value: "verify", label: "Verifications" }] },
          { name: "status", label: "Status", type: "select", value: q.status, options: [{ value: "", label: "Any status" }, ...RUN_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] ?? s }))] },
          { name: "from", label: "Queued from", type: "datetime-local", value: q.from },
          { name: "to", label: "Queued to", type: "datetime-local", value: q.to },
        ]}
      />

      {runs.items.length === 0 ? (
        filtered ? (
          <EmptyState title="No runs match these filters" description="Widen the date range or clear the status filter." />
        ) : (
          <EmptyState title="No runs yet" description="Start a scrape to see run health here." action={<ScrapeButton />} />
        )
      ) : (
        <>
          {scrapes.length > 0 ? (
            <div className="mb-6 rounded-lg border border-line bg-bg-elev p-4">
              <h2 className="mb-3 text-sm font-semibold">Scrape outcomes per run</h2>
              <RunsChart runs={scrapes.slice(0, 12).reverse()} />
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-lg border border-line bg-bg-elev">
            <table className="w-full text-sm">
              <thead className="bg-bg-muted text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
                <tr>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Queued</th>
                  <th className="px-4 py-2.5">Duration</th>
                  <th className="px-4 py-2.5">Outcome</th>
                  <th className="px-4 py-2.5 text-right">Requests</th>
                  <th className="px-4 py-2.5">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {runs.items.map((r) => (
                  <tr key={r.id} className="hover:bg-bg-muted/60">
                    <td className="px-4 py-2.5">
                      <Link href={r.type === "verify" ? `/app/verify/${r.id}` : `/app/runs/${r.id}`} className="font-medium hover:text-accent">
                        {r.type === "scrape" ? "Scrape" : "Verification"}
                      </Link>
                      {r.parentRunId ? <span className="ml-2 text-[10px] uppercase tracking-wide text-fg-subtle">retry</span> : null}
                      {r.cycleId ? <span className="ml-2 text-[10px] uppercase tracking-wide text-fg-subtle">scheduled</span> : null}
                    </td>
                    <td className="px-4 py-2.5">
                      <RunStatusPill status={r.status} />
                      {r.cancelRequestedAt && !["cancelled", "completed", "completed_with_errors", "failed"].includes(r.status) ? <span className="ml-2 text-xs text-fg-muted">cancellation requested</span> : null}
                    </td>
                    <td className="px-4 py-2.5 text-fg-muted tabular">{fmtDateTime(r.queuedAt)}</td>
                    <td className="px-4 py-2.5 text-fg-muted tabular">{fmtDuration(r.durationMs)}</td>
                    <td className="px-4 py-2.5 text-fg-muted tabular">
                      {r.type === "scrape"
                        ? `${r.counts.persisted} new · ${r.counts.updated} updated · ${r.counts.skipped} unchanged · ${r.counts.failed} failed`
                        : `${r.counts.clean} clean · ${r.counts.changed} drifted · ${r.counts.missingAtSource} gone · ${r.counts.unverifiable} unverifiable`}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular">{r.requestsMade}</td>
                    <td className="px-4 py-2.5 text-fg-muted">{r.triggeredBy ?? "Not recorded"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Suspense>
            <Pagination page={runs.page} totalPages={runs.totalPages} total={runs.total} pageSize={runs.pageSize} />
          </Suspense>
        </>
      )}
    </>
  );
}
