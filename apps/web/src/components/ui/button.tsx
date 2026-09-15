import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Primary action: Engagement Agents' dark plum ("Let's Talk"). */
        default: "bg-ink text-ink-fg shadow-sm hover:bg-plum-700 dark:hover:bg-plum-200",
        /** Identity action: sky with deep ink text (white on sky fails contrast). */
        brand: "bg-brand text-brand-fg shadow-sm hover:bg-sky-400 dark:hover:bg-sky-300",
        /** Call to action: pink ("Find Out How"). */
        accent: "bg-accent text-accent-fg shadow-sm hover:bg-pink-600 dark:hover:bg-pink-300",
        outline: "border border-line-strong bg-bg-elev hover:border-sky-300 hover:bg-sky-50 dark:hover:border-sky-800 dark:hover:bg-sky-950/40",
        ghost: "hover:bg-bg-muted",
        link: "text-brand-text underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-11 px-6 text-base",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
