import { cn } from "@/lib/utils";
import { EaMark } from "./ea-mark";

/**
 * Product name next to the Engagement Agents mark. `sm` sits in the sidebar and
 * header; `lg` opens the sign-in page. `markOnly` is the collapsed rail.
 */
export function BrandLockup({ size = "sm", markOnly = false, className }: { size?: "sm" | "lg"; markOnly?: boolean; className?: string }) {
  const mark = <EaMark title="Engagement Agents" className={cn("shrink-0 text-brand", size === "lg" ? "h-9" : "h-5")} />;
  if (markOnly) return <span className={cn("inline-flex items-center", className)}>{mark}</span>;
  return (
    <span className={cn("inline-flex items-center", size === "lg" ? "gap-3" : "gap-2.5", className)}>
      {mark}
      <span className="flex min-w-0 flex-col leading-none">
        <span className={cn("font-display font-bold tracking-tight text-fg", size === "lg" ? "text-xl" : "text-[15px]")}>Field Agent</span>
        <span className={cn("mt-1 text-fg-muted", size === "lg" ? "text-xs" : "text-[10px]")}>by Engagement Agents</span>
      </span>
    </span>
  );
}
