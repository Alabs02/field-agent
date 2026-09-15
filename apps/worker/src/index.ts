import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Worker } from "bullmq";
import { createDb, runsRepo } from "@field-agent/db";
import { createRedis, WORKER_DEFAULTS } from "@field-agent/queue";
import { QUEUE, QUEUE_PREFIX, type ScrapeJobPayload, type VerifyJobPayload } from "@field-agent/shared";
import { loadEnv } from "./env.js";
import { processScrapeJob } from "./jobs/scrape.js";
import { processVerifyJob } from "./jobs/verify.js";
import { createWorkerContext } from "./lib/context.js";
import { createLogger } from "./lib/logger.js";

const env = loadEnv();
const log = createLogger(env.LOG_LEVEL, env.NODE_ENV !== "production");
const { db, close: closeDb } = createDb(env.DATABASE_URL, { max: 3 });
const redis = createRedis(env.REDIS_URL, "field-agent-worker");
const ctx = createWorkerContext(env, db, redis, log);

const scrapeWorker = new Worker<ScrapeJobPayload>(QUEUE.scrape, (job) => processScrapeJob(ctx, job), {
  connection: redis,
  prefix: QUEUE_PREFIX,
  ...WORKER_DEFAULTS,
  concurrency: env.WORKER_CONCURRENCY,
});
const verifyWorker = new Worker<VerifyJobPayload>(QUEUE.verify, (job) => processVerifyJob(ctx, job), {
  connection: redis,
  prefix: QUEUE_PREFIX,
  ...WORKER_DEFAULTS,
  concurrency: env.WORKER_CONCURRENCY,
});

/**
 * Readiness for a process with no HTTP port: once both queues are ready, write
 * a file the container health check can test. Removed on shutdown, so a
 * crash-looping worker is "unhealthy", not "up".
 */
const READY_FILE = process.env.WORKER_READY_FILE ?? path.join(tmpdir(), "field-agent-worker-ready");
const ready = new Set<string>();
function markReady(queue: string): void {
  ready.add(queue);
  if (ready.size < 2) return;
  writeFile(READY_FILE, new Date().toISOString()).catch((err) => log.warn({ err, file: READY_FILE }, "could not write readiness file"));
}

for (const [name, w] of [
  ["scrape", scrapeWorker],
  ["verify", verifyWorker],
] as const) {
  w.on("ready", () => {
    log.info({ queue: name }, "worker ready");
    markReady(name);
  });
  w.on("error", (err) => log.error({ queue: name, err }, "worker error"));
  w.on("failed", async (job, err) => {
    log.error({ queue: name, jobId: job?.id, attempt: job?.attemptsMade, err: err.message }, "job failed");
    // Terminal failure after all attempts (or a stall past the limit): make the DB row say so.
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      const patch = { status: "failed" as const, error: err.message, finishedAt: new Date() };
      if (name === "scrape") await runsRepo.updateScrapeRun(db, job.id!, patch).catch(() => {});
      else await runsRepo.updateVerificationRun(db, job.id!, patch).catch(() => {});
    }
  });
  w.on("stalled", (jobId) => log.warn({ queue: name, jobId }, "job stalled; it will be retried by the stall checker"));
}

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ signal }, "shutting down; waiting for the active job (up to 30s)");
  await unlink(READY_FILE).catch(() => {});
  await Promise.allSettled([scrapeWorker.close(), verifyWorker.close()]);
  await ctx.engine.close().catch(() => {});
  await closeDb().catch(() => {});
  redis.disconnect();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

log.info(
  { engine: ctx.engine.name, minDelayMs: env.SCRAPE_MIN_DELAY_MS, respectCrawlDelay: env.SCRAPE_RESPECT_CRAWL_DELAY, portal: env.PORTAL_ID },
  "field-agent worker booting",
);
