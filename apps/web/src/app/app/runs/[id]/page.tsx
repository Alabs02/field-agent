import Link from "next/link";
import { notFound } from "next/navigation";
import { RunListItemSchema, ScrapeJobStatusSchema } from "@field-agent/shared";
import { LiveScrapeRun } from "@/components/runs/live-run";
import { RunStatusPill, StatTile, VerifyCountsBar } from "@/components/runs/run-bits";
import { PageHeader } from "@/components/shared/page-header";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { fmtDateTime, fmtDuration } from "@/lib/format";

export const metadata = { title: "Run" };

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await apiFetch(`/runs/${id}`, RunListItemSchema).catch((e) => {
    if (e instanceof ApiRequestError && e.status === 404) notFound();
    throw e;
  });

  if (run.type === "verify") {
    return (
      <>
        <PageHeader eyebrow="Verification run" title={`Verification ${run.id.slice(0, 8)}`} actions={<Link href={`/app/verify/${run.id}`} className="text-sm underline">Open report →</Link>} />
        <div className="rounded-lg border border-line bg-bg-elev p-4">
          <div className="mb-3 flex items-center gap-3">
            <RunStatusPill status={run.status} />
            <span className="text-xs text-fg-muted">Sample rate {Math.round(run.sampleRate * 100)}% · {run.requestsMade} requests · {fmtDuration(run.durationMs)}</span>
          </div>
          <VerifyCountsBar counts={run.counts} />
        </div>
        <ErrorsTable errors={run.errors} />
      </>
    );
  }

  const status = await apiFetch(`/scrape/${run.id}`, ScrapeJobStatusSchema);
  return (
    <>
      <PageHeader
        eyebrow="Scrape run"
        title={`Scrape ${run.id.slice(0, 8)}`}
        description={`Queued ${fmtDateTime(run.queuedAt)}${run.triggeredBy ? ` by ${run.triggeredBy}` : ""} · attempt ${run.attemptsMade}`}
      />
      <div className="mb-4 rounded-lg border border-line bg-bg-elev p-4">
        <LiveScrapeRun initial={status} />
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatTile label="Brands refreshed" value={`${status.brandCounts.attempted - status.brandCounts.failed}/${status.brandCounts.attempted}`} hint="store pages fetched this run" tone={status.brandCounts.failed ? "warn" : undefined} />
        <StatTile label="Queue state" value={status.queueState} hint="what BullMQ reports for this job id" />
        <StatTile label="Options" value={<span className="text-sm font-normal">{JSON.stringify(status.options)}</span>} />
      </div>
      {status.error ? <p className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{status.error}</p> : null}
      <ErrorsTable errors={status.errors} />
    </>
  );
}

function ErrorsTable({ errors }: { errors: { stage: string; code: string; message: string; url: string | null; sourceId: string | null; at: string }[] }) {
  if (errors.length === 0) return <p className="text-sm text-fg-muted">No errors recorded.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-bg-elev">
      <table className="w-full text-sm">
        <thead className="bg-bg-muted text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
          <tr>
            <th className="px-4 py-2.5">When</th>
            <th className="px-4 py-2.5">Stage</th>
            <th className="px-4 py-2.5">Code</th>
            <th className="px-4 py-2.5">Record</th>
            <th className="px-4 py-2.5">Message</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {errors.map((e, i) => (
            <tr key={i}>
              <td className="whitespace-nowrap px-4 py-2 text-fg-muted tabular">{fmtDateTime(e.at)}</td>
              <td className="px-4 py-2">{e.stage}</td>
              <td className="px-4 py-2 font-mono text-xs">{e.code}</td>
              <td className="px-4 py-2 text-fg-muted">{e.sourceId ?? "—"}</td>
              <td className="max-w-md truncate px-4 py-2 text-fg-muted" title={e.message}>
                {e.url ? (
                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {e.message}
                  </a>
                ) : (
                  e.message
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
