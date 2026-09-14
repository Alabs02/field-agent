import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import underPressure from "@fastify/under-pressure";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import Fastify, { type FastifyInstance } from "fastify";
import { jsonSchemaTransform, serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import type { AppDeps } from "./deps.js";
import { makeGuard, type SessionResolver } from "./plugins/auth-guard.js";
import { registerErrorHandling } from "./plugins/error-handler.js";
import { brandRoutes } from "./routes/brands.js";
import { healthRoutes } from "./routes/health.js";
import { promotionRoutes } from "./routes/promotions.js";
import { runRoutes } from "./routes/runs.js";
import { scrapeRoutes } from "./routes/scrape.js";
import { verifyRoutes } from "./routes/verify.js";

export interface BuildAppOptions {
  deps: AppDeps;
  /** Resolves the signed-in user; the auth commit provides the real one. */
  resolveSession?: SessionResolver;
  logger?: boolean | object;
}

export async function buildApp({ deps, resolveSession, logger }: BuildAppOptions): Promise<FastifyInstance> {
  const { env } = deps;
  const raw = Fastify({
    logger: logger ?? { level: env.LOG_LEVEL },
    trustProxy: true,
    requestIdHeader: "x-request-id",
    disableRequestLogging: env.NODE_ENV === "test",
  });
  const app = raw.withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandling(app);

  app.decorateRequest("user", null);

  await app.register(sensible);
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.WEB_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
  });
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: "1 minute",
    redis: deps.redis,
    nameSpace: "fa:ratelimit:",
    allowList: env.NODE_ENV === "test" ? () => true : undefined,
  });
  await app.register(underPressure, {
    maxEventLoopDelay: 1000,
    maxEventLoopUtilization: 0.98,
    message: "service under pressure",
    retryAfter: 5,
    // Health is exposed via our own route so the payload matches HealthSchema.
    exposeStatusRoute: false,
  });

  await app.register(swagger, {
    openapi: {
      info: { title: "field-agent API", version: env.APP_VERSION, description: "Promotions aggregator for one shopping-center portal." },
      tags: [
        { name: "promotions" },
        { name: "brands" },
        { name: "jobs" },
        { name: "ops" },
      ],
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  const guard = makeGuard({ required: env.AUTH_REQUIRED, resolve: resolveSession ?? (async () => null) });

  // Bull Board (queues dashboard). Guarded like an admin route.
  const boardAdapter = new FastifyAdapter();
  createBullBoard({
    queues: [new BullMQAdapter(deps.queues.scrape), new BullMQAdapter(deps.queues.verify)],
    serverAdapter: boardAdapter,
  });
  boardAdapter.setBasePath("/admin/queues");
  await raw.register(async (scope) => {
    scope.addHook("preHandler", guard("admin"));
    await scope.register(boardAdapter.registerPlugin(), { prefix: "/admin/queues" });
  });

  await app.register(healthRoutes(deps));
  await app.register(promotionRoutes(deps, guard));
  await app.register(brandRoutes(deps, guard));
  await app.register(scrapeRoutes(deps, guard));
  await app.register(verifyRoutes(deps, guard));
  await app.register(runRoutes(deps, guard));

  return app;
}
