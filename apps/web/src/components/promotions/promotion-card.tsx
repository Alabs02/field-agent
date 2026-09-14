import { ExternalLink, ImageOff } from "lucide-react";
import Link from "next/link";
import type { Promotion } from "@field-agent/shared";
import { Badge } from "@/components/ui/badge";
import { endsLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { VerificationBadge } from "./verification-badge";

const COLLECTION_LABEL: Record<Promotion["collection"], string> = {
  deals: "Deal",
  style_notes: "Style note",
  new_arrivals: "New arrival",
  other: "Promotion",
};

export function PromotionCard({ promotion: p, showBrand = true }: { promotion: Promotion; showBrand?: boolean }) {
  const ends = endsLabel(p.endsAt);
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-bg-elev shadow-xs transition-shadow hover:shadow-md">
      <Link href={`/app/promotions/${p.id}`} className="relative aspect-[4/3] w-full overflow-hidden bg-bg-muted" aria-label={p.title}>
        {p.imageUrl ? (
          <img
            src={p.imageUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center text-fg-subtle">
            <ImageOff className="size-6" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          <Badge tone={p.collection === "deals" ? "accent" : "brand"} className="bg-white/90 backdrop-blur dark:bg-black/60">
            {COLLECTION_LABEL[p.collection]}
          </Badge>
        </div>
        {p.removedAt ? (
          <div className="absolute inset-x-0 bottom-0 bg-red-600/90 px-2 py-1 text-center text-[11px] font-medium text-white">No longer listed</div>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {showBrand ? (
          <Link href={`/app/brands/${p.brand.slug}`} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted hover:text-accent">
            {p.brand.name}
          </Link>
        ) : null}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight">
          <Link href={`/app/promotions/${p.id}`} className="after:absolute after:inset-0 after:content-['']">
            {p.title}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <span
            className={cn(
              "text-xs tabular",
              ends.tone === "urgent" && "font-medium text-accent",
              ends.tone === "soon" && "text-amber-700 dark:text-amber-300",
              ends.tone === "past" && "text-fg-subtle line-through",
              (ends.tone === "normal" || ends.tone === "none") && "text-fg-muted",
            )}
          >
            {ends.text}
          </span>
          <VerificationBadge v={p.verification} compact />
        </div>
      </div>
      <a
        href={p.canonicalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative z-10 flex items-center justify-between border-t border-line px-4 py-2 text-xs text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
      >
        View on portal <ExternalLink className="size-3.5" />
      </a>
    </article>
  );
}
