import type * as React from "react";

/**
 * The Engagement Agents "ea" monogram, inline so it takes the current text colour
 * and needs no asset request. The mark belongs to Engagement Agents and identifies
 * the company this take-home was prepared for.
 */
export function EaMark({ title, className, ...props }: React.SVGAttributes<SVGSVGElement> & { title?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 935.2 449.6" fill="currentColor" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} {...props}>
      {title ? <title>{title}</title> : null}
      <path d="M214.4,449.6C90.4,449.6,0,363.2,0,224.8S88.8,0,214.4,0s206.4,91.2,206.4,202.4c0,17.6,0,28.8-1.6,44H56.8c4.8,102.4,76,156,157.6,156,74.4,0,124.8-39.2,140.8-97.6h59.2c-20,82.4-90.4,144.8-200,144.8ZM56.8,200.8h307.2c2.4-101.6-71.2-152.8-152-152.8S63.2,99.2,56.8,200.8Z" />
      <path d="M706.4,0c88,0,148,47.2,172.8,102.4V6.4h56v436.8h-56v-96.8c-25.6,56-86.4,103.2-173.6,103.2-119.2,0-208-88.8-208-225.6S586.4,0,706.4,0ZM716.8,48.8c-92,0-162.4,64-162.4,175.2s70.4,176.8,162.4,176.8,162.4-67.2,162.4-176-72.8-176-162.4-176Z" />
    </svg>
  );
}
