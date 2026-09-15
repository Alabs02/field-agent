import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { createLoader } from "nuqs/server";
import { Suspense } from "react";
import { BrandWithCountSchema, PromotionGroupSchema, PromotionListSchema, paginated } from "@field-agent/shared";
import { ExportMenu } from "@/components/operations/export-menu";
import { BrandGroup } from "@/components/promotions/brand-group";
import { PromotionFilters } from "@/components/promotions/filters";
import { PromotionCard } from "@/components/promotions/promotion-card";
import { PromotionTable } from "@/components/promotions/promotion-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { ScrapeButton } from "@/components/runs/job-buttons";
import { apiFetch } from "@/lib/api";
import { countActiveFilters, promotionFilterParsers, toPromotionsQuery } from "@/lib/promotion-filters";

const loadFilters = createLoader(promotionFilterParsers);

export const metadata = { title: "Promotions" };

export default async function PromotionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await loadFilters(await searchParams);
  const query = toPromotionsQuery(q);
  const grouped = q.view === "brand";
  const [page, groups, brandsPage] = await Promise.all([
    apiFetch("/promotions", PromotionListSchema, { searchParams: grouped ? { ...query, page: 1, pageSize: 1 } : query }),
    grouped ? apiFetch("/promotions/grouped", paginated(PromotionGroupSchema), { searchParams: { ...query, pageSize: Math.min(q.pageSize, 12) } }) : Promise.resolve(null),
    apiFetch("/brands", paginated(BrandWithCountSchema), { searchParams: { hasPromotions: true, pageSize: 100 } }),
  ]);

  const active = countActiveFilters(q);
  const nothingAtAll = page.total === 0 && brandsPage.total === 0 && active === 0;
  const listedLabel = q.presence === "removed" ? "No longer listed" : q.presence === "all" ? "Listed and removed" : "Listed by the portal";

  return (
    <>
      <PageHeader
        eyebrow="This week at the center"
        title="Promotions"
        description="Every campaign the portal is currently promoting, with the brand facts an account manager needs to act on it."
        actions={
          <>
            <ExportMenu dataset="promotions" />
            <ScrapeButton />
          </>
        }
      />
      <Suspense>
        <PromotionFilters brands={brandsPage.items} />
      </Suspense>

      {!nothingAtAll ? (
        <dl className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-fg-muted">
          <div>
            <dt className="inline">{listedLabel}: </dt>
            <dd className="inline font-semibold text-fg tabular">{page.total}</dd>
          </div>
          <div>
            <dt className="inline">Currently within known validity dates: </dt>
            <dd className="inline font-semibold text-fg tabular">{page.withinValidity}</dd>
          </div>
          <div>
            <dt className="inline">Unknown or expired dates: </dt>
            <dd className="inline font-semibold text-fg tabular">{Math.max(0, page.total - page.withinValidity)}</dd>
          </div>
        </dl>
      ) : null}

      {nothingAtAll ? (
        <EmptyState
          icon={<PackageSearch />}
          title="No promotions yet"
          description="Run a scrape to pull the current promotions from the portal. It takes about two minutes locally."
          action={<ScrapeButton />}
        />
      ) : page.total === 0 ? (
        <EmptyState title="Nothing matches these filters" description="Try widening the date range or clearing the search." />
      ) : grouped && groups ? (
        <>
          <div>
            {groups.items.map((g) => (
              <BrandGroup key={g.brand.id} brand={g.brand} promotions={g.promotions} />
            ))}
          </div>
          <Suspense>
            <Pagination page={groups.page} totalPages={groups.totalPages} total={groups.total} pageSize={groups.pageSize} />
          </Suspense>
          <p className="mt-2 text-xs text-fg-subtle">
            Pages count brands ({groups.total} with matching promotions); each brand shown carries its complete filtered group.{" "}
            <Link href="/app/brands" className="underline">
              Browse all brands
            </Link>
          </p>
        </>
      ) : (
        <>
          {q.view === "table" ? (
            <PromotionTable items={page.items} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {page.items.map((p) => (
                <PromotionCard key={p.id} promotion={p} />
              ))}
            </div>
          )}
          <Suspense>
            <Pagination page={page.page} totalPages={page.totalPages} total={page.total} pageSize={page.pageSize} />
          </Suspense>
        </>
      )}
    </>
  );
}
