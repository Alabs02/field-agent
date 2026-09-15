"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { Activity, Bell, CalendarClock, History, LayoutDashboard, ShieldCheck, Store, Tag, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/app/promotions", label: "Promotions", icon: Tag },
  { href: "/app/brands", label: "Brands", icon: Store },
  { href: "/app/runs", label: "Runs", icon: Activity },
  { href: "/app/verify", label: "Verification", icon: ShieldCheck },
  { href: "/app/schedules", label: "Schedules", icon: CalendarClock },
  { href: "/app/audit", label: "Audit trail", icon: History },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
];

/** Primary navigation. Collapsed, each item is an icon with its label in a tooltip and for screen readers. */
export function SidebarNav({ role, collapsed = false }: { role: string | null; collapsed?: boolean }) {
  const pathname = usePathname();
  const all = role === "super_admin" ? [...items, { href: "/app/admin", label: "Admin", icon: Users }] : items;
  return (
    <Tooltip.Provider delayDuration={150} skipDelayDuration={400}>
      <nav aria-label="Primary" className={cn("flex flex-col gap-0.5", collapsed ? "items-stretch px-2 py-3" : "p-3")}>
        {all.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          const link = (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center rounded-md text-sm transition-colors",
                collapsed ? "size-10 justify-center" : "gap-2.5 px-3 py-2",
                active ? "bg-sky-100 font-semibold text-plum-900 dark:bg-sky-900/40 dark:text-sky-100" : "text-fg-muted hover:bg-bg-muted hover:text-fg",
              )}
            >
              {active ? <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand" /> : null}
              <Icon className={cn("size-4 shrink-0", active ? "text-sky-700 dark:text-sky-300" : "")} />
              <span className={collapsed ? "sr-only" : undefined}>{label}</span>
            </Link>
          );
          if (!collapsed) return link;
          return (
            <Tooltip.Root key={href}>
              <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content side="right" sideOffset={8} className="z-50 rounded-md border border-line bg-bg-elev px-2.5 py-1.5 text-xs font-medium text-fg shadow-md">
                  {label}
                  <Tooltip.Arrow className="fill-bg-elev" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        })}
      </nav>
    </Tooltip.Provider>
  );
}
