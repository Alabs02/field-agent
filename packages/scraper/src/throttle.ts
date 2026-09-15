import type { Redis } from "ioredis";
import { AbortedError } from "./errors.js";
import type { Throttle } from "./types.js";

const MAX_SLEEP_MS = 5_000;

export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AbortedError(signal.reason));
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(t);
      reject(new AbortedError(signal?.reason));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Per-host spacing lock: at most one request per `minDelayMs` per host, across
 * every worker process that shares the Redis. Scrape and verify use the same
 * key, so they draw from the same politeness budget.
 *
 * Returns 0 when the slot is taken now, else the ms to wait before retrying.
 */
const ACQUIRE_LUA = `
local nextAt = tonumber(redis.call('GET', KEYS[1]) or '0')
local now = tonumber(ARGV[1])
local delay = tonumber(ARGV[2])
if now >= nextAt then
  redis.call('SET', KEYS[1], now + delay, 'PX', delay * 2 + 1000)
  return 0
end
return nextAt - now
`;

export class RedisThrottle implements Throttle {
  constructor(
    private readonly redis: Redis,
    private readonly minDelayMs: number,
    private readonly keyPrefix = "fa:throttle",
  ) {}

  async lease(host: string, signal?: AbortSignal): Promise<() => Promise<void>> {
    const key = `${this.keyPrefix}:inflight:${host}`;
    const token = crypto.randomUUID();
    for (;;) {
      if (signal?.aborted) throw new AbortedError(signal.reason);
      if (await this.redis.set(key, token, "PX", 120_000, "NX")) break;
      await abortableSleep(250, signal);
    }
    const renewal = setInterval(() => { void this.redis.eval("if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('PEXPIRE',KEYS[1],120000) end return 0", 1, key, token).catch(() => {}); }, 30_000);
    renewal.unref();
    return async () => {
      clearInterval(renewal);
      await this.redis.eval("if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0", 1, key, token);
    };
  }

  async cooldown(host: string, until: number): Promise<void> {
    await this.redis.eval(`local current=tonumber(redis.call('GET',KEYS[1]) or '0')
      local target=math.max(current,tonumber(ARGV[1]))
      redis.call('SET',KEYS[1],target,'PX',math.max(1,target-tonumber(ARGV[2])+1000)) return target`,
      1, `${this.keyPrefix}:${host}`, until, Date.now());
  }

  async acquire(host: string, signal?: AbortSignal): Promise<void> {
    const key = `${this.keyPrefix}:${host}`;
    for (;;) {
      if (signal?.aborted) throw new AbortedError(signal.reason);
      const jitter = Math.floor(Math.random() * Math.min(500, this.minDelayMs * 0.1));
      const wait = Number(await this.redis.eval(ACQUIRE_LUA, 1, key, Date.now(), this.minDelayMs + jitter));
      if (wait <= 0) return;
      await abortableSleep(Math.min(wait, MAX_SLEEP_MS), signal);
    }
  }
}

/** In-process equivalent for tests and single-process runs. */
export class MemoryThrottle implements Throttle {
  private nextAt = new Map<string, number>();

  constructor(
    private readonly minDelayMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  async acquire(host: string, signal?: AbortSignal): Promise<void> {
    for (;;) {
      if (signal?.aborted) throw new AbortedError(signal.reason);
      const t = this.now();
      const next = this.nextAt.get(host) ?? 0;
      if (t >= next) {
        this.nextAt.set(host, t + this.minDelayMs);
        return;
      }
      await abortableSleep(Math.min(next - t, MAX_SLEEP_MS), signal);
    }
  }
}

export const noThrottle: Throttle = { acquire: async () => {} };
