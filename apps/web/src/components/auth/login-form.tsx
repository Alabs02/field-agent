"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLE_LABELS, type Role } from "@field-agent/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEMO_PASSWORD = "FieldAgent-Demo-2026!";
const DEMO: Array<{ email: string; role: Role }> = [
  { email: "super.admin@fieldagent.demo", role: "super_admin" },
  { email: "operations@fieldagent.demo", role: "operations" },
  { email: "data.engineer@fieldagent.demo", role: "data_engineer" },
  { email: "account.manager@fieldagent.demo", role: "account_manager" },
  { email: "reviewer@fieldagent.demo", role: "reviewer" },
];

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        throw new Error(j.message ?? "Sign-in failed");
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {DEMO.map((d) => (
          <button
            key={d.email}
            type="button"
            onClick={() => {
              setEmail(d.email);
              setPassword(DEMO_PASSWORD);
            }}
            className="rounded-full border border-line-strong px-2.5 py-1 text-xs hover:border-accent hover:text-accent"
          >
            {ROLE_LABELS[d.role]}
          </button>
        ))}
      </div>
      <label className="text-xs font-medium text-fg-muted">
        Email
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" className="mt-1" />
      </label>
      <label className="text-xs font-medium text-fg-muted">
        Password
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="mt-1" />
      </label>
      {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}
      <Button type="submit" variant="accent" disabled={busy} className="mt-2">
        {busy ? <Loader2 className="animate-spin" /> : null} Sign in
      </Button>
      <p className="text-xs text-fg-subtle">Demo password for every account: <code className="font-mono">{DEMO_PASSWORD}</code></p>
    </form>
  );
}
