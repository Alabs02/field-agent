import { Clock, ExternalLink, Globe, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import type { Brand, BrandSummary, Promotion } from "@field-agent/shared";
import { Badge } from "@/components/ui/badge";
import { hostOf, summarizeHours, todayHours } from "@/lib/format";
import { PromotionCard } from "./promotion-card";
import { SocialLinks } from "./social-links";

export function BrandGroupHeader({ brand, count }: { brand: Brand; count: number }) {
  const today = todayHours(brand.hours);
  const summary = summarizeHours(brand.hours);
  return (
    <header className="mb-4 flex flex-col gap-3 rounded-lg border border-line bg-bg-elev p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        {brand.logoUrl ? (
          <img src={brand.logoUrl} alt="" className="size-12 rounded-md border border-line bg-white object-contain p-1" />
        ) : (
          <div className="grid size-12 place-items-center rounded-md border border-line bg-bg-muted text-sm font-semibold">{brand.name.slice(0, 2)}</div>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/app/brands/${brand.slug}`} className="text-base font-semibold tracking-tight hover:text-accent">
              {brand.name}
            </Link>
            <Badge tone="brand">
              {count} promotion{count === 1 ? "" : "s"}
            </Badge>
            {brand.categories.slice(0, 2).map((c) => (
              <Badge key={c} tone="neutral">
                {c}
              </Badge>
            ))}
          </div>
          <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {brand.hours ? (
                <span title={summary ?? undefined}>{today}</span>
              ) : brand.hoursRaw ? (
                <span>{brand.hoursRaw}</span>
              ) : brand.storePageFetchedAt ? (
                <span className="italic">Hours not listed on portal</span>
              ) : (
                <span className="italic">Hours not fetched yet</span>
              )}
            </div>
            {brand.websiteUrl ? (
              <a href={brand.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1.5 hover:text-accent">
                <Globe className="size-3.5" />
                {hostOf(brand.websiteUrl)}
                {brand.websiteIsRedirect ? <span className="text-[10px] uppercase tracking-wide text-fg-subtle">(affiliate link)</span> : null}
                <ExternalLink className="size-3" />
              </a>
            ) : (
              <span className="flex items-center gap-1.5 italic">
                <Globe className="size-3.5" /> Website not listed on portal
              </span>
            )}
            {brand.phone ? (
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5" /> {brand.phone}
              </span>
            ) : null}
            {brand.location ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {brand.location}
              </span>
            ) : null}
          </dl>
        </div>
      </div>
      <SocialLinks links={brand.socialLinks} fetched={brand.storePageFetchedAt != null} />
    </header>
  );
}

export function BrandGroup({ brand, promotions }: { brand: Brand; promotions: Promotion[] }) {
  return (
    <section className="mb-10">
      <BrandGroupHeader brand={brand} count={promotions.length} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {promotions.map((p) => (
          <PromotionCard key={p.id} promotion={p} showBrand={false} />
        ))}
      </div>
    </section>
  );
}

export type { BrandSummary };
