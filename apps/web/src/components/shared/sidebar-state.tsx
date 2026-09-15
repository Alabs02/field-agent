"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SIDEBAR_COOKIE, type SidebarState } from "./sidebar-cookie";

export type { SidebarState };

type Ctx = {
  /** Desktop rail state, persisted in a cookie so the server renders the right width on first paint. */
  state: SidebarState;
  setState: (next: SidebarState) => void;
  /** expanded <-> collapsed; a hidden rail comes back expanded. */
  toggle: () => void;
  /** Mobile drawer, session only. */
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

const SidebarContext = createContext<Ctx | null>(null);

export function SidebarProvider({ initial, children }: { initial: SidebarState; children: React.ReactNode }) {
  const [state, setStateRaw] = useState<SidebarState>(initial);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const setState = useCallback((next: SidebarState) => {
    setStateRaw(next);
    try {
      document.cookie = `${SIDEBAR_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* Cookies can be blocked; the choice then lasts for this page only. */
    }
  }, []);
  const toggle = useCallback(() => setState(state === "expanded" ? "collapsed" : "expanded"), [state, setState]);

  // The drawer is a way to get somewhere; once there, it is in the way.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Ctrl/Cmd+B: expand or collapse. Ctrl/Cmd+Shift+B: hide or show.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.key.toLowerCase() !== "b") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))) return;
      e.preventDefault();
      if (e.shiftKey) setState(state === "hidden" ? "expanded" : "hidden");
      else toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, setState, toggle]);

  const value = useMemo(() => ({ state, setState, toggle, mobileOpen, setMobileOpen }), [state, setState, toggle, mobileOpen]);
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): Ctx {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside SidebarProvider");
  return ctx;
}
