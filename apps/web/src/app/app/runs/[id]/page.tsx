import Link from "next/link";
import { notFound } from "next/navigation";
import { RunListItemSchema, ScrapeJobStatusSchema, type RunError, type RunListItem, type ScrapeOptions } from "@field-agent/shared";
import { LiveScrapeRun } from "@/components/runs/live-run";
import { RunActions } from "@/components/runs/run-actions";
import { RunStatusPill, StatTile, VerifyCountsBar } from "@/components/runs/run-bits";
import { PageHeader } from "@/components/shared/page-header";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { fmtDateTime, fmtDuration, relative } from "@/lib/format";

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
        <PageHeader
          eyebrow="Verification run"
          title={`Verification ${run.id.slice(0, 8)}`}
          description={`Queued ${fmtDateTime(run.queuedAt)}${initiator(run)} · attempt ${run.attemptsMade}`}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <RunActions runId={run.id} type="verify" status={run.status} cancelRequestedAt={run.cancelRequestedAt} parentRunId={run.parentRunId} />
              <Link href={`/app/verify/${run.id}`} className="text-sm underline">
                Open report
              </Link>
            </div>
          }
        />
        <div className="mb-4 rounded-lg border border-line bg-bg-elev p-4">
          <div className="mb-3 flex items-center gap-3">
            <RunStatusPill status={run.status} />
            <span className="text-xs text-fg-muted">Sample rate {Math.round(run.sampleRate * 100)}% · {run.requestsMade} requests · {fmtDuration(run.durationMs)}</span>
          </div>
          <VerifyCountsBar counts={run.counts} />
        </div>
        <RunFacts run={run} />
        {run.error ? <p className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{run.error}</p> : null}
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
        description={`Queued ${fmtDateTime(run.queuedAt)}${initiator(run)} · attempt ${run.attemptsMade}`}
        actions={<RunActions runId={run.id} type="scrape" status={status.effectiveStatus} cancelRequestedAt={run.cancelRequestedAt} parentRunId={run.parentRunId} />}
      />
      <div className="mb-4 rounded-lg border border-line bg-bg-elev p-4">
        <LiveScrapeRun initial={status} />
      </div>
      <RunFacts run={run} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatTile label="Brands refreshed" value={`${status.brandCounts.attempted - status.brandCounts.failed}/${status.brandCounts.attempted}`} hint="store pages fetched this run" tone={status.brandCounts.failed ? "warn" : undefined} />
        <StatTile label="Queue state" value={status.queueState} hint="what BullMQ reports for this job id" />
        <StatTile label="Options" value={<span className="text-sm font-normal">{describeOptions(status.options)}</span>} />
      </div>
      {status.error ? <p className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{status.error}</p> : null}
      <ErrorsTable errors={status.errors} />
    </>
  );
}

function initiator(run: RunListItem): string {
  if (!run.triggeredBy) return "";
  return run.cycleId ? ` by ${run.triggeredBy} (scheduled cycle)` : ` by ${run.triggeredBy}`;
}

function describeOptions(options: ScrapeOptions): string {
  const parts = [options.force ? "Full refresh" : "Incremental refresh"];
  if (!options.fetchDetails) parts.push("listing only");
  if (!options.fetchBrands) parts.push("brands skipped");
  if (options.maxItems != null) parts.push(`capped at ${options.maxItems} items`);
  return parts.join(" · ");
}

/** Facts the operator asks for first: liveness, timing, budget, and why the run may have paused. */
function RunFacts({ run }: { run: RunListItem }) {
  const active = run.status === "running" || run.status === "queued";
  const elapsed = run.durationMs != null ? fmtDuration(run.durationMs) : run.startedAt ? `Started ${relative(run.startedAt)}` : "Not started";
  const heartbeat = run.heartbeatAt ? `${relative(run.heartbeatAt)} (${fmtDateTime(run.heartbeatAt)})` : "No heartbeat recorded";
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile label="Heartbeat" value={<span className="text-base font-medium">{heartbeat}</span>} hint={active ? "The worker writes one every 15 seconds" : "Last write from the worker"} />
      <StatTile label="Elapsed" value={<span className="text-base font-medium">{elapsed}</span>} hint={run.finishedAt ? `Finished ${fmtDateTime(run.finishedAt)}` : undefined} />
      <StatTile label="Source requests" value={run.requestsMade} hint={`${run.attemptsMade} attempt${run.attemptsMade === 1 ? "" : "s"} on the queue`} />
      <StatTile label="Cooldown reason" value={<span className="text-base font-medium">{cooldownReason(run.errors)}</span>} hint={run.cycleId ? "Part of a scheduled cycle" : "Manual launch"} />
    </div>
  );
}

/** Derived from the errors the fetcher already records; no separate plumbing for the waiting state. */
function cooldownReason(errors: RunError[]): string {
  const blocked = errors.find((e) => e.code === "source_blocked");
  if (blocked) return "Source served an anti-bot challenge; the run stopped and kept the page for review";
  const slowDown = [...errors].reverse().find((e) => e.code === "http_error" && /HTTP (429|503)\b/.test(e.message));
  if (slowDown) return `Source asked us to slow down (${/HTTP (429|503)/.exec(slowDown.message)?.[0] ?? "HTTP 429"}); requests paused per its Retry-After`;
  const timeouts = errors.filter((e) => e.code === "fetch_timeout").length;
  if (timeouts) return `${timeouts} request${timeouts === 1 ? "" : "s"} timed out; each was retried once after waiting its turn`;
  return "None recorded";
}

function ErrorsTable({ errors }: { errors: RunError[] }) {
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
              <td className="px-4 py-2 text-fg-muted">{e.sourceId ?? "Not applicable"}</td>
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
