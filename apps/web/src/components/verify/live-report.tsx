"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { VerificationReportSchema } from "@field-agent/shared";
import { usePoll } from "@/lib/use-poll";

/** While a report is in progress, poll and refresh the server-rendered page when it completes. */
export function LiveReport({ runId, inProgress }: { runId: string; inProgress: boolean }) {
  const router = useRouter();
  const { data, live, error } = usePoll(inProgress ? `/verify/${runId}` : null, VerificationReportSchema, {
    until: (r) => r.result !== "in_progress",
  });
  useEffect(() => {
    if (inProgress && !live) router.refresh();
  }, [inProgress, live, router]);
  if (!inProgress) return null;
  if (error) return <p role="alert" className="mb-4 rounded-md border border-red-300 p-3 text-sm">Monitoring disconnected: {error}. Retrying automatically.</p>;
  return (
    <p className="mb-4 rounded-md border border-line bg-bg-elev px-3 py-2 text-sm text-fg-muted">
      Checking… {data ? `${data.summary.checked} checked so far, ${data.summary.requestsMade} requests` : "waiting for the worker"}
    </p>
  );
}
