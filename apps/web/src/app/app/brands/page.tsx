import Link from "next/link";
import { Suspense } from "react";
import { BrandWithCountSchema, paginated } from "@field-agent/shared";
import { ExportMenu } from "@/components/operations/export-menu";
import { SocialLinks } from "@/components/promotions/social-links";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterForm } from "@/components/shared/filter-form";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { fmtDateTime, hostOf, summarizeHours } from "@/lib/format";

export const metadata = { title: "Brands" };

type Params = { all?: string; search?: string; category?: string; enrichment?: string; sort?: string; page?: string; pageSize?: string };

export default async function BrandsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const q = await searchParams;
  const showAll = q.all === "1";
  const pageSize = Math.min(100, Math.max(1, Number(q.pageSize) || 48));
  const sort = q.sort === "alpha" ? "alpha" : "promotions";
  const filters = { search: q.search || undefined, category: q.category || undefined, enrichment: q.enrichment || undefined };
  const brands = await apiFetch("/brands", paginated(BrandWithCountSchema), { searchParams: { ...filters, hasPromotions: !showAll, sort, page: Number(q.page) || 1, pageSize } });
  const withStore = brands.items.filter((b) => b.storePageFetchedAt).length;
  const withSocials = brands.items.filter((b) => b.socialLinks.length > 0).length;
  const categories = [...new Set([...(q.category ? [q.category] : []), ...brands.items.flatMap((b) => b.categories)])].sort((a, b) => a.localeCompare(b));
  const filtered = Object.values(filters).some(Boolean);
  const toggleAll = new URLSearchParams(Object.entries({ ...filters, sort: q.sort, pageSize: q.pageSize, all: showAll ? undefined : "1" }).filter((e): e is [string, string] => !!e[1]));

  return (
    <>
      <PageHeader
        eyebrow="Directory"
        title="Brands"
        description={`${brands.total} brand${brands.total === 1 ? "" : "s"}${showAll ? " in the directory" : " with live promotions"}${filtered ? " matching your filters" : ""} · on this page, ${withStore} with store data and ${withSocials} listing social accounts on the portal.`}
        actions={
          <>
            <ExportMenu dataset="brands" filters={{ hasPromotions: showAll ? "false" : "true", sort }} />
            <Link href={`/app/brands${toggleAll.size ? `?${toggleAll}` : ""}`} className="text-sm underline">
              {showAll ? "Only brands with promotions" : "Show every brand"}
            </Link>
          </>
        }
      />
      <FilterForm
        clearHref={showAll ? "/app/brands?all=1" : "/app/brands"}
        pageSize={pageSize}
        pageSizes={[24, 48, 96]}
        preserve={{ all: showAll ? "1" : undefined }}
        fields={[
          { name: "search", label: "Search", value: q.search, placeholder: "Brand name" },
          { name: "category", label: "Category", type: "select", value: q.category, options: [{ value: "", label: "Any category" }, ...categories.map((c) => ({ value: c, label: c }))] },
          {
            name: "enrichment",
            label: "Store data",
            type: "select",
            value: q.enrichment,
            options: [
              { value: "", label: "Any" },
              { value: "fetched", label: "Store page fetched" },
              { value: "pending", label: "Store page not fetched yet" },
              { value: "website", label: "Has a website" },
              { value: "hours", label: "Has hours" },
              { value: "socials", label: "Lists social accounts" },
            ],
          },
          { name: "sort", label: "Sort", type: "select", value: sort, options: [{ value: "promotions", label: "Most promotions first" }, { value: "alpha", label: "Alphabetical" }] },
        ]}
      />
      {brands.items.length === 0 ? (
        <EmptyState title={filtered ? "No brands match these filters" : "No brands yet"} description={filtered ? "Try a broader search or clear a filter." : "Brands appear after the first scrape reads the portal directory."} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-bg-elev">
          <table className="w-full text-sm">
            <thead className="bg-bg-muted text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
              <tr>
                <th className="px-4 py-2.5">Brand</th>
                <th className="px-4 py-2.5 text-right">Promotions</th>
                <th className="px-4 py-2.5">Website</th>
                <th className="px-4 py-2.5">Hours</th>
                <th className="px-4 py-2.5">Socials</th>
                <th className="px-4 py-2.5">Categories</th>
                <th className="px-4 py-2.5">Store page fetched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {brands.items.map((b) => (
                <tr key={b.id} className="hover:bg-bg-muted/60">
                  <td className="px-4 py-2.5">
                    <Link href={`/app/brands/${b.slug}`} className="flex items-center gap-2 font-medium hover:text-accent">
                      {b.logoUrl ? <img src={b.logoUrl} alt="" className="size-7 rounded border border-line bg-white object-contain p-0.5" /> : <span className="size-7 rounded bg-bg-muted" />}
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular">{b.promotionCount}</td>
                  <td className="px-4 py-2.5 text-fg-muted">
                    {b.websiteUrl ? (
                      <a href={b.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-accent">
                        {hostOf(b.websiteUrl)}
                        {b.websiteIsRedirect ? <span className="ml-1 text-[10px] uppercase tracking-wide text-fg-subtle">affiliate link</span> : null}
                      </a>
                    ) : (
                      <span className="italic text-fg-subtle">{b.storePageFetchedAt ? "Not listed on the portal" : "Not fetched yet"}</span>
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-2.5 text-xs text-fg-muted">{summarizeHours(b.hours) ?? b.hoursRaw ?? <span className="italic text-fg-subtle">{b.storePageFetchedAt ? "Not listed on the portal" : "Not fetched yet"}</span>}</td>
                  <td className="px-4 py-2.5">
                    <SocialLinks links={b.socialLinks} fetched={b.storePageFetchedAt != null} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {b.categories.slice(0, 3).map((c) => (
                        <Badge key={c} tone="neutral">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-fg-muted tabular">{b.storePageFetchedAt ? fmtDateTime(b.storePageFetchedAt) : "Not fetched yet"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Suspense>
        <Pagination page={brands.page} totalPages={brands.totalPages} total={brands.total} pageSize={brands.pageSize} />
      </Suspense>
    </>
  );
}
