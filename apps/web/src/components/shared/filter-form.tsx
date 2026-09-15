import Link from "next/link";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type FilterField = {
  name: string;
  label: string;
  type?: "text" | "select" | "date" | "datetime-local" | "number";
  options?: Array<{ value: string; label: string }>;
  value?: string;
  placeholder?: string;
  min?: number;
  max?: number;
};

/**
 * URL-backed filter bar for server-rendered lists: a plain GET form, so it works
 * without JavaScript, is keyboard-accessible by default, and shares its state
 * with pagination and exports through the query string. Page resets on submit.
 */
export function FilterForm({ fields, clearHref, preserve = {}, submitLabel = "Apply filters", pageSize, pageSizes = [24, 48, 96] }: { fields: FilterField[]; clearHref: string; preserve?: Record<string, string | undefined>; submitLabel?: string; pageSize?: number; pageSizes?: number[] }) {
  const active = fields.filter((f) => f.value && f.value !== "").length;
  return (
    <form method="get" className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-bg-elev p-4" aria-label="Filters">
      {Object.entries(preserve).map(([name, value]) => (value ? <input key={name} type="hidden" name={name} value={value} /> : null))}
      {fields.map((f) => (
        <label key={f.name} className="flex min-w-[10rem] flex-col gap-1 text-xs text-fg-muted">
          {f.label}
          {f.type === "select" ? (
            <Select name={f.name} defaultValue={f.value ?? ""} className="w-full text-fg">
              {(f.options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          ) : (
            <Input name={f.name} type={f.type ?? "text"} defaultValue={f.value ?? ""} placeholder={f.placeholder} min={f.min} max={f.max} className="text-fg" />
          )}
        </label>
      ))}
      {pageSize ? (
        <label className="flex flex-col gap-1 text-xs text-fg-muted">
          Per page
          <Select name="pageSize" defaultValue={String(pageSize)} className="text-fg">
            {pageSizes.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </label>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">
          {submitLabel}
        </Button>
        {active > 0 ? (
          <Link href={clearHref} className="text-sm text-fg-muted underline-offset-4 hover:underline">
            Clear {active} filter{active === 1 ? "" : "s"}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
