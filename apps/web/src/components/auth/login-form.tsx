"use client";

import { Check, Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { PERMISSIONS, ROLE_LABELS, type Role } from "@field-agent/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dur, ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

const DEMO: Array<{ email: string; role: Role }> = [
  { email: "super.admin@fieldagent.demo", role: "super_admin" },
  { email: "operations@fieldagent.demo", role: "operations" },
  { email: "data.engineer@fieldagent.demo", role: "data_engineer" },
  { email: "account.manager@fieldagent.demo", role: "account_manager" },
  { email: "reviewer@fieldagent.demo", role: "reviewer" },
];

/** One line per persona, derived from the same PERMISSIONS map the API enforces. */
function describe(role: Role): string {
  const caps = PERMISSIONS[role];
  if (caps.has("admin")) return "Everything, including users";
  if (caps.has("advanced")) return "Runs, schedules, full refresh";
  if (caps.has("scrape")) return "Bounded runs and schedules";
  return "Browse and export";
}

/** The white card both sign-in states share; rises in on mount. */
export function LoginCard({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.slow, ease: ease.out }}
      className="w-full max-w-md rounded-2xl border border-line bg-bg-elev p-7 shadow-[0_1px_2px_rgba(21,10,27,0.06),0_24px_60px_-28px_rgba(21,10,27,0.35)] sm:p-9"
    >
      {children}
    </motion.div>
  );
}

/** demoPassword comes from SEED_DEMO_PASSWORD on the server, so the page, the seed, and the README always agree. */
export function LoginForm({ next, demoPassword }: { next: string; demoPassword: string }) {
  const router = useRouter();
  const ids = { email: useId(), password: useId(), personas: useId() };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const persona = DEMO.find((d) => d.email === email)?.role ?? null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/backend/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message ?? "Sign-in failed. Check the email and password and try again.");
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(demoPassword);
      setCopied(true);
      toast.success("Demo password copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy. Select the password and copy it by hand.");
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
      <fieldset className="min-w-0">
        <legend id={ids.personas} className="text-xs font-medium text-fg-muted">
          Demo personas
        </legend>
        <div role="group" aria-labelledby={ids.personas} className="mt-2 flex flex-wrap gap-1.5">
          {DEMO.map((d) => {
            const selected = persona === d.role;
            return (
              <button
                key={d.email}
                type="button"
                aria-pressed={selected}
                title={describe(d.role)}
                onClick={() => {
                  setEmail(d.email);
                  setPassword(demoPassword);
                  setError(null);
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  selected ? "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-100" : "border-line-strong text-fg-muted hover:border-sky-300 hover:bg-sky-50 hover:text-fg dark:hover:bg-sky-950/40",
                )}
              >
                {ROLE_LABELS[d.role]}
              </button>
            );
          })}
        </div>
        <p className="mt-2 min-h-4 text-xs text-fg-subtle" aria-live="polite">
          {persona ? `${ROLE_LABELS[persona]}: ${describe(persona)}.` : "Each persona matches a role from the brief."}
        </p>
      </fieldset>

      <div>
        <label htmlFor={ids.email} className="text-xs font-medium text-fg-muted">
          Email
        </label>
        <Input id={ids.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" inputMode="email" className="mt-1.5 h-11" placeholder="you@company.com" />
      </div>

      <div>
        <label htmlFor={ids.password} className="text-xs font-medium text-fg-muted">
          Password
        </label>
        <div className="relative mt-1.5">
          <Input id={ids.password} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="h-11 pr-11" />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-fg-muted hover:text-fg"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="brand" size="lg" disabled={busy} className="mt-1 w-full">
        {busy ? <Loader2 className="animate-spin" /> : null} Sign in
      </Button>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-subtle">
        <span>Demo password for every account:</span>
        <code className="rounded bg-bg-muted px-1.5 py-0.5 font-mono text-[11px] text-fg">{demoPassword}</code>
        <button type="button" onClick={() => void copyPassword()} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-fg-muted hover:bg-bg-muted hover:text-fg" aria-label="Copy the demo password">
          {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </p>
    </form>
  );
}
