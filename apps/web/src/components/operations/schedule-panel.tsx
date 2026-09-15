"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ScheduleSchema} from "@field-agent/shared";
import { type ScheduleInput } from "@field-agent/shared";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { postOperation } from "@/lib/operations-client";

export function SchedulePanel({ initial, canEdit }: { initial: z.infer<typeof ScheduleSchema>; canEdit: boolean }) {
  const router = useRouter();
  const [settings, setSettings] = useState<ScheduleInput>(initial);
  const [busy, setBusy] = useState(false);
  const save = async (next: ScheduleInput) => {
    setBusy(true);
    try { await postOperation("/schedules", next); setSettings(next); toast.success("Schedule updated"); router.refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not save schedule"); }
    finally { setBusy(false); }
  };
  const date = (value: string | null) => value ? new Date(value).toLocaleString(undefined, { timeZone: "America/Denver", timeZoneName: "short" }) : "Not scheduled";
  return <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
    <section className="rounded-xl border border-line bg-bg-elev p-6">
      <div className="mb-6 flex items-center justify-between"><h2 className="text-lg font-semibold">Portal schedule</h2><span className="rounded-full bg-bg-muted px-3 py-1 text-sm">{initial.enabled ? "Enabled" : "Paused"}</span></div>
      <form onSubmit={event => { event.preventDefault(); void save(settings); }} className="space-y-5">
        <fieldset disabled={!canEdit || busy} className="space-y-5 disabled:opacity-60">
          <label className="flex items-center gap-2"><input type="checkbox" checked={settings.enabled} onChange={e => setSettings({ ...settings, enabled: e.target.checked })} /> Enable scheduled cycles</label>
          <div className="flex flex-wrap gap-2">{[1, 6, 12, 24].map(hours => <Button key={hours} type="button" variant={settings.intervalHours === hours ? "default" : "outline"} size="sm" onClick={() => setSettings({ ...settings, intervalHours: hours })}>{hours === 24 ? "Daily" : `Every ${hours}h`}</Button>)}</div>
          <label className="block text-sm">Interval in whole hours
            <input className="mt-2 block w-full rounded-md border border-line bg-bg px-3 py-2" type="number" required min={1} max={168} step={1} value={settings.intervalHours} onChange={e => setSettings({ ...settings, intervalHours: Number(e.target.value) })} />
          </label>
          <label className="block text-sm">Verification coverage
            <select className="mt-2 block w-full rounded-md border border-line bg-bg px-3 py-2" value={settings.coverage} onChange={e => setSettings({ ...settings, coverage: e.target.value as "quick" | "full" })}><option value="quick">Quick: listing checks, flagged details and a sample</option><option value="full">Full: every stored promotion detail</option></select>
          </label>
          <Button type="submit" disabled={busy}>Save configuration</Button>
        </fieldset>
      </form>
      {!canEdit && <p className="mt-4 text-sm text-fg-muted">Your role has view-only access to this schedule.</p>}
    </section>
    <section className="space-y-5 rounded-xl border border-line bg-bg-elev p-6">
      <h2 className="text-lg font-semibold">Execution & ownership</h2>
      <dl className="space-y-4 text-sm">{[["Next due", date(initial.nextRunAt)], ["Last actual start", date(initial.lastStartedAt)], ["Last outcome", initial.lastOutcome ?? "No cycles yet"], ["Configured by", initial.updatedBy], ["Scheduler", initial.schedulerSynced ? "Registered" : "Awaiting reconciliation"]].map(([label, value]) => <div key={label}><dt className="text-fg-muted">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>
      <p className="text-sm leading-relaxed text-fg-muted">Operations owns this schedule. Each cycle verifies the stored baseline, then refreshes the listing. An empty database is scraped first. Failed or cancelled verification stops the refresh.</p>
      <p className="text-sm leading-relaxed text-fg-muted">Saving an enabled schedule sets the first due time one interval from now. Busy cycles are skipped without accumulating catch-up work. All times use America/Denver.</p>
      {canEdit && <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => void save({ ...settings, enabled: !initial.enabled })}>{initial.enabled ? "Pause" : "Resume"}</Button>
        <Button disabled={busy || !!initial.activeCycleId} onClick={async () => { setBusy(true); try { await postOperation("/schedules/run-now"); toast.success("Cycle started"); router.push("/app/runs"); } catch (err) { toast.error(err instanceof Error ? err.message : "Launch failed"); } finally { setBusy(false); } }}>Run now</Button>
      </div>}
    </section>
  </div>;
}
