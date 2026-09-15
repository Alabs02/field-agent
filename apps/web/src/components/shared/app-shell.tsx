import Link from "next/link";
import type * as React from "react";
import type { Role } from "@field-agent/shared";
import { BrandLockup } from "@/components/brand/lockup";
import { AccessProvider } from "../operations/access";
import { ActiveRunIndicator } from "../operations/active-run";
import { Notifications } from "../operations/notifications";
import { DesktopSidebar, SidebarControls } from "./sidebar-chrome";
import type { SidebarState } from "./sidebar-cookie";
import { SidebarProvider } from "./sidebar-state";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function AppShell({ children, authRequired, user, sidebar }: { children: React.ReactNode; authRequired: boolean; user: { name: string; role: Role } | null; sidebar: SidebarState }) {
  const role = user?.role ?? null;
  return (
    <AccessProvider role={role} authRequired={authRequired}>
      <SidebarProvider initial={sidebar}>
        <div className="flex min-h-dvh">
          <DesktopSidebar role={role} />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 border-b border-line bg-bg-elev/85 backdrop-blur supports-[backdrop-filter]:bg-bg-elev/75">
              <div className="flex h-14 items-center justify-between gap-3 px-3 md:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  <SidebarControls role={role} />
                  <Link href="/app" className="rounded-md md:hidden" aria-label="Field Agent overview">
                    <BrandLockup />
                  </Link>
                  {authRequired ? null : (
                    <span className="hidden items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs text-fg-muted md:inline-flex">
                      <span className="size-1.5 rounded-full bg-emerald-500" /> Local mode · auth off
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <ActiveRunIndicator />
                  <Notifications compact />
                  {authRequired ? <UserMenu user={user} /> : null}
                  <ThemeToggle />
                </div>
              </div>
              <div aria-hidden className="h-px w-full bg-gradient-to-r from-sky-400 via-pink-400 to-plum-400 opacity-70" />
            </header>
            <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </AccessProvider>
  );
}
