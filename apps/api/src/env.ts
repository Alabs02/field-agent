import { z } from "zod";

const bool = z.stringbool();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().min(1),
  // Empty in .env.example; an empty string must not win over DATABASE_URL.
  DATABASE_URL_UNPOOLED: z.string().optional().transform((v) => v || undefined),
  REDIS_URL: z.string().min(1),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default("0.0.0.0"),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  AUTH_REQUIRED: bool.default(false),
  BETTER_AUTH_SECRET: z.string().min(16).default("dev-only-secret-change-me-please-32chars"),
  BETTER_AUTH_URL: z.string().default("http://localhost:4000"),
  SEED_DEMO_PASSWORD: z.string().min(8).default("FieldAgent-Demo-2026!"),
  SCRAPE_ON_BOOT: bool.default(true),
  PORTAL_ID: z.literal("briargate").default("briargate"),
  VERIFY_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.2),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  APP_VERSION: z.string().default("0.1.0"),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`invalid api environment: ${issues}`);
  }
  return parsed.data;
}
