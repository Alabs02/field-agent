export const QUEUE_PREFIX = "fa";

export const QUEUE = {
  scrape: "scrape",
  verify: "verify",
} as const;
export type QueueName = (typeof QUEUE)[keyof typeof QUEUE];

export const JOB = {
  scrapePortal: "scrape.portal",
  verifyPortal: "verify.portal",
} as const;
export type JobName = (typeof JOB)[keyof typeof JOB];
