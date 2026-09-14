"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isTerminalStatus, ScrapeJobStatusSchema, type ScrapeJobStatus } from "@field-agent/shared";
import { usePoll } from "@/lib/use-poll";
import { CountsBar, PhaseTimeline, RunStatusPill } from "./run-bits";
import { fmtDuration, relative } from "@/lib/format";

/** Polls one scrape job while it is running and refreshes the server-rendered page when it ends. */
export function LiveScrapeRun({ initial }: { initial: ScrapeJobStatus }) {
  const router = useRouter();
  const active = !isTerminalStatus(initial.effectiveStatus) && initial.effectiveStatus !== "stalled";
  const { data, live } = usePoll(active ? `/scrape/${initial.id}` : null, ScrapeJobStatusSchema, {
    initial,
    until: (s) => isTerminalStatus(s.effectiveStatus),
  });
  const run = data ?? initial;

  useEffect(() => {
    if (active && !live) router.refresh();
  }, [active, live, router]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <RunStatusPill status={run.effectiveStatus} pulse />
        <PhaseTimeline phase={run.phase} status={run.effectiveStatus} />
        <span className="ml-auto text-xs text-fg-muted tabular">
          {run.progress}% · {run.requestsMade} requests · {run.finishedAt ? fmtDuration(run.durationMs) : `started ${relative(run.startedAt)}`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-muted">
        <div className="h-full bg-accent transition-[width] duration-700" style={{ width: `${run.progress}%` }} />
      </div>
      <CountsBar counts={run.counts} />
      {run.effectiveStatus === "stalled" ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          The worker stopped reporting {relative(run.heartbeatAt)}. The API is still up; when a worker returns the job resumes on its next attempt.
        </p>
      ) : null}
    </div>
  );
}
