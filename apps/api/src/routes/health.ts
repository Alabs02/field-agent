import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { HealthSchema } from "@field-agent/shared";
import type { AppDeps } from "../deps.js";

const started = Date.now();

export const healthRoutes =
  (deps: AppDeps): FastifyPluginAsyncZod =>
  async (app) => {
    // Only 200 is schema-bound: under-pressure answers 503 with its own body when the event loop is saturated.
    app.get("/health", { schema: { tags: ["ops"], response: { 200: HealthSchema } } }, async (_req, reply) => {
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
      // 503 is deliberately outside the typed response map (see above); the body shape is the same.
      return reply.status((ok ? 200 : 503) as 200).send(body);
    });
  };
