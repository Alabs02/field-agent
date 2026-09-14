import { Queue, QueueEvents } from "bullmq";
import type { Redis } from "ioredis";
import {
  QUEUE,
  QUEUE_PREFIX,
  type ScrapeJobPayload,
  type VerifyJobPayload,
} from "@field-agent/shared";
import { DEFAULT_JOB_OPTIONS } from "./defaults.js";

export interface Queues {
  scrape: Queue<ScrapeJobPayload>;
  verify: Queue<VerifyJobPayload>;
  close(): Promise<void>;
}

export function createQueues(connection: Redis): Queues {
  const scrape = new Queue<ScrapeJobPayload>(QUEUE.scrape, {
    connection,
    prefix: QUEUE_PREFIX,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
  const verify = new Queue<VerifyJobPayload>(QUEUE.verify, {
    connection,
    prefix: QUEUE_PREFIX,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
  return {
    scrape,
    verify,
    close: async () => {
      await Promise.all([scrape.close(), verify.close()]);
    },
  };
}

export function createQueueEvents(connection: Redis, name: (typeof QUEUE)[keyof typeof QUEUE]): QueueEvents {
  return new QueueEvents(name, { connection, prefix: QUEUE_PREFIX });
}
