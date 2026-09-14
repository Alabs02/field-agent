import type { Redis } from "ioredis";
import type { Database } from "@field-agent/db";
import type { Queues } from "@field-agent/queue";
import type { Env } from "./env.js";

/** Everything the app needs from the outside world; tests can substitute pieces. */
export interface AppDeps {
  env: Env;
  db: Database;
  redis: Redis;
  queues: Queues;
  /** Raw SQL ping for the health check. */
  pingDb: () => Promise<void>;
}
