"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import Link from "next/link";
import { BrandLockup } from "@/components/brand/lockup";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar-nav";
import { useSidebar } from "./sidebar-state";

const PORTAL = { name: "The Promenade Shops at Briargate", place: "Colorado Springs, CO · America/Denver" };

/** The desktop rail: sticky, its own scroll, three widths. Nothing renders below md. */
export function DesktopSidebar({ role }: { role: string | null }) {
  const { state, setState } = useSidebar();
  if (state === "hidden") return null;
  const collapsed = state === "collapsed";
  return (
    <aside
      id="primary-sidebar"
      aria-label="Sidebar"
      className={cn(
        "hidden shrink-0 flex-col border-r border-line bg-bg-elev transition-[width] duration-150 ease-out motion-reduce:transition-none md:sticky md:top-0 md:flex md:h-dvh md:overflow-y-auto",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <div className={cn("flex h-14 shrink-0 items-center border-b border-line", collapsed ? "justify-center" : "px-4")}>
        <Link href="/app" className="rounded-md" aria-label="Field Agent overview">
          <BrandLockup markOnly={collapsed} />
        </Link>
      </div>
      <SidebarNav role={role} collapsed={collapsed} />
      <div className={cn("mt-auto border-t border-line", collapsed ? "p-2" : "p-3")}>
        {collapsed ? null : (
          <div className="mb-2 px-1 text-xs text-fg-muted">
            <p className="font-medium text-fg">{PORTAL.name}</p>
            <p>{PORTAL.place}</p>
          </div>
        )}
        <Button variant="ghost" size={collapsed ? "icon" : "sm"} className={cn("text-fg-muted", collapsed ? "w-full" : "w-full justify-start px-2")} onClick={() => setState("hidden")} aria-label="Hide sidebar" title="Hide sidebar (Ctrl+Shift+B)">
          <PanelLeftClose />
          {collapsed ? null : <span>Hide sidebar</span>}
        </Button>
      </div>
    </aside>
  );
}

/** Header controls: collapse/expand or show on desktop; below md the menu button is the drawer's trigger. */
export function SidebarControls({ role }: { role: string | null }) {
  const { state, toggle, setState } = useSidebar();
  return (
    <>
      <MobileDrawer role={role} />
      {state === "hidden" ? (
        <Button variant="ghost" size="icon" className="hidden md:inline-flex" aria-label="Show navigation" title="Show navigation (Ctrl+Shift+B)" aria-controls="primary-sidebar" aria-expanded={false} onClick={() => setState("expanded")}>
          <PanelLeftOpen />
        </Button>
      ) : (
        <Button variant="ghost" size="icon" className="hidden md:inline-flex" aria-label={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"} title={`${state === "expanded" ? "Collapse" : "Expand"} sidebar (Ctrl+B)`} aria-controls="primary-sidebar" aria-expanded={state === "expanded"} onClick={toggle}>
          {state === "expanded" ? <PanelLeftClose /> : <PanelLeftOpen />}
        </Button>
      )}
    </>
  );
}

/** Off-canvas navigation below md, on Radix Dialog for focus handling, Escape and scroll lock. */
function MobileDrawer({ role }: { role: string | null }) {
  const { mobileOpen, setMobileOpen } = useSidebar();
  return (
    <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
          <Menu />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-plum-950/40 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_.18s_ease-out] motion-reduce:animate-none md:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-line bg-bg-elev shadow-2xl outline-none data-[state=open]:animate-[slide-in-left_.22s_cubic-bezier(.16,1,.3,1)] motion-reduce:animate-none md:hidden"
        >
          <div className="flex h-14 items-center justify-between border-b border-line px-4">
            <Dialog.Title asChild>
              <Link href="/app" className="rounded-md">
                <BrandLockup />
              </Link>
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close navigation">
                <X />
              </Button>
            </Dialog.Close>
          </div>
          <SidebarNav role={role} />
          <div className="mt-auto border-t border-line p-4 text-xs text-fg-muted">
            <p className="font-medium text-fg">{PORTAL.name}</p>
            <p>{PORTAL.place}</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
