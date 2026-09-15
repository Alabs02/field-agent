/** Shared by the server layout (reads the cookie) and the client provider (writes it). No "use client" here on purpose. */
export type SidebarState = "expanded" | "collapsed" | "hidden";
export const SIDEBAR_COOKIE = "fa-sidebar";

export function parseSidebarState(value: string | undefined): SidebarState {
  return value === "collapsed" || value === "hidden" ? value : "expanded";
}
