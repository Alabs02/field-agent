"use client";

import { Activity, ShieldCheck, Store, Tag, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "Promotions", icon: Tag, exact: true },
  { href: "/app/brands", label: "Brands", icon: Store },
  { href: "/app/runs", label: "Runs", icon: Activity },
  { href: "/app/verify", label: "Verification", icon: ShieldCheck },
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
