import { CircleCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VerificationReportSchema, type Finding, type VerificationReport } from "@field-agent/shared";
import { LiveReport } from "@/components/verify/live-report";
import { RunStatusPill, StatTile, VerifyCountsBar } from "@/components/runs/run-bits";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Verification report" };

const RESULT_COPY: Record<VerificationReport["result"], { title: string; tone: "ok" | "warn" | "bad" | "neutral" }> = {
  clean: { title: "Clean: everything we stored still matches the source", tone: "ok" },
  discrepancies: { title: "Discrepancies found", tone: "warn" },
  nothing_to_verify: { title: "Nothing to verify: no persisted promotions", tone: "neutral" },
  failed: { title: "Run failed", tone: "bad" },
  in_progress: { title: "Verification in progress…", tone: "neutral" },
};

export default async function VerifyReportPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const report = await apiFetch(`/verify/${runId}`, VerificationReportSchema).catch((e) => {
    if (e instanceof ApiRequestError && e.status === 404) notFound();
    throw e;
  });
  return (
    <>
      <PageHeader eyebrow="Verification report" title={`Run ${report.runId.slice(0, 8)}`} description={`Started ${fmtDateTime(report.startedAt)} · finished ${fmtDateTime(report.finishedAt)}`} />
      <LiveReport runId={report.runId} inProgress={report.result === "in_progress"} />
      <ReportBody report={report} />
    </>
  );
}

function ReportBody({ report }: { report: VerificationReport }) {
  const copy = RESULT_COPY[report.result];
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
          <p className="font-semibold">{copy.title}</p>
          <p className="text-sm opacity-80">
            {report.summary.checked} checked · {report.summary.requestsMade} requests · sample rate {Math.round(report.summary.sampleRate * 100)}%
            {report.error ? ` · ${report.error}` : ""}
          </p>
        </div>
        <span className="ml-auto">
          <RunStatusPill status={report.status} />
        </span>
      </div>

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

const FIELD_LABEL: Record<string, string> = { title: "Title", description: "Description", imageUrl: "Image", startsOn: "Start day", endsOn: "End day", brand: "Brand", collection: "Collection", listed: "Listed" };

function FindingCard({ f }: { f: Finding }) {
  return (
    <article id={f.promotion.id} className="rounded-lg border border-line bg-bg-elev p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">{f.promotion.brandName}</p>
          <h3 className="font-semibold">
            <Link href={`/app/promotions/${f.promotion.id}`} className="hover:text-accent">
              {f.promotion.title}
            </Link>
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-fg-muted">
          <Badge tone="outline">via {f.evidence.checkedVia}</Badge>
          {f.evidence.detailStatus != null ? <Badge tone="outline">HTTP {f.evidence.detailStatus}</Badge> : null}
          <Badge tone={f.evidence.inListing ? "ok" : "bad"}>{f.evidence.inListing ? "on listing" : "not on listing"}</Badge>
          <Badge tone={f.evidence.inSitemap ? "ok" : "neutral"}>{f.evidence.inSitemap ? "in sitemap" : "not in sitemap"}</Badge>
          <a href={f.evidence.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-accent">
            source <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
      {f.reason ? (
        <p className="mt-2 text-sm text-fg-muted">
          Reason: <code className="rounded bg-bg-muted px-1 font-mono text-xs">{f.reason}</code>
        </p>
      ) : null}
      {f.fieldChanges.length > 0 ? (
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
            <tr>
              <th className="py-1 pr-3">Field</th>
              <th className="py-1 pr-3">Before (stored)</th>
              <th className="py-1">After (source now)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {f.fieldChanges.map((c) => (
              <tr key={c.field} className="align-top">
                <td className="py-2 pr-3 font-medium">{FIELD_LABEL[c.field] ?? c.field}</td>
                <td className="py-2 pr-3 text-red-700 dark:text-red-300">
                  <Val v={c.before} />
                  {c.truncated ? <span className="text-xs text-fg-subtle"> (truncated)</span> : null}
                </td>
                <td className="py-2 text-emerald-700 dark:text-emerald-300">
                  <Val v={c.after} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </article>
  );
}

function Val({ v }: { v: string | boolean | null }) {
  if (v === null) return <span className="italic text-fg-subtle">null</span>;
  if (typeof v === "boolean") return <span>{v ? "true" : "false"}</span>;
  if (/^https?:\/\//.test(v)) {
    return (
      <a href={v} target="_blank" rel="noopener noreferrer" className="break-all underline">
        {v.length > 80 ? `${v.slice(0, 80)}…` : v}
      </a>
    );
  }
  return <span className="break-words">{v}</span>;
}
