import type { JobsOptions } from "bullmq";

/**
 * Retries with exponential backoff (30s, 60s, 120s). Parse and validation
 * errors are thrown as UnrecoverableError by the worker so they do not retry.
 * Redis retention is for the dashboard only; the DB run row is the record.
 */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 30_000 },
  removeOnComplete: { age: 24 * 3600, count: 200 },
  removeOnFail: { age: 7 * 24 * 3600, count: 500 },
};

export const WORKER_DEFAULTS = {
  concurrency: 1,
  lockDuration: 60_000,
  stalledInterval: 30_000,
  maxStalledCount: 1,
} as const;
