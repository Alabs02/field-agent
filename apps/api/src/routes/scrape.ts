import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { runsRepo, scrapeRunToApi } from "@field-agent/db";
import {
  ApiErrorSchema,
  EnqueueResponseSchema,
  JOB,
  JobIdParamsSchema,
  ScrapeJobStatusSchema,
  ScrapeOptionsSchema,
  ScrapeRequestSchema,
} from "@field-agent/shared";
import type { AppDeps } from "../deps.js";
import type { Guard } from "../plugins/auth-guard.js";
import { HttpError, notFound } from "../plugins/error-handler.js";
import { effectiveStatus, queueStateOf } from "../plugins/job-state.js";

export const scrapeRoutes =
  (deps: AppDeps, guard: Guard): FastifyPluginAsyncZod =>
  async (app) => {
    const portalId = deps.env.PORTAL_ID;

    app.post(
      "/scrape",
      {
        preHandler: guard("scrape"),
        config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
        schema: {
          tags: ["jobs"],
          body: ScrapeRequestSchema.optional(),
          response: { 200: EnqueueResponseSchema, 202: EnqueueResponseSchema, 503: ApiErrorSchema },
        },
      },
      async (req, reply) => {
        const options = ScrapeOptionsSchema.parse(req.body ?? {});
        const active = await runsRepo.findActiveScrapeRun(deps.db, portalId);
        if (active && !options.force) {
          return reply.status(200).send({ jobId: active.id, runId: active.id, reused: true, statusUrl: `/scrape/${active.id}` });
        }
        const run = await runsRepo.createScrapeRun(deps.db, { portalId, triggeredBy: req.user?.email ?? null, options });
        try {
          await deps.queues.scrape.add(JOB.scrapePortal, { portalId, runId: run.id, requestedBy: req.user?.email ?? null, options }, { jobId: run.id });
        } catch (err) {
          await runsRepo.updateScrapeRun(deps.db, run.id, { status: "failed", error: "queue unavailable", finishedAt: new Date() });
          req.log.error({ err }, "could not enqueue scrape");
          throw new HttpError(503, "QUEUE_UNAVAILABLE", "the job queue is unavailable; try again shortly");
        }
        return reply.status(202).send({ jobId: run.id, runId: run.id, reused: false, statusUrl: `/scrape/${run.id}` });
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
