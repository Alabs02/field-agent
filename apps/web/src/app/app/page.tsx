import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { createLoader } from "nuqs/server";
import { Suspense } from "react";
import { BrandDetailSchema, BrandWithCountSchema, PromotionSchema, paginated, type Promotion } from "@field-agent/shared";
import { BrandGroup } from "@/components/promotions/brand-group";
import { PromotionFilters, promotionFilterParsers } from "@/components/promotions/filters";
import { PromotionCard } from "@/components/promotions/promotion-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { ScrapeButton } from "@/components/runs/job-buttons";

const loadFilters = createLoader(promotionFilterParsers);

export const metadata = { title: "Promotions" };

export default async function PromotionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await loadFilters(await searchParams);
  const [page, brandsPage] = await Promise.all([
    apiFetch("/promotions", paginated(PromotionSchema), {
      searchParams: {
        search: q.search || undefined,
        brand: q.brand || undefined,
        collection: q.collection || undefined,
        startDate: q.startDate || undefined,
        endDate: q.endDate || undefined,
        verification: q.verification || undefined,
        sort: q.sort,
        page: q.page,
        pageSize: q.pageSize,
      },
    }),
    apiFetch("/brands", paginated(BrandWithCountSchema), { searchParams: { hasPromotions: true, pageSize: 200 } }),
  ]);

  const nothingAtAll = page.total === 0 && brandsPage.total === 0 && !q.search && !q.brand && !q.collection && !q.startDate && !q.endDate && !q.verification;

  return (
    <>
      <PageHeader
        eyebrow="This week at the center"
        title="Promotions"
        description="Every campaign the portal is currently promoting, with the brand facts an account manager needs to act on it."
        actions={<ScrapeButton />}
      />
      <Suspense>
        <PromotionFilters brands={brandsPage.items} />
      </Suspense>

      {nothingAtAll ? (
        <EmptyState
          icon={<PackageSearch />}
          title="No promotions yet"
          description="Run a scrape to pull the current promotions from the portal. It takes about two minutes locally."
          action={<ScrapeButton />}
        />
      ) : page.items.length === 0 ? (
        <EmptyState title="Nothing matches these filters" description="Try widening the date range or clearing the search." />
      ) : q.view === "brand" ? (
        <GroupedView items={page.items} />
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
      {q.view === "brand" && page.totalPages > 1 ? (
        <p className="mt-2 text-xs text-fg-subtle">
          Grouped within this page. For a brand's complete list, open the brand or{" "}
          <Link href="/app/brands" className="underline">
            browse brands
          </Link>
          .
        </p>
      ) : null}
    </>
  );
}

async function GroupedView({ items }: { items: Promotion[] }) {
  const byBrand = new Map<string, typeof items>();
  for (const p of items) {
    const list = byBrand.get(p.brand.slug) ?? [];
    list.push(p);
    byBrand.set(p.brand.slug, list);
  }
  const brands = await Promise.all([...byBrand.keys()].map((slug) => apiFetch(`/brands/${slug}`, BrandDetailSchema)));
  return (
    <div>
      {brands.map((b) => (
        <BrandGroup key={b.id} brand={b} promotions={byBrand.get(b.slug) ?? []} />
      ))}
      <div className="mt-2">
        <Button asChild variant="link" size="sm" className="px-0">
          <Link href="/app/brands">All brands →</Link>
        </Button>
      </div>
    </div>
  );
}
