"use client";

import { Loader2, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { RunStatus } from "@field-agent/shared";
import { useCan } from "@/components/operations/access";
import { Button } from "@/components/ui/button";
import { postOperation } from "@/lib/operations-client";

const CANCELLABLE: ReadonlySet<RunStatus> = new Set(["queued", "running", "stalled"]);
const RETRYABLE: ReadonlySet<RunStatus> = new Set(["failed", "completed_with_errors", "cancelled"]);

/** Retry and Cancel for one run. The API decides eligibility; the buttons only hide what can never apply. */
export function RunActions({ runId, type, status, cancelRequestedAt, parentRunId }: { runId: string; type: "scrape" | "verify"; status: RunStatus; cancelRequestedAt?: string | null; parentRunId?: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"retry" | "cancel" | null>(null);
  const allowed = useCan(type);
  const detailPath = (id: string) => (type === "verify" ? `/app/verify/${id}` : `/app/runs/${id}`);

  const retry = async () => {
    setBusy("retry");
    try {
      const r = await postOperation<{ runId: string }>(`/runs/${runId}/retry`);
      toast.success("Retry queued", { description: "The original run is kept for the record. Opening the new run." });
      router.push(detailPath(r.runId));
    } catch (e) {
      toast.error("Could not retry this run", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    setBusy("cancel");
    try {
      const r = await postOperation<{ status: string }>(`/runs/${runId}/cancel`);
      toast.success(r.status === "cancelled" ? "Run cancelled" : "Cancellation requested", {
        description: r.status === "cancelled" ? "The job was removed before a worker picked it up." : "The worker stops at its next check, usually within a few seconds.",
      });
      router.refresh();
    } catch (e) {
      toast.error("Could not cancel this run", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  const showCancel = CANCELLABLE.has(status) && !cancelRequestedAt;
  const showRetry = RETRYABLE.has(status);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {parentRunId ? (
        <Link href={detailPath(parentRunId)} className="text-sm text-fg-muted underline-offset-4 hover:underline">
          Retry of run {parentRunId.slice(0, 8)}
        </Link>
      ) : null}
      {status === "stalled" && !cancelRequestedAt ? <span className="text-sm text-fg-muted">Stalled runs must be cancelled before they can be retried.</span> : null}
      {allowed && showCancel ? (
        <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void cancel()}>
          {busy === "cancel" ? <Loader2 className="animate-spin" /> : <XCircle />} Cancel
        </Button>
      ) : null}
      {allowed && showRetry ? (
        <Button variant="default" size="sm" disabled={busy !== null} onClick={() => void retry()}>
          {busy === "retry" ? <Loader2 className="animate-spin" /> : <RotateCcw />} Retry
        </Button>
      ) : null}
    </div>
  );
}
