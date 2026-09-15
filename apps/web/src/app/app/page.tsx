import Link from "next/link";
import { redirect } from "next/navigation";
import { OverviewSchema, ScheduleSchema, AuditEventSchema, paginated } from "@field-agent/shared";
import { apiFetch } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { LaunchDialog } from "@/components/runs/launch-dialog";
import { OverviewCharts } from "@/components/operations/overview-charts";
import { fmtDateTime, toIsoParam } from "@/lib/format";

export const metadata = { title: "Overview" };
export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  if (["search", "brand", "collection", "startDate", "endDate", "verification", "sort", "view", "page", "pageSize"].some(key => q[key])) redirect(`/app/promotions?${new URLSearchParams(Object.entries(q).filter((entry): entry is [string,string] => entry[1] !== undefined))}`);
  const query = Object.fromEntries(Object.entries(q).filter(([key,value]) => ["period","from","to"].includes(key) && value));
  for (const key of ["from","to"]) { const iso = toIsoParam(query[key]); if (iso) query[key] = iso; else delete query[key]; }
  const [data, schedule, events] = await Promise.all([apiFetch("/overview", OverviewSchema, { searchParams: query }), apiFetch("/schedules", ScheduleSchema), apiFetch("/audit", paginated(AuditEventSchema), { searchParams: { pageSize: 6, entityType: "promotions,brands,schedule,schedule_cycle,run" } })]);
  const i = data.inventory;
  const metrics = [
    ["Listed promotions", i.listed, "Current portal inventory", "/app/promotions"],
    ["Ending within 7 days", i.endingSoon, `Known end dates, from today${i.unknownEnd ? `; ${i.unknownEnd} without an end date` : ""}`, "/app/promotions?endingSoon=true&sort=endingSoon"],
    ["Newly discovered", data.activity.discovered, "First observed in this period", `/app/promotions?firstSeenFrom=${encodeURIComponent(data.from)}&firstSeenTo=${encodeURIComponent(data.to)}&sort=newest`],
    ["Records needing attention", i.needsAttention, "Changed, missing or unverifiable at the last check", "/app/promotions?attention=true"],
  ] as const;
  return <>
    <PageHeader eyebrow="The Promenade Shops at Briargate" title="Mall intelligence" description="Know what is listed, what changed, and where the pipeline needs your attention." actions={<><LaunchDialog job="verify" /><LaunchDialog job="scrape" /></>} />
    <form className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-bg-elev p-4">
      <label className="text-xs text-fg-muted">Reporting period<select name="period" defaultValue={q.period ?? "7d"} className="mt-1 block rounded-md border border-line bg-bg px-3 py-2 text-sm text-fg"><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="custom">Custom dates</option></select></label>
      {['from','to'].map(name => <label key={name} className="text-xs text-fg-muted">Custom {name}<input name={name} type="datetime-local" defaultValue={q[name]} className="mt-1 block rounded-md border border-line bg-bg px-3 py-2 text-sm text-fg" /></label>)}
      <button className="rounded-md bg-brand px-4 py-2 text-sm text-brand-fg">Apply period</button><Link href="/app" className="p-2 text-sm underline">Reset</Link>
    </form>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label,value,hint,href]) => <Link key={label} href={href} className="rounded-xl border border-line bg-bg-elev p-5 hover:border-brand"><p className="text-sm text-fg-muted">{label}</p><p className="mt-3 text-4xl font-semibold tracking-tight tabular">{value}</p><p className="mt-2 text-xs text-fg-subtle">{hint}</p></Link>)}</div>
    <p className="my-4 text-xs text-fg-muted">Inventory reflects stored records now. Activity covers {fmtDateTime(data.from)} to {fmtDateTime(data.to)}. Times use America/Denver.</p>
    <div className="mb-6 grid gap-4 lg:grid-cols-3">
      <section className="rounded-xl border border-line bg-bg-elev p-5"><h2 className="font-semibold">Pipeline pulse</h2><dl className="mt-4 space-y-3 text-sm">{[["Last successful scrape",fmtDateTime(data.lastScrapeAt)],["Last verification",fmtDateTime(data.lastVerifyAt)],["Next cycle",schedule.enabled ? fmtDateTime(schedule.nextRunAt) : "Schedule paused"]].map(([label,value]) => <div key={label}><dt className="text-fg-muted">{label}</dt><dd>{value}</dd></div>)}</dl><Link href="/app/schedules" className="mt-4 inline-block text-sm underline">Manage schedule</Link></section>
      <section className="rounded-xl border border-line bg-bg-elev p-5"><h2 className="font-semibold">Verification coverage</h2><p className="my-4 text-3xl font-semibold tabular">{i.detailChecked}<span className="text-sm font-normal text-fg-muted"> detail checks</span></p><p className="text-sm text-fg-muted">{i.listingChecked} listing-only checks · {i.unverified} without recorded coverage</p><p className="mt-3 text-xs text-fg-muted">A listing check covers presence and listing fields. It does not establish that every detail matches.</p><Link href="/app/verify" className="mt-4 inline-block text-sm underline">Inspect verification</Link></section>
      <section className="rounded-xl border border-line bg-bg-elev p-5"><h2 className="font-semibold">Brand enrichment</h2><p className="my-4 text-3xl font-semibold tabular">{i.brandsFetched}<span className="text-base font-normal text-fg-muted"> / {i.brands} fetched</span></p><p className="text-sm text-fg-muted">{i.brandsWithWebsite} websites · {i.brandsWithHours} hours · {i.brandsWithSocials} social profiles</p><p className="mt-3 text-xs text-fg-muted">A fetched page may not publish these fields. Unfetched pages remain unknown.</p><Link href="/app/brands" className="mt-4 inline-block text-sm underline">Browse brands</Link></section>
    </div>
    <OverviewCharts data={data} />
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_2fr]"><section className="rounded-xl border border-line bg-bg-elev p-5"><h2 className="font-semibold">Activity in this period</h2><dl className="mt-4 space-y-3 text-sm">{[["Runs",data.activity.runs],["Source requests",data.activity.requests],["Runs needing attention",data.activity.failed],["Stored promotion edits",data.activity.changed]].map(([label,value]) => <div key={label} className="flex justify-between"><dt className="text-fg-muted">{label}</dt><dd className="font-semibold tabular">{value}</dd></div>)}</dl></section><section className="rounded-xl border border-line bg-bg-elev p-5"><div className="flex justify-between"><h2 className="font-semibold">Recent changes</h2><Link href="/app/audit" className="text-sm underline">Full audit trail</Link></div><ul className="mt-2 divide-y divide-line">{events.items.map(event => <li key={event.id} className="py-3"><Link href={event.href ?? "/app/audit"} className="text-sm font-medium">{event.message}</Link><p className="mt-1 text-xs text-fg-muted">{event.actor} · {fmtDateTime(event.createdAt)}</p></li>)}</ul>{events.total === 0 && <p className="mt-4 text-sm text-fg-muted">New events will appear here as work runs.</p>}</section></div>
  </>;
}
