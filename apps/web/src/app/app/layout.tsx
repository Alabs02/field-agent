import { HealthSchema } from "@field-agent/shared";
import { AppShell } from "@/components/shared/app-shell";
import { apiFetch } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const health = await apiFetch("/health", HealthSchema).catch(() => null);
  const authRequired = health?.authRequired ?? process.env.AUTH_REQUIRED === "true";
  const user = authRequired ? await getSessionUser() : null;
  return (
    <AppShell authRequired={authRequired} user={user ? { name: user.name, role: user.role } : null}>
      {children}
    </AppShell>
  );
}
