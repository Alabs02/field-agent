import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 tracking-wide",
  {
    variants: {
      tone: {
        neutral: "border-line bg-bg-muted text-fg-muted",
        brand: "border-transparent bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
        accent: "border-transparent bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200",
        ok: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
        warn: "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
        bad: "border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
        outline: "border-line-strong bg-transparent text-fg",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
