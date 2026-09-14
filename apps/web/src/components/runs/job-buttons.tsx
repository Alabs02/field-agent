"use client";

import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { EnqueueResponseSchema } from "@field-agent/shared";
import { Button, type ButtonProps } from "@/components/ui/button";

async function enqueue(path: "/scrape" | "/verify", body?: unknown) {
  const res = await fetch(`/backend${path}`, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as unknown;
  if (!res.ok) {
    const err = (json as { error?: { message?: string; code?: string } }).error;
    throw new Error(err?.message ?? `HTTP ${res.status}`);
  }
  return EnqueueResponseSchema.parse(json);
}

export function ScrapeButton({ force = false, ...props }: ButtonProps & { force?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="accent"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await enqueue("/scrape", force ? { force: true } : undefined);
          toast.success(r.reused ? "A scrape is already running" : "Scrape queued", {
            description: `Job ${r.jobId.slice(0, 8)}… — follow it on the Runs page.`,
            action: { label: "Open", onClick: () => router.push(`/app/runs/${r.runId}`) },
          });
          router.refresh();
        } catch (e) {
          toast.error("Could not queue the scrape", { description: e instanceof Error ? e.message : String(e) });
        } finally {
          setBusy(false);
        }
      }}
      {...props}
    >
      {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} {force ? "Force re-scrape" : "Run scrape"}
    </Button>
  );
}

export function VerifyButton(props: ButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="default"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await enqueue("/verify");
          toast.success(r.reused ? "A verification is already running" : "Verification queued", {
            description: "The report appears on the Verification page when it finishes.",
            action: { label: "Open", onClick: () => router.push(`/app/verify/${r.runId}`) },
          });
          router.refresh();
        } catch (e) {
          toast.error("Could not queue the verification", { description: e instanceof Error ? e.message : String(e) });
        } finally {
          setBusy(false);
        }
      }}
      {...props}
    >
      {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Run verification
    </Button>
  );
}
