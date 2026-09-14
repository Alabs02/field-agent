import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { authRequired, getSessionUser } from "@/lib/session";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (!authRequired()) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold tracking-tight">Auth is off in local mode</h1>
        <p className="mt-2 text-sm text-fg-muted">
          The brief asks for an open local API, so every route is open and no sign-in is needed. Set <code className="rounded bg-bg-muted px-1 font-mono text-xs">AUTH_REQUIRED=true</code> to enable accounts and roles.
        </p>
        <a href="/app" className="mt-6 inline-block text-sm underline">
          Go to the app →
        </a>
      </Shell>
    );
  }
  const user = await getSessionUser();
  if (user) redirect(next && next.startsWith("/") ? next : "/app");
  return (
    <Shell>
      <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-fg-muted">Five demo accounts, one per persona from the brief. Pick one to fill the form.</p>
      <Suspense>
        <LoginForm next={next && next.startsWith("/") ? next : "/app"} />
      </Suspense>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4">
      <div className="w-full max-w-md rounded-xl border border-line bg-bg-elev p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-brand text-brand-fg text-xs font-bold">fa</span>
          <span className="text-sm font-semibold tracking-tight">field-agent</span>
        </div>
        {children}
      </div>
    </main>
  );
}
