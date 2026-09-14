import Link from "next/link";
import { paginated, RunListItemSchema } from "@field-agent/shared";
import { RunsChart } from "@/components/runs/runs-chart";
import { ScrapeButton, VerifyButton } from "@/components/runs/job-buttons";
import { RunStatusPill, StatTile } from "@/components/runs/run-bits";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { apiFetch } from "@/lib/api";
import { fmtDateTime, fmtDuration } from "@/lib/format";

export const metadata = { title: "Runs" };

export default async function RunsPage() {
  const runs = await apiFetch("/runs", paginated(RunListItemSchema), { searchParams: { pageSize: 50 } });
  const scrapes = runs.items.filter((r) => r.type === "scrape");
  const verifies = runs.items.filter((r) => r.type === "verify");
  const lastScrape = scrapes[0];
  const lastVerify = verifies[0];
  const reqTotal = runs.items.reduce((n, r) => n + r.requestsMade, 0);

  return (
    <>
      <PageHeader
        eyebrow="Run health"
        title="Runs"
        description="Did last night's run actually do what it claims? Every scrape and verification, with its counts, requests, and errors."
        actions={
          <>
            <VerifyButton />
            <ScrapeButton />
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Last scrape"
          value={lastScrape ? <RunStatusPill status={lastScrape.status} /> : "—"}
          hint={lastScrape ? `${lastScrape.counts.attempted} attempted · ${lastScrape.counts.failed} failed · ${fmtDateTime(lastScrape.finishedAt ?? lastScrape.queuedAt)}` : "No scrape yet"}
        />
        <StatTile
          label="Last verification"
          value={lastVerify ? <RunStatusPill status={lastVerify.status} /> : "—"}
          hint={lastVerify ? `${lastVerify.counts.checked} checked · ${lastVerify.counts.changed + lastVerify.counts.missingAtSource} discrepancies` : "No verification yet"}
        />
        <StatTile label="Runs recorded" value={runs.total} hint={`${scrapes.length} scrapes · ${verifies.length} verifications`} />
        <StatTile label="Requests to portal" value={reqTotal} hint="Across all recorded runs (politeness evidence)" />
      </div>

      {runs.items.length === 0 ? (
        <EmptyState title="No runs yet" description="Start a scrape to see run health here." action={<ScrapeButton />} />
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
                    </td>
                    <td className="px-4 py-2.5">
                      <RunStatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-2.5 text-fg-muted tabular">{fmtDateTime(r.queuedAt)}</td>
                    <td className="px-4 py-2.5 text-fg-muted tabular">{fmtDuration(r.durationMs)}</td>
                    <td className="px-4 py-2.5 text-fg-muted tabular">
                      {r.type === "scrape"
                        ? `${r.counts.persisted} new · ${r.counts.updated} updated · ${r.counts.skipped} unchanged · ${r.counts.failed} failed`
                        : `${r.counts.clean} clean · ${r.counts.changed} drifted · ${r.counts.missingAtSource} gone · ${r.counts.unverifiable} unverifiable`}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular">{r.requestsMade}</td>
                    <td className="px-4 py-2.5 text-fg-muted">{r.triggeredBy ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
