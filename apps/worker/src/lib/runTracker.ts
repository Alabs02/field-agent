import type { Job } from "bullmq";
import type { RunError } from "@field-agent/shared";
import { describeError } from "@field-agent/scraper";

const MAX_ERRORS = 200;
const FLUSH_INTERVAL_MS = 2_000;
const HEARTBEAT_INTERVAL_MS = 15_000;

/**
 * Accumulates run state in memory and flushes it to the DB row at most every
 * couple of seconds, plus a heartbeat so the API can tell a live run from a
 * dead one. `flush` is injected so the same tracker serves scrape and verify.
 */
export class RunTracker<TState extends object> {
  readonly errors: RunError[] = [];
  truncatedErrors = 0;
  requestsMade = 0;
  private dirty = false;
  private lastFlush = 0;
  private heartbeat: NodeJS.Timeout | null = null;
  private flushing: Promise<void> = Promise.resolve();

  constructor(
    public state: TState,
    private readonly persist: (patch: TState & { errors: RunError[]; requestsMade: number; heartbeatAt: Date }) => Promise<void>,
    private readonly job: Job | null,
    private readonly progressOf: (state: TState) => unknown,
  ) {}

  start(): void {
    this.heartbeat = setInterval(() => void this.flush(true), HEARTBEAT_INTERVAL_MS);
  }

  stop(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  update(mutate: (s: TState) => void): void {
    mutate(this.state);
    this.dirty = true;
    void this.flush(false);
  }

  recordError(stage: string, err: unknown, extra: { sourceId?: string | null; url?: string | null } = {}): RunError {
    const d = describeError(err);
    const entry: RunError = {
      stage,
      code: d.code,
      message: d.message.slice(0, 500),
      url: extra.url ?? d.url,
      sourceId: extra.sourceId ?? null,
      at: new Date().toISOString(),
    };
    if (this.errors.length < MAX_ERRORS) this.errors.push(entry);
    else this.truncatedErrors += 1;
    this.dirty = true;
    void this.flush(false);
    return entry;
  }

  countRequest(): void {
    this.requestsMade += 1;
    this.dirty = true;
  }

  /** Flush now (force) or only if the interval has elapsed. Serialized so writes never race. */
  flush(force: boolean): Promise<void> {
    const now = Date.now();
    if (!force && (!this.dirty || now - this.lastFlush < FLUSH_INTERVAL_MS)) return this.flushing;
    this.lastFlush = now;
    this.dirty = false;
    this.flushing = this.flushing.then(async () => {
      await this.persist({ ...this.state, errors: this.errors, requestsMade: this.requestsMade, heartbeatAt: new Date() });
      if (this.job) await this.job.updateProgress(this.progressOf(this.state) as object).catch(() => {});
    });
    return this.flushing;
  }
}
