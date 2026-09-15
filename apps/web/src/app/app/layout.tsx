import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HealthSchema } from "@field-agent/shared";
import { AppShell } from "@/components/shared/app-shell";
import { parseSidebarState, SIDEBAR_COOKIE } from "@/components/shared/sidebar-cookie";
import { apiFetch } from "@/lib/api";
import { authRequired, getSessionUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [health, cookieStore] = await Promise.all([apiFetch("/health", HealthSchema).catch(() => null), cookies()]);
  const required = health?.authRequired ?? authRequired();
  const user = required ? await getSessionUser() : null;
  if (required && !user) redirect("/login?next=/app");
  // The rail's width comes from a cookie so the first paint already matches the person's choice.
  const sidebar = parseSidebarState(cookieStore.get(SIDEBAR_COOKIE)?.value);
  return (
    <AppShell authRequired={required} user={user ? { name: user.name, role: user.role } : null} sidebar={sidebar}>
      {children}
    </AppShell>
  );
}
