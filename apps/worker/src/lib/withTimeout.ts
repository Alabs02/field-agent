import { JobTimeoutError } from "@field-agent/scraper";

/**
 * BullMQ has no per-job timeout. This one aborts real work: the signal is
 * threaded into every fetch and every throttle sleep, so an in-flight
 * request is cancelled rather than left running after the promise loses.
 */
export async function withTimeout<T>(
  ms: number,
  run: (signal: AbortSignal) => Promise<T>,
  parentSignal?: AbortSignal,
): Promise<T> {
  const ac = new AbortController();
  const onParentAbort = () => ac.abort(parentSignal?.reason);
  parentSignal?.addEventListener("abort", onParentAbort, { once: true });
  const timer = setTimeout(() => ac.abort(new JobTimeoutError(ms)), ms);

  const aborted = new Promise<never>((_, reject) => {
    ac.signal.addEventListener("abort", () => reject(ac.signal.reason), { once: true });
  });

  try {
    return await Promise.race([run(ac.signal), aborted]);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener("abort", onParentAbort);
  }
}
