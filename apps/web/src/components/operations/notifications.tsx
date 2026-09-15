"use client";

import { AlertTriangle, Bell, CircleCheck, CircleX, Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { z } from "zod";
import { NotificationSchema, paginated } from "@field-agent/shared";
import { usePoll } from "@/lib/use-poll";
import { postOperation } from "@/lib/operations-client";
import { fmtDateTime, fmtDayLong } from "@/lib/format";
import { Button } from "@/components/ui/button";

const schema = paginated(NotificationSchema).extend({ unread: z.number(), localMode: z.boolean() });
type Notification = z.infer<typeof NotificationSchema>;
type LocalRead = { ids: string[]; before: string | null };

/** In open local mode there is no user to attach read state to, so it lives in this browser only. */
const LOCAL_KEY = "field-agent-notification-read";
const EMPTY_LOCAL: LocalRead = { ids: [], before: null };

const SEVERITY: Record<Notification["severity"], { icon: typeof Info; className: string; label: string }> = {
  info: { icon: Info, className: "text-fg-muted", label: "Info" },
  success: { icon: CircleCheck, className: "text-emerald-600 dark:text-emerald-300", label: "Success" },
  warning: { icon: AlertTriangle, className: "text-amber-600 dark:text-amber-300", label: "Warning" },
  error: { icon: CircleX, className: "text-red-600 dark:text-red-300", label: "Error" },
};

function readLocal(): LocalRead {
  try {
    return { ...EMPTY_LOCAL, ...(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}") as Partial<LocalRead>) };
  } catch {
    return EMPTY_LOCAL; // Browser storage can be unavailable; every notification then reads as unread.
  }
}

export function Notifications({ compact = false }: { compact?: boolean }) {
  const [page, setPage] = useState(1);
  const { data, error } = usePoll(`/notifications?page=${page}&pageSize=${compact ? 100 : 20}`, schema, { intervalMs: 10_000 });
  const [local, setLocal] = useState<LocalRead>(EMPTY_LOCAL);
  useEffect(() => {
    setLocal(readLocal());
    const sync = () => setLocal(readLocal());
    window.addEventListener("notifications-read", sync);
    return () => window.removeEventListener("notifications-read", sync);
  }, []);

  const isRead = (event: Notification) => !!event.readAt || !!(data?.localMode && (local.ids.includes(event.id) || (local.before != null && event.createdAt <= local.before)));
  const unread = data?.localMode ? data.items.filter((event) => !isRead(event)).length + Math.max(0, data.total - data.items.length) : (data?.unread ?? 0);

  const mark = async (id?: string) => {
    if (data?.localMode) {
      const next: LocalRead = id ? { ...local, ids: [...new Set([...local.ids, id])] } : { ids: [], before: new Date().toISOString() };
      setLocal(next);
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      } catch {
        /* Storage unavailable: the state lives for this page only. */
      }
      window.dispatchEvent(new Event("notifications-read"));
    } else {
      await postOperation("/notifications/read", { id });
    }
  };

  if (compact) {
    return (
      <Link href="/app/notifications" className="relative rounded-md p-2 hover:bg-bg-muted" aria-label={error ? "Notifications unavailable" : `Notifications, ${unread} unread`}>
        <Bell className="size-4" />
        {unread > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-brand px-1 text-[10px] text-brand-fg">{unread > 99 ? "99+" : unread}</span> : null}
        {error ? <span className="absolute right-0 top-0 text-xs" title="Notifications unavailable">!</span> : null}
      </Link>
    );
  }

  const days = new Map<string, Notification[]>();
  for (const event of data?.items ?? []) {
    const day = fmtDayLong(event.createdAt);
    days.set(day, [...(days.get(day) ?? []), event]);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          {unread} unread · {data?.localMode ? "Read state is saved in this browser (open local mode)" : "Read state is saved to your account"}
        </p>
        <Button variant="outline" size="sm" disabled={unread === 0} onClick={() => void mark()}>
          Mark all read
        </Button>
      </div>
      {error ? (
        <p role="alert" className="rounded-md border border-red-300 p-4 text-sm">
          Notifications disconnected: {error}. Retrying automatically.
        </p>
      ) : null}
      {[...days.entries()].map(([day, events]) => (
        <div key={day}>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted">{day}</h2>
          <ul className="space-y-2">
            {events.map((event) => {
              const severity = SEVERITY[event.severity];
              const read = isRead(event);
              return (
                <li key={event.id} className={`flex items-start gap-3 rounded-xl border border-line p-4 ${read ? "bg-bg" : "bg-bg-elev"}`}>
                  <severity.icon className={`mt-0.5 size-4 shrink-0 ${severity.className}`} aria-label={severity.label} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${read ? "" : "font-medium"}`}>{event.message}</p>
                    <p className="mt-1 text-xs text-fg-muted">
                      {fmtDateTime(event.createdAt)} · {event.actor}
                      {event.href ? (
                        <>
                          {" · "}
                          <Link className="underline-offset-4 hover:underline" href={event.href}>
                            Open {event.label}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  {!read ? (
                    <Button size="sm" variant="ghost" onClick={() => void mark(event.id)}>
                      Mark read
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {data?.total === 0 ? <p className="rounded-xl border border-line p-10 text-center text-fg-muted">No notifications yet. Run outcomes, detected drift and schedule changes will appear here.</p> : null}
      {data && data.totalPages > 1 ? (
        <div className="flex items-center justify-end gap-3 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="tabular">
            Page {page} of {Math.max(1, data.totalPages)}
          </span>
          <Button variant="outline" size="sm" disabled={!data.hasNext} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      ) : null}
    </section>
  );
}
