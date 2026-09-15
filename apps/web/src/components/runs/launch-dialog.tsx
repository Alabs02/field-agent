"use client";

import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { OperationPolicySchema } from "@field-agent/shared";
import type { z } from "zod";
import { useCan } from "@/components/operations/access";
import { Button, type ButtonProps } from "@/components/ui/button";
import { enqueue } from "./job-buttons";

type Policy = z.infer<typeof OperationPolicySchema>;

const COPY = {
  scrape: {
    title: "Run scrape",
    intro: "Reads the portal's listing and directory, then each promotion and store page that changed.",
    options: [
      { key: "incremental", label: "Incremental refresh", detail: "Skips pages the sitemap says are unchanged. The everyday choice.", advanced: false },
      { key: "full", label: "Full refresh", detail: "Re-fetches every promotion and store page even when nothing changed. Costs the whole request budget.", advanced: true },
    ],
  },
  verify: {
    title: "Run verification",
    intro: "Compares what is stored against the live portal without rewriting anything.",
    options: [
      { key: "quick", label: "Quick check", detail: "Listing for every record, detail pages for flagged records and a sample.", advanced: false },
      { key: "full", label: "Full detail check", detail: "Fetches every stored promotion's detail page. Slow at the source's request spacing.", advanced: true },
    ],
  },
} as const;

/**
 * The one launch surface for manual work. Shows what the launch will do and what it will
 * cost before anything is queued; the API enforces the same policy server-side.
 */
export function LaunchDialog({ job: type, ...props }: Omit<ButtonProps, "type"> & { job: "scrape" | "verify" }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const allowed = useCan(type);
  const canAdvanced = useCan("advanced");
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [option, setOption] = useState<"incremental" | "quick" | "full">(type === "scrape" ? "incremental" : "quick");
  const [busy, setBusy] = useState(false);
  const copy = COPY[type];

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    fetch("/backend/operations/policy", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setPolicy(OperationPolicySchema.parse(json));
      })
      .catch(() => {
        /* The preview degrades to "unknown"; the launch itself still goes through the API. */
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (!allowed) return null;

  const submit = async () => {
    setBusy(true);
    try {
      const r =
        type === "scrape"
          ? await enqueue("/scrape", option === "full" ? { force: true } : {})
          : await enqueue("/verify", option === "full" ? { sampleRate: 1 } : {});
      dialog.current?.close();
      toast.success(r.reused ? `A ${type === "scrape" ? "scrape" : "verification"} with these options is already active` : `${copy.title.replace("Run ", "")} queued`, {
        description: r.reused ? "Opening the active run instead of starting another." : "Opening the run so you can follow its progress.",
      });
      router.push(type === "scrape" ? `/app/runs/${r.runId}` : `/app/verify/${r.runId}`);
    } catch (e) {
      toast.error(`Could not queue the ${type === "scrape" ? "scrape" : "verification"}`, { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const delaySeconds = policy ? Math.round(policy.minDelayMs / 1000) : null;
  const preview = [
    "Scope: the whole portal",
    type === "verify" ? `Sampling: ${option === "full" ? "100%" : policy ? `${Math.round(policy.sampleRate * 100)}% of unflagged records` : "default"}` : null,
    `Source spacing: ${delaySeconds != null ? `at least ${delaySeconds} s between requests` : "shared budget"}`,
    policy?.reviewerCooldownSeconds ? `Reviewer cooldown: ${Math.round(policy.reviewerCooldownSeconds / 60)} minutes between launches` : null,
  ].filter(Boolean);

  return (
    <>
      <Button variant={type === "scrape" ? "accent" : "default"} onClick={() => dialog.current?.showModal()} {...props}>
        {type === "scrape" ? <RefreshCw /> : <ShieldCheck />} {copy.title}
      </Button>
      <dialog ref={dialog} className="w-full max-w-md rounded-xl border border-line bg-bg-elev p-0 text-fg shadow-xl backdrop:bg-black/40" aria-labelledby={`launch-${type}-title`}>
        <form
          method="dialog"
          className="p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <h2 id={`launch-${type}-title`} className="text-lg font-semibold">
            {copy.title}
          </h2>
          <p className="mt-1 text-sm text-fg-muted">{copy.intro}</p>
          <fieldset className="mt-5 space-y-3">
            <legend className="sr-only">Options</legend>
            {copy.options.map((o) => {
              const locked = o.advanced && !canAdvanced;
              return (
                <label key={o.key} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${option === o.key ? "border-brand bg-brand/5" : "border-line"} ${locked ? "cursor-not-allowed opacity-60" : ""}`}>
                  <input type="radio" name="option" value={o.key} checked={option === o.key} disabled={locked} onChange={() => setOption(o.key)} className="mt-1" />
                  <span>
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className="block text-xs text-fg-muted">{o.detail}</span>
                    {locked ? <span className="mt-1 block text-xs text-fg-subtle">Available to operations, data engineers and super admins.</span> : null}
                  </span>
                </label>
              );
            })}
          </fieldset>
          <ul className="mt-5 space-y-1 rounded-md bg-bg-muted/60 p-3 text-xs text-fg-muted">
            {preview.map((line) => (
              <li key={line as string}>{line}</li>
            ))}
            <li>Identical launches while one is active reuse the active run.</li>
          </ul>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dialog.current?.close()} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant={type === "scrape" ? "accent" : "default"} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : null} Start
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
