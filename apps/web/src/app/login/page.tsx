import { ArrowRight, ShieldCheck, Search, Send } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm, LoginCard } from "@/components/auth/login-form";
import { BrandLockup } from "@/components/brand/lockup";
import { Button } from "@/components/ui/button";
import { authRequired, getSessionUser } from "@/lib/session";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = next && next.startsWith("/") ? next : "/app";
  if (!authRequired()) {
    return (
      <Shell>
        <LoginCard>
          <h1 className="font-display text-2xl font-bold tracking-tight">Auth is off in local mode</h1>
          <p className="mt-2 text-sm text-fg-muted text-pretty">
            The brief asks for an open local API, so every route is open and no sign-in is needed. Set <code className="rounded bg-bg-muted px-1 font-mono text-xs">AUTH_REQUIRED=true</code> to enable accounts and roles.
          </p>
          <Button asChild variant="brand" className="mt-6 w-full" size="lg">
            <Link href="/app">
              Go to the app <ArrowRight />
            </Link>
          </Button>
        </LoginCard>
      </Shell>
    );
  }
  const user = await getSessionUser();
  if (user) redirect(target);
  return (
    <Shell>
      <LoginCard>
        <h1 className="font-display text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1.5 text-sm text-fg-muted">Sign in to Field Agent. Pick a demo persona to fill the form, or use your own account.</p>
        <Suspense>
          <LoginForm next={target} demoPassword={process.env.SEED_DEMO_PASSWORD || "FieldAgent-Demo-2026!"} />
        </Suspense>
      </LoginCard>
    </Shell>
  );
}

const PILLARS = [
  { icon: Search, title: "Scrape", body: "The portal's listing, every deal page and every store page, politely and on a schedule." },
  { icon: ShieldCheck, title: "Verify", body: "Stored records re-checked against the live source, with before and after values kept as evidence." },
  { icon: Send, title: "Serve", body: "Filters, exports and an audit trail an account manager can act on." },
];

/**
 * Split sign-in: a brand panel on the left (ambient gradient, the mark, what the
 * product does) and the form on the right. Stacks on small screens.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh bg-bg lg:grid-cols-[5fr_7fr]">
      <section className="relative isolate overflow-hidden border-b border-line bg-bg-elev lg:border-b-0 lg:border-r">
        <div className="ambient" aria-hidden>
          <i />
          <i />
          <i />
        </div>
        <div className="relative flex h-full flex-col justify-between gap-10 px-6 py-8 sm:px-10 lg:px-12 lg:py-12">
          <Link href="/" className="inline-flex w-fit rounded-md" aria-label="Field Agent home">
            <BrandLockup size="lg" />
          </Link>
          <div className="hidden lg:block">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-bg-elev/70 px-3 py-1 text-xs font-medium text-fg-muted backdrop-blur">
              <span className="size-1.5 rounded-full bg-brand" /> Promotions Aggregator · Single-Mall MVP
            </p>
            <h2 className="mt-6 max-w-md font-display text-4xl font-bold leading-[1.08] tracking-tight text-balance">Every promotion at the center, with the evidence to prove it.</h2>
            <p className="mt-4 max-w-md text-base text-fg-muted text-pretty">Field Agent walks the mall for you: it reads the portal, checks what changed, and keeps a record you can show.</p>
            <ul className="mt-10 grid max-w-md gap-4">
              {PILLARS.map((p) => (
                <li key={p.title} className="flex gap-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-bg-elev/80 text-sky-700 shadow-sm backdrop-blur dark:text-sky-300">
                    <p.icon className="size-4" />
                  </span>
                  <div>
                    <p className="font-display text-sm font-semibold">{p.title}</p>
                    <p className="text-sm text-fg-muted text-pretty">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="hidden text-xs text-fg-subtle lg:block">A take-home for Engagement Agents by Alabura. The ea mark belongs to Engagement Agents.</p>
        </div>
      </section>
      <section className="grid place-items-center px-4 py-10 sm:px-8 lg:py-12">{children}</section>
    </main>
  );
}
