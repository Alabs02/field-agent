import { z } from "zod";

const bool = z.stringbool();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  PORTAL_ID: z.literal("briargate").default("briargate"),
  SCRAPE_ENGINE: z.enum(["http", "playwright"]).default("http"),
  SCRAPE_USER_AGENT: z
    .string()
    .default("FieldAgentBot/0.1 (+https://github.com/Alabs02/field-agent; alabson.inc@gmail.com)"),
  SCRAPE_MIN_DELAY_MS: z.coerce.number().int().min(0).default(2000),
  SCRAPE_RESPECT_CRAWL_DELAY: bool.default(false),
  SCRAPE_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
  SCRAPE_JOB_TIMEOUT_MS: z.coerce.number().int().positive().default(5_400_000),
  VERIFY_JOB_TIMEOUT_MS: z.coerce.number().int().positive().default(1_800_000),
  VERIFY_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.2),
  BRAND_REFRESH_HOURS: z.coerce.number().positive().default(24),
  SNAPSHOT_MODE: z.enum(["first", "changed", "all", "off"]).default("changed"),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(1),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`invalid worker environment: ${issues}`);
  }
  return parsed.data;
}
