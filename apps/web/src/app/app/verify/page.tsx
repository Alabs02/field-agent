import Link from "next/link";
import { paginated, RunListItemSchema } from "@field-agent/shared";
import { VerifyButton } from "@/components/runs/job-buttons";
import { RunStatusPill } from "@/components/runs/run-bits";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { apiFetch } from "@/lib/api";
import { fmtDateTime, fmtDuration } from "@/lib/format";

export const metadata = { title: "Verification" };

export default async function VerifyIndexPage() {
  const runs = await apiFetch("/runs", paginated(RunListItemSchema), { searchParams: { type: "verify", pageSize: 50 } });
  return (
    <>
      <PageHeader
        eyebrow="Verification"
        title="Does what we stored still match the source?"
        description="Each run re-checks persisted promotions against the live portal and reports exactly which records changed, disappeared, or could not be checked."
        actions={<VerifyButton />}
      />
      {runs.items.length === 0 ? (
        <EmptyState title="No verification runs yet" description="Run one to get a discrepancy report. It costs a handful of requests, not a full re-scrape." action={<VerifyButton />} />
      ) : (
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
      )}
    </>
  );
}
