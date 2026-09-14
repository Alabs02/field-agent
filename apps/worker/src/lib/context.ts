import type { Redis } from "ioredis";
import type { Database } from "@field-agent/db";
import {
  BriargateAdapter,
  HttpEngine,
  PlaywrightEngine,
  RedisThrottle,
  type PortalAdapter,
  type ScrapeEngine,
} from "@field-agent/scraper";
import type { Env } from "../env.js";
import type { AppLogger } from "./logger.js";

export interface WorkerContext {
  env: Env;
  db: Database;
  redis: Redis;
  log: AppLogger;
  engine: ScrapeEngine;
  adapter: PortalAdapter;
  /** Throttle at the configured delay; jobs may build a stricter one after reading robots.txt. */
  makeThrottle: (delayMs: number) => RedisThrottle;
}

export function createEngine(env: Env): ScrapeEngine {
  const opts = { userAgent: env.SCRAPE_USER_AGENT, timeoutMs: env.SCRAPE_FETCH_TIMEOUT_MS };
  return env.SCRAPE_ENGINE === "playwright" ? new PlaywrightEngine(opts) : new HttpEngine(opts);
}

export function createWorkerContext(env: Env, db: Database, redis: Redis, log: AppLogger): WorkerContext {
  return {
    env,
    db,
    redis,
    log,
    engine: createEngine(env),
    adapter: new BriargateAdapter({ userAgent: env.SCRAPE_USER_AGENT }),
    makeThrottle: (delayMs) => new RedisThrottle(redis, delayMs),
  };
}
