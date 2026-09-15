import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Finding } from "@field-agent/shared";
import { VerifyButton } from "@/components/runs/job-buttons";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/format";

export const FIELD_LABEL: Record<string, string> = { title: "Title", description: "Description", imageUrl: "Image", startsOn: "Start day", endsOn: "End day", brand: "Brand", collection: "Collection", listed: "Listed" };

const KIND_LABEL: Record<Finding["kind"], { label: string; tone: "ok" | "warn" | "bad" | "neutral" }> = {
  clean: { label: "Clean", tone: "ok" },
  changed: { label: "Drifted", tone: "warn" },
  missing_at_source: { label: "Gone from source", tone: "bad" },
  unverifiable: { label: "Could not verify", tone: "neutral" },
};

const REASON_COPY: Record<string, string> = {
  robots_disallowed: "The portal's robots.txt disallows this page, so it was not fetched",
  fetch_timeout: "The source did not answer within the request timeout",
  listing_incomplete: "The listing could not be read completely, so absence from it proves nothing",
  jsonld_missing: "The detail page loaded but its structured data block was missing",
  parse_error: "The detail page could not be parsed",
  network_error: "The source could not be reached",
};

function describeReason(reason: string): string {
  if (REASON_COPY[reason]) return REASON_COPY[reason];
  const http = /^http_(\d{3})$/.exec(reason);
  if (http) return `The source answered HTTP ${http[1]} for the detail page`;
  return reason;
}

/** One verification observation, rendered the same everywhere findings appear. */
export function FindingCard({ f, showRun = false }: { f: Finding; showRun?: boolean }) {
  const kind = KIND_LABEL[f.kind];
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
        <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
          {showRun ? <Badge tone={kind.tone}>{kind.label}</Badge> : null}
          <Badge tone="outline">{f.evidence.checkedVia === "detail" ? "detail check" : "listing check"}</Badge>
          {f.evidence.detailStatus != null ? <Badge tone="outline">HTTP {f.evidence.detailStatus}</Badge> : null}
          <Badge tone={f.evidence.inListing ? "ok" : "bad"}>{f.evidence.inListing ? "on listing" : "not on listing"}</Badge>
          <Badge tone={f.evidence.inSitemap ? "ok" : "neutral"}>{f.evidence.inSitemap ? "in sitemap" : "not in sitemap"}</Badge>
          <a href={f.evidence.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-accent">
            source <ExternalLink className="size-3" />
          </a>
          <VerifyButton promotionIds={[f.promotion.id]} size="sm" variant="outline" />
        </div>
      </div>
      <p className="mt-1 text-xs text-fg-subtle">Observed {fmtDateTime(f.createdAt)}</p>
      {f.reason ? (
        <p className="mt-2 text-sm text-fg-muted">
          {describeReason(f.reason)} <code className="rounded bg-bg-muted px-1 font-mono text-xs">{f.reason}</code>
        </p>
      ) : null}
      {f.fieldChanges.length > 0 ? (
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
            <tr>
              <th className="py-1 pr-3">Field</th>
              <th className="py-1 pr-3">Before (stored)</th>
              <th className="py-1">After (source at check time)</th>
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
  if (v === null) return <span className="italic text-fg-subtle">Not available</span>;
  if (typeof v === "boolean") return <span>{v ? "Yes" : "No"}</span>;
  if (/^https?:\/\//.test(v)) {
    return (
      <a href={v} target="_blank" rel="noopener noreferrer" className="break-all underline">
        {v.length > 80 ? `${v.slice(0, 80)}…` : v}
      </a>
    );
  }
  return <span className="break-words">{v}</span>;
}
