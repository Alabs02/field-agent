import { notFound } from "next/navigation";
import { BrandDetailSchema } from "@field-agent/shared";
import { ChangeHistory } from "@/components/operations/change-history";
import { BrandGroupHeader } from "@/components/promotions/brand-group";
import { PromotionCard } from "@/components/promotions/promotion-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { relative, summarizeHours } from "@/lib/format";

export default async function BrandPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const brand = await apiFetch(`/brands/${ref}`, BrandDetailSchema).catch((e) => {
    if (e instanceof ApiRequestError && e.status === 404) notFound();
    throw e;
  });
  return (
    <>
      <PageHeader eyebrow="Brand" title={brand.name} description={brand.description ?? undefined} />
      <BrandGroupHeader brand={brand} count={brand.promotionCount} />
      <dl className="mb-6 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-bg-elev p-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">Weekly hours</dt>
          <dd className="mt-1">{summarizeHours(brand.hours) ?? brand.hoursRaw ?? <span className="italic text-fg-subtle">Not listed on portal</span>}</dd>
        </div>
        <div className="rounded-lg border border-line bg-bg-elev p-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">Store page</dt>
          <dd className="mt-1">
            <a href={brand.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              on the portal
            </a>
            <span className="text-fg-muted"> · fetched {relative(brand.storePageFetchedAt)}</span>
          </dd>
        </div>
        <div className="rounded-lg border border-line bg-bg-elev p-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">Portal store id</dt>
          <dd className="mt-1 font-mono text-xs">{brand.sourceId}</dd>
        </div>
      </dl>
      {brand.promotions.length === 0 ? (
        <EmptyState title="No live promotions" description="This brand has nothing on the portal's promotions page right now." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {brand.promotions.map((p) => (
            <PromotionCard key={p.id} promotion={p} showBrand={false} />
          ))}
        </div>
      )}
      <ChangeHistory entityId={brand.id} emptyText="No changes recorded for this brand since detailed history began. Store details are compared on every scrape; a change would appear here." />
    </>
  );
}
