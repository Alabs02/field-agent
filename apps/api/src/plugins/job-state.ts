import type { Queue } from "bullmq";
import type { QueueState, RunStatus } from "@field-agent/shared";

const STALE_HEARTBEAT_MS = 60_000;

export async function queueStateOf(queue: Queue, jobId: string): Promise<QueueState> {
  try {
    const job = await queue.getJob(jobId);
    if (!job) return "unknown";
    const state = await job.getState();
    switch (state) {
      case "waiting":
      case "waiting-children":
        return "waiting";
      case "delayed":
        return "delayed";
      case "prioritized":
        return "prioritized";
      case "active":
        return "active";
      case "completed":
        return "completed";
      case "failed":
        return "failed";
      default:
        return "unknown";
    }
  } catch {
    return "unknown";
  }
}

/**
 * Reconcile the durable row with what the queue says. A row that claims
 * "running" with a stale heartbeat is reported as
 * "stalled" so an operator sees a dead worker without waiting for BullMQ.
 */
export function effectiveStatus(
  rowStatus: RunStatus,
  heartbeatAt: string | null,
  queueState: QueueState,
  now = Date.now(),
): RunStatus {
  if (rowStatus === "running") {
    const beat = heartbeatAt ? new Date(heartbeatAt).getTime() : 0;
    const stale = now - beat > STALE_HEARTBEAT_MS;
    if (queueState === "failed") return "failed";
    if (stale) return "stalled";
  }
  if (rowStatus === "queued" && queueState === "failed") return "failed";
  return rowStatus;
}
