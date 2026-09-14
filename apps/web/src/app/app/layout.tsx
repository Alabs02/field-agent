import { redirect } from "next/navigation";
import { HealthSchema } from "@field-agent/shared";
import { AppShell } from "@/components/shared/app-shell";
import { apiFetch } from "@/lib/api";
import { authRequired, getSessionUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const health = await apiFetch("/health", HealthSchema).catch(() => null);
  const required = health?.authRequired ?? authRequired();
  const user = required ? await getSessionUser() : null;
  if (required && !user) redirect("/login?next=/app");
  return (
    <AppShell authRequired={required} user={user ? { name: user.name, role: user.role } : null}>
      {children}
    </AppShell>
  );
}
