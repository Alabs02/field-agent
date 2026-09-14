import Link from "next/link";
import type * as React from "react";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";

export function AppShell({ children, authRequired, user }: { children: React.ReactNode; authRequired: boolean; user: { name: string; role: string } | null }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-bg-elev md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-line px-5">
          <Link href="/app" className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-brand text-brand-fg text-xs font-bold">fa</span>
            <span className="text-sm font-semibold tracking-tight">field-agent</span>
          </Link>
        </div>
        <SidebarNav role={user?.role ?? null} />
        <div className="mt-auto border-t border-line p-4 text-xs text-fg-muted">
          <p className="font-medium text-fg">The Promenade Shops at Briargate</p>
          <p>Colorado Springs, CO · America/Denver</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-line bg-bg-elev/80 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/app" className="text-sm font-semibold">field-agent</Link>
          </div>
          <div className="hidden text-xs text-fg-muted md:block">
            {authRequired ? (
              user ? (
                <span>
                  Signed in as <span className="font-medium text-fg">{user.name}</span> · {user.role.replace("_", " ")}
                </span>
              ) : (
                <span>Not signed in</span>
              )
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Local mode · auth off
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
