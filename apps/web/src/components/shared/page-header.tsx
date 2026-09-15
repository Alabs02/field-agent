import type * as React from "react";

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: string; actions?: React.ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-text">{eyebrow}</p> : null}
        <h1 className="font-display text-2xl font-bold tracking-tight text-balance">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-fg-muted text-pretty">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
