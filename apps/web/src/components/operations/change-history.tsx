import Link from "next/link";
import { AuditEventSchema, paginated } from "@field-agent/shared";
import { apiFetch } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";

/** Columns the triggers stamp on every write; they carry no information for a reader. */
const NOISE = new Set(["updated_at", "last_seen_at", "scraped_at", "created_at", "store_page_fetched_at", "content_hash", "fingerprint", "source_payload", "last_scrape_run_id", "detail_fetched_at", "last_verified_at", "last_verification_run_id", "last_verification_outcome", "last_verification_coverage", "description_html"]);

function changedKeys(before: Record<string, unknown> | null, after: Record<string, unknown> | null): string[] {
  if (!after) return [];
  if (!before) return Object.keys(after).filter((k) => !NOISE.has(k) && after[k] != null && after[k] !== "" && !(Array.isArray(after[k]) && (after[k] as unknown[]).length === 0));
  return Object.keys(after).filter((k) => !NOISE.has(k) && JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}

function show(value: unknown): string {
  if (value == null || value === "") return "Not available";
  if (typeof value === "string") return value.length > 140 ? `${value.slice(0, 140)}…` : value;
  return JSON.stringify(value);
}

/**
 * Data-change history for one entity, straight from the audit trail. Before and after values
 * are the ones recorded at the time of the change, not re-read from the current row.
 */
export async function ChangeHistory({ entityId, title = "Data change history", emptyText }: { entityId: string; title?: string; emptyText: string }) {
  const events = await apiFetch("/audit", paginated(AuditEventSchema), { searchParams: { entityId, pageSize: 20 } }).catch(() => null);
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {events && events.total > events.items.length ? (
          <Link href={`/app/audit?entityId=${entityId}`} className="text-sm text-fg-muted underline-offset-4 hover:underline">
            All {events.total} events
          </Link>
        ) : null}
      </div>
      {!events ? (
        <p className="text-sm text-fg-muted">History is unavailable right now.</p>
      ) : events.items.length === 0 ? (
        <p className="text-sm text-fg-muted">{emptyText}</p>
      ) : (
        <ol className="divide-y divide-line rounded-lg border border-line bg-bg-elev">
          {events.items.map((e) => {
            const keys = changedKeys(e.before, e.after);
            return (
              <li key={e.id} className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{e.action.replaceAll(".", " · ").replaceAll("_", " ")}</p>
                  <p className="text-xs text-fg-muted">
                    {fmtDateTime(e.createdAt)} · {e.actor}
                    {e.runId ? (
                      <>
                        {" · "}
                        <Link href={e.href ?? `/app/audit?runId=${e.runId}`} className="underline-offset-4 hover:underline">
                          run {e.runId.slice(0, 8)}
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
                {keys.length ? (
                  <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-[10rem_1fr]">
                    {keys.slice(0, 12).map((k) => (
                      <div key={k} className="contents">
                        <dt className="text-fg-muted">{k.replaceAll("_", " ")}</dt>
                        <dd>
                          {e.before ? (
                            <>
                              <span className="text-red-700 line-through dark:text-red-300">{show(e.before[k])}</span> <span className="text-emerald-700 dark:text-emerald-300">{show(e.after?.[k])}</span>
                            </>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-300">{show(e.after?.[k])}</span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-1 text-xs text-fg-muted">{e.message}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
