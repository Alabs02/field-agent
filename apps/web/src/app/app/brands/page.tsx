import Link from "next/link";
import { BrandWithCountSchema, paginated } from "@field-agent/shared";
import { SocialLinks } from "@/components/promotions/social-links";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { hostOf, summarizeHours } from "@/lib/format";

export const metadata = { title: "Brands" };

export default async function BrandsPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const { all } = await searchParams;
  const showAll = all === "1";
  const brands = await apiFetch("/brands", paginated(BrandWithCountSchema), { searchParams: { hasPromotions: !showAll, pageSize: 200, sort: "promotions" } });
  const withStore = brands.items.filter((b) => b.storePageFetchedAt).length;
  const withSocials = brands.items.filter((b) => b.socialLinks.length > 0).length;

  return (
    <>
      <PageHeader
        eyebrow="Directory"
        title="Brands"
        description={`${brands.total} brands${showAll ? " in the directory" : " with live promotions"} · ${withStore} with store data · ${withSocials} list social accounts on the portal.`}
        actions={
          <Link href={showAll ? "/app/brands" : "/app/brands?all=1"} className="text-sm underline">
            {showAll ? "Only brands with promotions" : "Show every brand"}
          </Link>
        }
      />
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
                      {b.websiteIsRedirect ? <span className="ml-1 text-[10px] uppercase tracking-wide text-fg-subtle">affiliate</span> : null}
                    </a>
                  ) : (
                    <span className="italic text-fg-subtle">{b.storePageFetchedAt ? "not listed" : "not fetched"}</span>
                  )}
                </td>
                <td className="max-w-xs px-4 py-2.5 text-xs text-fg-muted">{summarizeHours(b.hours) ?? b.hoursRaw ?? <span className="italic text-fg-subtle">{b.storePageFetchedAt ? "not listed" : "not fetched"}</span>}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
