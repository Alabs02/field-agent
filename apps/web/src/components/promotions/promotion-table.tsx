import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Promotion } from "@field-agent/shared";
import { Badge } from "@/components/ui/badge";
import { endsLabel, fmtDateTime, fmtDay, relative } from "@/lib/format";
import { VerificationBadge } from "./verification-badge";

const FIELD_LABEL: Record<string, string> = { title: "title", description: "description", imageUrl: "image", startsOn: "start day", endsOn: "end day", brand: "brand", collection: "collection", listed: "listed" };

/** Dense view for reviewers: dates, provenance, and verification coverage side by side. */
export function PromotionTable({ items }: { items: Promotion[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-bg-elev">
      <table className="w-full text-sm">
        <thead className="bg-bg-muted text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
          <tr>
            <th className="px-3 py-2.5">Promotion</th>
            <th className="px-3 py-2.5">Valid</th>
            <th className="px-3 py-2.5">Days left</th>
            <th className="px-3 py-2.5">First seen</th>
            <th className="px-3 py-2.5">Last seen on source</th>
            <th className="px-3 py-2.5">Detail fetched</th>
            <th className="px-3 py-2.5">Verification</th>
            <th className="px-3 py-2.5">Changed fields</th>
            <th className="px-3 py-2.5">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((p) => {
            const ends = endsLabel(p.endsAt);
            return (
              <tr key={p.id} className="align-top hover:bg-bg-muted/60">
                <td className="max-w-xs px-3 py-2.5">
                  <Link href={`/app/promotions/${p.id}`} className="font-medium hover:text-accent">
                    {p.title}
                  </Link>
                  <p className="text-xs text-fg-muted">
                    <Link href={`/app/brands/${p.brand.slug}`} className="hover:underline">
                      {p.brand.name}
                    </Link>
                    {p.removedAt ? <span className="ml-2 text-[10px] uppercase tracking-wide text-red-700 dark:text-red-300">no longer listed</span> : null}
                  </p>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-fg-muted tabular">
                  {p.startsAt || p.endsAt ? `${fmtDay(p.startsAt)} to ${fmtDay(p.endsAt)}` : "Dates not published"}
                  {p.dateSource === "listing_serial" ? <span className="block text-[10px] uppercase tracking-wide text-fg-subtle">from listing serial</span> : null}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular">
                  <span className={ends.tone === "urgent" ? "text-red-700 dark:text-red-300" : ends.tone === "soon" ? "text-amber-700 dark:text-amber-300" : "text-fg-muted"}>{ends.text}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-fg-muted tabular" title={fmtDateTime(p.firstSeenAt)}>
                  {fmtDay(p.firstSeenAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-fg-muted tabular" title={fmtDateTime(p.lastSeenAt)}>
                  {relative(p.lastSeenAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-fg-muted tabular" title={p.detailFetchedAt ? fmtDateTime(p.detailFetchedAt) : undefined}>
                  {p.detailFetchedAt ? relative(p.detailFetchedAt) : "Never fetched"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                  <div className="flex flex-col items-start gap-1">
                    <VerificationBadge v={p.verification} compact />
                    {p.verification.coverage ? <span className="text-[10px] uppercase tracking-wide text-fg-subtle">{p.verification.coverage === "detail" ? "detail check" : "listing check only"}</span> : null}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {p.verification.changedFields.length ? (
                    <div className="flex flex-wrap gap-1">
                      {p.verification.changedFields.map((f) => (
                        <Badge key={f} tone="warn">
                          {FIELD_LABEL[f] ?? f}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-fg-subtle">{p.verification.lastOutcome ? "None" : "Not checked"}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                  <a href={p.canonicalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-fg-muted hover:text-accent">
                    Open <ExternalLink className="size-3" />
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
