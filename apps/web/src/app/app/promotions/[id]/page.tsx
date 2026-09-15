import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { FindingSchema, PromotionDetailSchema } from "@field-agent/shared";
import { ChangeHistory } from "@/components/operations/change-history";
import { BrandGroupHeader } from "@/components/promotions/brand-group";
import { VerificationBadge } from "@/components/promotions/verification-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { endsLabel, fmtDateTime, fmtDayLong, relative } from "@/lib/format";

const COLLECTION_LABEL = { deals: "Deal", style_notes: "Style note", new_arrivals: "New arrival", other: "Promotion" } as const;

export default async function PromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, findings] = await Promise.all([
    apiFetch(`/promotions/${id}`, PromotionDetailSchema).catch((e) => {
      if (e instanceof ApiRequestError && e.status === 404) notFound();
      throw e;
    }),
    apiFetch(`/promotions/${id}/findings`, z.array(FindingSchema)).catch(() => []),
  ]);
  const ends = endsLabel(p.endsAt);
  return (
    <>
      <PageHeader
        eyebrow={`${COLLECTION_LABEL[p.collection]} · ${p.brand.name}`}
        title={p.title}
        actions={
          <a href={p.canonicalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm underline">
            View on portal <ExternalLink className="size-3.5" />
          </a>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="overflow-hidden rounded-lg border border-line bg-bg-muted">
          {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full object-cover" /> : <div className="aspect-[4/3]" />}
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={ends.tone === "urgent" ? "accent" : "neutral"}>{ends.text}</Badge>
            <VerificationBadge v={p.verification} />
            {p.removedAt ? <Badge tone="bad">No longer listed since {fmtDateTime(p.removedAt)}</Badge> : null}
          </div>
          {p.descriptionHtml ? (
            <div className="prose prose-sm max-w-none text-fg [&_p]:my-2 [&_a]:underline" dangerouslySetInnerHTML={{ __html: p.descriptionHtml }} />
          ) : p.description ? (
            <p className="text-sm">{p.description}</p>
          ) : (
            <p className="text-sm italic text-fg-subtle">{p.detailFetchedAt ? "No description on the portal." : "Description not fetched yet (the detail page failed on the last scrape)."}</p>
          )}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Fact label="Starts" value={fmtDayLong(p.startsAt)} />
            <Fact label="Ends" value={fmtDayLong(p.endsAt)} />
            <Fact label="Date source" value={p.dateSource === "jsonld" ? "JSON-LD (authoritative)" : p.dateSource === "listing_serial" ? "Listing serial (fallback)" : "None"} />
            <Fact label="First seen" value={fmtDateTime(p.firstSeenAt)} />
            <Fact label="Last seen on source" value={relative(p.lastSeenAt)} />
            <Fact label="Detail page fetched" value={p.detailFetchedAt ? relative(p.detailFetchedAt) : "Never"} />
            <Fact label="Last verification" value={p.verification.lastVerifiedAt ? `${relative(p.verification.lastVerifiedAt)} (${p.verification.coverage === "detail" ? "detail check" : "listing check only"})` : "Not checked yet"} />
            <Fact label="Changed at last check" value={p.verification.changedFields.length ? p.verification.changedFields.join(", ") : p.verification.lastOutcome ? "Nothing" : "Not checked"} />
            <Fact label="Portal deal id" value={<span className="font-mono text-xs">{p.sourceId}</span>} />
          </dl>
          <BrandGroupHeader brand={p.brand} count={1} />
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-2 text-base font-semibold">Verification history</h2>
        <p className="mb-3 text-sm text-fg-muted">Each line is what the source showed at that moment. A listing check confirms presence and listing fields only.</p>
        {findings.length === 0 ? (
          <p className="text-sm text-fg-muted">Not verified yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-bg-elev text-sm">
            {findings.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="text-fg-muted tabular">{fmtDateTime(f.createdAt)}</span>
                <Badge tone={f.kind === "clean" ? "ok" : f.kind === "changed" ? "warn" : f.kind === "missing_at_source" ? "bad" : "neutral"}>{f.kind.replace(/_/g, " ")}</Badge>
                <span className="text-fg-muted">{f.evidence.checkedVia === "detail" ? "detail check" : "listing check"}</span>
                {f.fieldChanges.length ? <span className="text-fg-muted">changed: {f.fieldChanges.map((c) => c.field).join(", ")}</span> : null}
                {f.reason ? <span className="font-mono text-xs text-fg-muted">{f.reason}</span> : null}
                <Link href={`/app/verify?runId=${f.runId}`} className="ml-auto text-xs underline-offset-4 hover:underline">
                  open report
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ChangeHistory entityId={p.id} title="Stored record history" emptyText="No stored changes recorded since detailed history began. Scrapes that find the same content leave no event." />
    </>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
