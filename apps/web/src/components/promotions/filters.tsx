"use client";

import { LayoutGrid, Rows3, Search, Table2, X } from "lucide-react";
import { useQueryStates } from "nuqs";
import { useEffect, useState, useTransition } from "react";
import { COLLECTIONS, type BrandWithCount } from "@field-agent/shared";
import { countActiveFilters, promotionFilterParsers } from "@/lib/promotion-filters";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const COLLECTION_LABEL: Record<string, string> = { deals: "Deals", style_notes: "Style notes", new_arrivals: "New arrivals", other: "Other" };

export function PromotionFilters({ brands }: { brands: Pick<BrandWithCount, "id" | "name" | "slug" | "promotionCount">[] }) {
  const [q, setQ] = useQueryStates(promotionFilterParsers, { shallow: false, history: "replace" });
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(q.search);
  const [more, setMore] = useState(!!(q.presence || q.freshness || q.firstSeenFrom || q.firstSeenTo || q.endingSoon || q.attention));

  // Debounced search; every other control commits immediately. Any filter change resets the page.
  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== q.search) startTransition(() => void setQ({ search, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [search, q.search, setQ]);

  const set = (patch: Partial<typeof q>) => startTransition(() => void setQ({ ...patch, page: 1 }));
  const active = countActiveFilters(q);
  const views = [
    { key: "flat", label: "Cards", icon: LayoutGrid },
    { key: "table", label: "Table", icon: Table2 },
    { key: "brand", label: "By brand", icon: Rows3 },
  ] as const;

  return (
    <div className="mb-5 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search promotions or brands" className="pl-8" aria-label="Search" />
        </div>
        <Select value={q.brand} onChange={(e) => set({ brand: e.target.value })} aria-label="Brand">
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.slug}>
              {b.name} ({b.promotionCount})
            </option>
          ))}
        </Select>
        <Select value={q.collection} onChange={(e) => set({ collection: e.target.value as typeof q.collection })} aria-label="Collection">
          <option value="">All collections</option>
          {COLLECTIONS.map((c) => (
            <option key={c} value={c}>
              {COLLECTION_LABEL[c]}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-1 text-xs text-fg-muted">
          <Input type="date" value={q.startDate} onChange={(e) => set({ startDate: e.target.value })} aria-label="Running on or after" className="w-[150px]" />
          <span>to</span>
          <Input type="date" value={q.endDate} onChange={(e) => set({ endDate: e.target.value })} aria-label="Started on or before" className="w-[150px]" />
        </div>
        <Select value={q.verification} onChange={(e) => set({ verification: e.target.value as typeof q.verification })} aria-label="Verification state">
          <option value="">Any verification</option>
          <option value="clean">Verified clean</option>
          <option value="changed">Drifted</option>
          <option value="missing_at_source">Gone from source</option>
          <option value="unverifiable">Could not verify</option>
          <option value="never">Never verified</option>
        </Select>
        <Select value={q.sort} onChange={(e) => set({ sort: e.target.value as typeof q.sort })} aria-label="Sort">
          <option value="endingSoon">Ending soon</option>
          <option value="newest">Newest</option>
          <option value="alpha">A to Z</option>
          <option value="brand">By brand</option>
        </Select>
        <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setMore((m) => !m)} aria-expanded={more} aria-controls="promotion-filters-more">
          {more ? "Fewer filters" : "More filters"}
        </Button>
        <div className="ml-auto inline-flex rounded-md border border-line-strong bg-bg-elev p-0.5" role="group" aria-label="View">
          {views.map((v) => (
            <Button key={v.key} variant="ghost" size="sm" className={cn("h-7 gap-1.5 px-2", q.view === v.key && "bg-bg-muted")} onClick={() => set({ view: v.key })} aria-pressed={q.view === v.key}>
              <v.icon className="size-3.5" /> {v.label}
            </Button>
          ))}
        </div>
      </div>
      {more ? (
        <div id="promotion-filters-more" className="flex flex-wrap items-center gap-2">
          <Select value={q.presence} onChange={(e) => set({ presence: e.target.value as typeof q.presence })} aria-label="Source presence">
            <option value="">Listed by the portal</option>
            <option value="removed">No longer listed</option>
            <option value="all">Listed and removed</option>
          </Select>
          <Select value={q.freshness} onChange={(e) => set({ freshness: e.target.value as typeof q.freshness })} aria-label="Freshness">
            <option value="">Any freshness</option>
            <option value="fresh">Seen on the source in the last 24 hours</option>
            <option value="stale">Not seen for more than 24 hours</option>
            <option value="never_detail">Detail page never fetched</option>
          </Select>
          <div className="flex items-center gap-1 text-xs text-fg-muted">
            <span>First seen</span>
            <Input type="date" value={q.firstSeenFrom.slice(0, 10)} onChange={(e) => set({ firstSeenFrom: e.target.value })} aria-label="First seen on or after" className="w-[150px]" />
            <span>to</span>
            <Input type="date" value={q.firstSeenTo.slice(0, 10)} onChange={(e) => set({ firstSeenTo: e.target.value })} aria-label="First seen on or before" className="w-[150px]" />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-fg-muted">
            <input type="checkbox" checked={q.endingSoon} onChange={(e) => set({ endingSoon: e.target.checked })} /> Ending within 7 days
          </label>
          <label className="flex items-center gap-1.5 text-xs text-fg-muted">
            <input type="checkbox" checked={q.attention} onChange={(e) => set({ attention: e.target.checked })} /> Needs attention
          </label>
        </div>
      ) : null}
      {active > 0 ? (
        <div className="flex items-center gap-2 text-xs text-fg-muted">
          <span>
            {active} filter{active === 1 ? "" : "s"} active
          </span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => {
              setSearch("");
              set({ search: "", brand: "", collection: "", startDate: "", endDate: "", verification: "", presence: "", freshness: "", firstSeenFrom: "", firstSeenTo: "", endingSoon: false, attention: false });
            }}
          >
            <X className="size-3" /> Clear
          </Button>
        </div>
      ) : null}
    </div>
  );
}
