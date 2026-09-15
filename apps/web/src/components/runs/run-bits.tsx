import type { RunStatus, ScrapeCounts, ScrapePhase, VerificationCounts } from "@field-agent/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS: Record<RunStatus, { label: string; tone: "neutral" | "brand" | "ok" | "warn" | "bad" | "accent" }> = {
  queued: { label: "Queued", tone: "neutral" },
  running: { label: "Running", tone: "brand" },
  completed: { label: "Completed", tone: "ok" },
  completed_with_errors: { label: "Completed with errors", tone: "warn" },
  failed: { label: "Failed", tone: "bad" },
  stalled: { label: "Stalled", tone: "bad" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export function RunStatusPill({ status, pulse }: { status: RunStatus; pulse?: boolean }) {
  const s = STATUS[status];
  return (
    <Badge tone={s.tone} className="gap-1.5">
      {pulse && (status === "running" || status === "queued") ? (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      ) : null}
      {s.label}
    </Badge>
  );
}

const PHASES: ScrapePhase[] = ["discover", "listing", "details", "brands", "finalize", "done"];
const PHASE_LABEL: Record<ScrapePhase, string> = { queued: "Queued", discover: "Discover", listing: "Listing", details: "Details", brands: "Brands", finalize: "Finalize", done: "Done" };

export function PhaseTimeline({ phase, status }: { phase: ScrapePhase; status: RunStatus }) {
  const idx = PHASES.indexOf(phase);
  return (
    <ol className="flex items-center gap-1 text-[11px]">
      {PHASES.filter((p) => p !== "done").map((p, i) => {
        const done = idx > i || status === "completed" || status === "completed_with_errors";
        const current = idx === i && status === "running";
        return (
          <li key={p} className="flex items-center gap-1">
            <span
              className={cn(
                "rounded-full px-2 py-0.5",
                done && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
                current && "bg-sky-100 text-sky-900 ring-1 ring-sky-300 dark:bg-sky-900/40 dark:text-sky-100 dark:ring-sky-800",
                !done && !current && "bg-bg-muted text-fg-subtle",
              )}
            >
              {PHASE_LABEL[p]}
            </span>
            {i < PHASES.length - 2 ? <span className="h-px w-3 bg-line-strong" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function CountsBar({ counts }: { counts: ScrapeCounts }) {
  const segs = [
    { key: "persisted", label: "New", v: counts.persisted, cls: "bg-emerald-500" },
    { key: "updated", label: "Updated", v: counts.updated, cls: "bg-sky-500" },
    { key: "skipped", label: "Unchanged", v: counts.skipped, cls: "bg-sand-400" },
    { key: "failed", label: "Failed", v: counts.failed, cls: "bg-red-500" },
  ];
  const total = Math.max(1, counts.attempted);
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-bg-muted">
        {segs.map((s) => (s.v > 0 ? <div key={s.key} className={cn("h-full", s.cls)} style={{ width: `${(s.v / total) * 100}%` }} title={`${s.label}: ${s.v}`} /> : null))}
      </div>
      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
        <div>
          <dt className="inline">Attempted </dt>
          <dd className="inline font-medium text-fg tabular">{counts.attempted}</dd>
        </div>
        {segs.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-sm", s.cls)} />
            <dt className="inline">{s.label} </dt>
            <dd className="inline font-medium text-fg tabular">{s.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function VerifyCountsBar({ counts }: { counts: VerificationCounts }) {
  const segs = [
    { key: "clean", label: "Clean", v: counts.clean, cls: "bg-emerald-500" },
    { key: "changed", label: "Drifted", v: counts.changed, cls: "bg-amber-500" },
    { key: "missing", label: "Gone", v: counts.missingAtSource, cls: "bg-red-500" },
    { key: "unverifiable", label: "Unverifiable", v: counts.unverifiable, cls: "bg-sand-400" },
  ];
  const total = Math.max(1, counts.checked);
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-bg-muted">
        {segs.map((s) => (s.v > 0 ? <div key={s.key} className={cn("h-full", s.cls)} style={{ width: `${(s.v / total) * 100}%` }} title={`${s.label}: ${s.v}`} /> : null))}
      </div>
      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
        <div>
          <dt className="inline">Checked </dt>
          <dd className="inline font-medium text-fg tabular">{counts.checked}</dd>
        </div>
        {segs.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-sm", s.cls)} />
            <dt className="inline">{s.label} </dt>
            <dd className="inline font-medium text-fg tabular">{s.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function StatTile({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: "ok" | "warn" | "bad" }) {
  return (
    <div className="rounded-lg border border-line bg-bg-elev p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tracking-tight tabular", tone === "ok" && "text-emerald-600 dark:text-emerald-300", tone === "warn" && "text-amber-600 dark:text-amber-300", tone === "bad" && "text-red-600 dark:text-red-300")}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p> : null}
    </div>
  );
}
