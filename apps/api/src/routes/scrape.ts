import { launch } from "../services/launch.js";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { runsRepo, scrapeRunToApi } from "@field-agent/db";
import {
  ApiErrorSchema,
  EnqueueResponseSchema,
  JobIdParamsSchema,
  ScrapeJobStatusSchema,
  ScrapeOptionsSchema,
  ScrapeRequestSchema,
} from "@field-agent/shared";
import type { AppDeps } from "../deps.js";
import type { Guard } from "../plugins/auth-guard.js";
import { notFound } from "../plugins/error-handler.js";
import { effectiveStatus, queueStateOf } from "../plugins/job-state.js";

export const scrapeRoutes =
  (deps: AppDeps, guard: Guard): FastifyPluginAsyncZod =>
  async (app) => {

    app.post(
      "/scrape",
      {
        preHandler: guard("scrape"),
        config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
        schema: {
          tags: ["jobs"],
          body: ScrapeRequestSchema.nullable().optional(),
          response: { 200: EnqueueResponseSchema, 202: EnqueueResponseSchema, 503: ApiErrorSchema },
        },
      },
      async (req, reply) => {
        const options = ScrapeOptionsSchema.parse(req.body ?? {});
        const result = await launch(deps, { type: "scrape", user: req.user, options });
        return reply.status(result.reused ? 200 : 202).send(result);
      },
    );

    app.get(
      "/scrape/:jobId",
      {
        preHandler: guard("read"),
        schema: { tags: ["jobs"], params: JobIdParamsSchema, response: { 200: ScrapeJobStatusSchema, 404: ApiErrorSchema } },
      },
      async (req) => {
        const row = await runsRepo.getScrapeRun(deps.db, req.params.jobId);
        if (!row) throw notFound("scrape job");
        const api = scrapeRunToApi(row);
        const queueState = await queueStateOf(deps.queues.scrape, row.id);
        return { ...api, queueState, effectiveStatus: effectiveStatus(api.status, api.heartbeatAt, queueState) };
      },
    );
  };
