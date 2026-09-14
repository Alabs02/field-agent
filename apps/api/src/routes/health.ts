import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { HealthSchema } from "@field-agent/shared";
import type { AppDeps } from "../deps.js";

const started = Date.now();

export const healthRoutes =
  (deps: AppDeps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get("/health", { schema: { tags: ["ops"], response: { 200: HealthSchema, 503: HealthSchema } } }, async (_req, reply) => {
      const [db, redis] = await Promise.all([
        deps.pingDb().then(() => true, () => false),
        deps.redis.ping().then((r) => r === "PONG", () => false),
      ]);
      const ok = db && redis;
      const body = {
        status: ok ? ("ok" as const) : ("degraded" as const),
        checks: { db, redis },
        version: deps.env.APP_VERSION,
        uptimeSec: Math.round((Date.now() - started) / 1000),
        authRequired: deps.env.AUTH_REQUIRED,
      };
      return reply.status(ok ? 200 : 503).send(body);
    });
  };
