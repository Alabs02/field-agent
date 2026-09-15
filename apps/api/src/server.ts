import { sql } from "drizzle-orm";
import { createDb, promotionsRepo } from "@field-agent/db";
import { createQueues, createRedis } from "@field-agent/queue";
import { launch } from "./services/launch.js";
import { startOperationsMonitor } from "./services/scheduler.js";
import { buildApp } from "./app.js";
import type { AppDeps } from "./deps.js";
import { loadEnv } from "./env.js";

const env = loadEnv();
const { db, close: closeDb } = createDb(env.DATABASE_URL, { max: 5 });
const redis = createRedis(env.REDIS_URL, "field-agent-api");
const queues = createQueues(redis);

const deps: AppDeps = {
  env,
  db,
  redis,
  queues,
  pingDb: async () => {
    await db.execute(sql`select 1`);
  },
};

const app = await buildApp({
  deps,
  logger: {
    level: env.LOG_LEVEL,
    ...(env.NODE_ENV !== "production" ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } } } : {}),
  },
});

/**
 * First-boot convenience: enqueue one scrape so a reviewer sees real data
 * without an extra step. Only when no scrape has ever completed, so restarts
 * never re-hit the portal.
 */
async function scrapeOnBoot(): Promise<void> {
  if (!env.SCRAPE_ON_BOOT) return;
  const completed = await promotionsRepo.countCompletedScrapes(db, env.PORTAL_ID);
  if (completed > 0) return;
  const run = await launch(deps, { type: "scrape", actor: "boot" });
  app.log.info({ runId: run.runId }, "no completed scrape yet; enqueued the first one (SCRAPE_ON_BOOT)");
}

let stopOperations: (() => Promise<void>) | undefined;

try {
  await app.listen({ port: env.API_PORT, host: env.API_HOST });
  stopOperations = await startOperationsMonitor(deps, app.log);
  app.log.info({ docs: `http://localhost:${env.API_PORT}/docs`, authRequired: env.AUTH_REQUIRED }, "field-agent api ready");
  await scrapeOnBoot().catch((err) => app.log.warn({ err }, "scrape-on-boot skipped"));
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, "shutting down");
  await app.close().catch(() => {});
  await stopOperations?.().catch(() => {});
  await queues.close().catch(() => {});
  await closeDb().catch(() => {});
  redis.disconnect();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
