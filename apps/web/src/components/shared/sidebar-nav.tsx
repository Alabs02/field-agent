"use client";

import { Activity, ShieldCheck, Store, Tag, Users, CalendarClock, History, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "Overview", icon: Activity, exact: true },
  { href: "/app/promotions", label: "Promotions", icon: Tag },
  { href: "/app/brands", label: "Brands", icon: Store },
  { href: "/app/runs", label: "Runs", icon: Activity },
  { href: "/app/verify", label: "Verification", icon: ShieldCheck },
  { href: "/app/schedules", label: "Schedules", icon: CalendarClock },
  { href: "/app/audit", label: "Audit trail", icon: History },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
];

export function SidebarNav({ role }: { role: string | null }) {
  const pathname = usePathname();
  const all = role === "super_admin" ? [...items, { href: "/app/admin", label: "Admin", icon: Users }] : items;
  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {all.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active ? "bg-plum-100 font-medium text-plum-900 dark:bg-plum-900/50 dark:text-plum-100" : "text-fg-muted hover:bg-bg-muted hover:text-fg",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
