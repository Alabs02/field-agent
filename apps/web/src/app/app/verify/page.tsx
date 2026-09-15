import Link from "next/link";
import { Suspense } from "react";
import { FindingSchema, paginated, RunListItemSchema } from "@field-agent/shared";
import { ExportMenu } from "@/components/operations/export-menu";
import { VerifyButton } from "@/components/runs/job-buttons";
import { RunStatusPill } from "@/components/runs/run-bits";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterForm } from "@/components/shared/filter-form";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { FIELD_LABEL, FindingCard } from "@/components/verify/finding-card";
import { apiFetch } from "@/lib/api";
import { fmtDateTime, fmtDuration } from "@/lib/format";

export const metadata = { title: "Verification" };

type Params = { outcome?: string; brand?: string; field?: string; search?: string; runId?: string; page?: string; pageSize?: string };

export default async function VerifyIndexPage({ searchParams }: { searchParams: Promise<Params> }) {
  const q = await searchParams;
  const pageSize = Math.min(100, Math.max(1, Number(q.pageSize) || 20));
  const filters = { outcome: q.outcome || undefined, brand: q.brand || undefined, field: q.field || undefined, search: q.search || undefined, runId: q.runId || undefined };
  const [runs, findings] = await Promise.all([
    apiFetch("/runs", paginated(RunListItemSchema), { searchParams: { type: "verify", pageSize: 10 } }),
    apiFetch("/findings", paginated(FindingSchema), { searchParams: { ...filters, page: Number(q.page) || 1, pageSize } }),
  ]);
  const filtered = Object.values(filters).some(Boolean);
  return (
    <>
      <PageHeader
        eyebrow="Verification"
        title="Does what we stored still match the source?"
        description="Each run re-checks persisted promotions against the live portal and reports exactly which records changed, disappeared, or could not be checked."
        actions={
          <>
            <VerifyButton />
            <VerifyButton full />
          </>
        }
      />
      {runs.items.length === 0 ? (
        <EmptyState title="No verification runs yet" description="Run one to get a discrepancy report. It costs a handful of requests, not a full re-scrape." action={<VerifyButton />} />
      ) : (
        <section className="mb-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-semibold">Recent runs</h2>
            <Link href="/app/runs?type=verify" className="text-sm text-fg-muted underline-offset-4 hover:underline">
              All {runs.total} verification runs
            </Link>
          </div>
          <div className="overflow-x-auto rounded-lg border border-line bg-bg-elev">
            <table className="w-full text-sm">
              <thead className="bg-bg-muted text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
                <tr>
                  <th className="px-4 py-2.5">Run</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Queued</th>
                  <th className="px-4 py-2.5">Duration</th>
                  <th className="px-4 py-2.5">Checked</th>
                  <th className="px-4 py-2.5">Drifted</th>
                  <th className="px-4 py-2.5">Gone</th>
                  <th className="px-4 py-2.5">Unverifiable</th>
                  <th className="px-4 py-2.5 text-right">Requests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {runs.items.map((r) =>
                  r.type === "verify" ? (
                    <tr key={r.id} className="hover:bg-bg-muted/60">
                      <td className="px-4 py-2.5">
                        <Link href={`/app/verify/${r.id}`} className="font-mono text-xs hover:text-accent">
                          {r.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <RunStatusPill status={r.status} />
                      </td>
                      <td className="px-4 py-2.5 text-fg-muted tabular">{fmtDateTime(r.queuedAt)}</td>
                      <td className="px-4 py-2.5 text-fg-muted tabular">{fmtDuration(r.durationMs)}</td>
                      <td className="px-4 py-2.5 tabular">{r.counts.checked}</td>
                      <td className="px-4 py-2.5 tabular">{r.counts.changed}</td>
                      <td className="px-4 py-2.5 tabular">{r.counts.missingAtSource}</td>
                      <td className="px-4 py-2.5 tabular">{r.counts.unverifiable}</td>
                      <td className="px-4 py-2.5 text-right tabular">{r.requestsMade}</td>
                    </tr>
                  ) : null,
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Findings</h2>
            <p className="text-sm text-fg-muted">Historical observations recorded at the time of each check. {findings.total} match{findings.total === 1 ? "es" : ""} the current filters.</p>
          </div>
          <ExportMenu dataset="findings" />
        </div>
        <FilterForm
          clearHref="/app/verify"
          pageSize={pageSize}
          pageSizes={[20, 50, 100]}
          preserve={{ runId: q.runId }}
          fields={[
            { name: "search", label: "Search title", value: q.search, placeholder: "Promotion title" },
            {
              name: "outcome",
              label: "Outcome",
              type: "select",
              value: q.outcome,
              options: [
                { value: "", label: "Any outcome" },
                { value: "changed", label: "Drifted" },
                { value: "missing_at_source", label: "Gone from source" },
                { value: "unverifiable", label: "Could not verify" },
                { value: "clean", label: "Clean" },
              ],
            },
            { name: "brand", label: "Brand", value: q.brand, placeholder: "Name or slug" },
            { name: "field", label: "Changed field", type: "select", value: q.field, options: [{ value: "", label: "Any field" }, ...Object.entries(FIELD_LABEL).map(([value, label]) => ({ value, label }))] },
          ]}
        />
        {q.runId ? (
          <p className="mb-3 text-sm text-fg-muted">
            Showing findings from run <span className="font-mono text-xs">{q.runId.slice(0, 8)}</span> only.{" "}
            <Link href="/app/verify" className="underline-offset-4 hover:underline">
              Show every run
            </Link>
          </p>
        ) : null}
        {findings.items.length === 0 ? (
          <EmptyState title={filtered ? "No findings match these filters" : "No findings recorded yet"} description={filtered ? "Try another outcome or clear the search." : "Findings appear here after the first verification run."} />
        ) : (
          <div className="flex flex-col gap-3">
            {findings.items.map((f) => (
              <FindingCard key={f.id} f={f} showRun />
            ))}
          </div>
        )}
        <Suspense>
          <Pagination page={findings.page} totalPages={findings.totalPages} total={findings.total} pageSize={findings.pageSize} />
        </Suspense>
      </section>
    </>
  );
}
