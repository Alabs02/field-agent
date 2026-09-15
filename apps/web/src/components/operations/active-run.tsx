"use client";

import Link from "next/link";
import { paginated, RunListItemSchema } from "@field-agent/shared";
import { usePoll } from "@/lib/use-poll";

const schema = paginated(RunListItemSchema);

/** Header pill that stays visible on every page while a scrape or verification is queued or running. */
export function ActiveRunIndicator() {
  const running = usePoll("/runs?status=running&pageSize=1", schema, { intervalMs: 10_000 });
  const queued = usePoll("/runs?status=queued&pageSize=1", schema, { intervalMs: 10_000 });
  const run = running.data?.items[0] ?? queued.data?.items[0];
  if (!run) return null;
  const href = run.type === "verify" ? `/app/verify/${run.id}` : `/app/runs/${run.id}`;
  const label = `${run.type === "verify" ? "Verification" : "Scrape"} ${run.status === "queued" ? "queued" : "running"}`;
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-100 px-3 py-1 text-xs font-medium text-sky-900 hover:bg-sky-200 dark:border-sky-800 dark:bg-sky-900/40 dark:text-sky-100 dark:hover:bg-sky-900/60" aria-live="polite">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      {label}
      {run.type === "scrape" ? <span className="tabular text-sky-700 dark:text-sky-300">{run.progress}%</span> : null}
    </Link>
  );
}
