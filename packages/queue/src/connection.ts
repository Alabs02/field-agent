import { Redis } from "ioredis";

/** BullMQ needs maxRetriesPerRequest: null; blocking commands must not time out. */
export function createRedis(url: string, name = "field-agent"): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectionName: name,
    lazyConnect: false,
  });
}
