import { CircleCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { RunListItemSchema, VerificationReportSchema, type Finding, type VerificationReport } from "@field-agent/shared";
import { LiveReport } from "@/components/verify/live-report";
import { RunActions } from "@/components/runs/run-actions";
import { RunStatusPill, StatTile, VerifyCountsBar } from "@/components/runs/run-bits";
import { PageHeader } from "@/components/shared/page-header";
import { FindingCard } from "@/components/verify/finding-card";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Verification report" };

/** The data verdict: what the checks said about the stored records. Separate from how the run itself went. */
const RESULT_COPY: Record<VerificationReport["result"], { title: string; tone: "ok" | "warn" | "bad" | "neutral" }> = {
  clean: { title: "No discrepancies detected in the checks performed", tone: "ok" },
  discrepancies: { title: "Discrepancies observed at the source", tone: "warn" },
  nothing_to_verify: { title: "Nothing to verify: no persisted promotions", tone: "neutral" },
  failed: { title: "No verdict: the run did not finish", tone: "bad" },
  in_progress: { title: "Verification in progress", tone: "neutral" },
};

/** The processing result: whether the worker got through its checks. */
const PROCESSING_COPY: Record<VerificationReport["status"], string> = {
  queued: "Waiting for a worker",
  running: "Checking the source",
  completed: "All checks completed",
  completed_with_errors: "Completed; some records could not be checked",
  failed: "Failed before finishing",
  stalled: "Stalled: the worker stopped reporting",
  cancelled: "Cancelled by an operator",
};

export default async function VerifyReportPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const [report, run] = await Promise.all([
    apiFetch(`/verify/${runId}`, VerificationReportSchema).catch((e) => {
      if (e instanceof ApiRequestError && e.status === 404) notFound();
      throw e;
    }),
    apiFetch(`/runs/${runId}`, RunListItemSchema).catch(() => null),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Verification report"
        title={`Run ${report.runId.slice(0, 8)}`}
        description={`Started ${fmtDateTime(report.startedAt)} · finished ${fmtDateTime(report.finishedAt)}${run?.triggeredBy ? ` · by ${run.triggeredBy}` : ""}`}
        actions={<RunActions runId={report.runId} type="verify" status={report.status} cancelRequestedAt={run?.cancelRequestedAt} parentRunId={run?.parentRunId} />}
      />
      <LiveReport runId={report.runId} inProgress={report.result === "in_progress"} />
      <ReportBody report={report} />
    </>
  );
}

function ReportBody({ report }: { report: VerificationReport }) {
  const copy = RESULT_COPY[report.result];
  const detailChecks = report.findings.filter((f) => f.evidence.checkedVia === "detail").length;
  const listingChecks = report.findings.filter((f) => f.evidence.checkedVia === "listing").length;
  const groups: Array<[Finding["kind"], string, string]> = [
    ["changed", "Drifted", "Fields whose value at the source no longer matches what we stored."],
    ["missing_at_source", "Gone from source", "Persisted promotions the portal no longer serves."],
    ["unverifiable", "Could not verify", "Records we could not confirm either way, with the reason."],
    ["clean", "Clean", "Records that matched. Kept so the report proves what was checked."],
  ];
  return (
    <>
      <div
        className={[
          "mb-5 flex items-center gap-3 rounded-lg border p-4",
          copy.tone === "ok" && "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
          copy.tone === "warn" && "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
          copy.tone === "bad" && "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100",
          copy.tone === "neutral" && "border-line bg-bg-elev",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {copy.tone === "ok" ? <CircleCheck className="size-5" /> : null}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70">Data verdict</p>
          <p className="font-semibold">{copy.title}</p>
          <p className="text-sm opacity-80">
            Coverage: {detailChecks} detail check{detailChecks === 1 ? "" : "s"} · {listingChecks} listing-only check{listingChecks === 1 ? "" : "s"} · {report.summary.requestsMade} requests · sample rate {Math.round(report.summary.sampleRate * 100)}%
          </p>
          <p className="mt-1 text-xs opacity-70">A listing-only check confirms presence and listing fields. It does not establish that every detail matches.</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70">Processing result</p>
          <div className="mt-1 flex items-center justify-end gap-2">
            <RunStatusPill status={report.status} />
          </div>
          <p className="mt-1 text-xs opacity-80">{PROCESSING_COPY[report.status]}</p>
          {report.error ? <p className="mt-1 max-w-xs text-xs opacity-80">{report.error}</p> : null}
        </div>
      </div>
      <p className="mb-5 rounded-md border border-line bg-bg-muted/60 px-3 py-2 text-xs text-fg-muted">
        Historical observation: this report records what the source showed at the time of each check. Before and after values are kept as they were, even if the stored record changed later.
      </p>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <StatTile label="Clean" value={report.summary.clean} tone="ok" />
        <StatTile label="Drifted" value={report.summary.changed} tone={report.summary.changed ? "warn" : undefined} />
        <StatTile label="Gone from source" value={report.summary.missingAtSource} tone={report.summary.missingAtSource ? "bad" : undefined} />
        <StatTile label="Could not verify" value={report.summary.unverifiable} />
      </div>
      <div className="mb-8 rounded-lg border border-line bg-bg-elev p-4">
        <VerifyCountsBar counts={report.summary} />
      </div>

      {groups.map(([kind, title, desc]) => {
        const items = report.findings.filter((f) => f.kind === kind);
        if (items.length === 0) return null;
        return (
          <section key={kind} className="mb-8">
            <h2 className="text-base font-semibold">
              {title} <span className="text-fg-muted">({items.length})</span>
            </h2>
            <p className="mb-3 text-sm text-fg-muted">{desc}</p>
            <div className="flex flex-col gap-3">
              {items.map((f) => (
                <FindingCard key={f.id} f={f} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
