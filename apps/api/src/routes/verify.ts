import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { findingsRepo, runsRepo, verificationRunToApi } from "@field-agent/db";
import {
  ApiErrorSchema,
  EnqueueResponseSchema,
  JOB,
  RunIdParamsSchema,
  VerificationReportSchema,
  VerifyRequestSchema,
  type VerificationReport,
  type VerificationResult,
  type VerificationRun,
} from "@field-agent/shared";
import type { AppDeps } from "../deps.js";
import type { Guard } from "../plugins/auth-guard.js";
import { HttpError, notFound } from "../plugins/error-handler.js";

export function resultOf(run: VerificationRun): VerificationResult {
  if (run.status === "queued" || run.status === "running" || run.status === "stalled") return "in_progress";
  if (run.status === "failed" || run.status === "cancelled") return "failed";
  const c = run.counts;
  if (c.checked === 0) return "nothing_to_verify";
  return c.changed + c.missingAtSource + c.unverifiable === 0 ? "clean" : "discrepancies";
}

export const verifyRoutes =
  (deps: AppDeps, guard: Guard): FastifyPluginAsyncZod =>
  async (app) => {
    const portalId = deps.env.PORTAL_ID;

    app.post(
      "/verify",
      {
        preHandler: guard("verify"),
        config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
        schema: {
          tags: ["jobs"],
          body: VerifyRequestSchema.nullable().optional(),
          response: { 200: EnqueueResponseSchema, 202: EnqueueResponseSchema, 503: ApiErrorSchema },
        },
      },
      async (req, reply) => {
        const body = req.body ?? {};
        const sampleRate = body.sampleRate ?? deps.env.VERIFY_SAMPLE_RATE;
        const active = await runsRepo.findActiveVerificationRun(deps.db, portalId);
        if (active && !body.promotionIds) {
          return reply.status(200).send({ jobId: active.id, runId: active.id, reused: true, statusUrl: `/verify/${active.id}` });
        }
        const run = await runsRepo.createVerificationRun(deps.db, {
          portalId,
          triggeredBy: req.user?.email ?? null,
          sampleRate,
          promotionIds: body.promotionIds,
        });
        try {
          await deps.queues.verify.add(
            JOB.verifyPortal,
            { portalId, runId: run.id, requestedBy: req.user?.email ?? null, sampleRate, promotionIds: body.promotionIds },
            { jobId: run.id },
          );
        } catch (err) {
          await runsRepo.updateVerificationRun(deps.db, run.id, { status: "failed", error: "queue unavailable", finishedAt: new Date() });
          req.log.error({ err }, "could not enqueue verification");
          throw new HttpError(503, "QUEUE_UNAVAILABLE", "the job queue is unavailable; try again shortly");
        }
        return reply.status(202).send({ jobId: run.id, runId: run.id, reused: false, statusUrl: `/verify/${run.id}` });
      },
    );

    app.get(
      "/verify/:runId",
      {
        preHandler: guard("read"),
        schema: { tags: ["jobs"], params: RunIdParamsSchema, response: { 200: VerificationReportSchema, 404: ApiErrorSchema } },
      },
      async (req) => {
        const row = await runsRepo.getVerificationRun(deps.db, req.params.runId);
        if (!row) throw notFound("verification run");
        const run = verificationRunToApi(row);
        const findings = await findingsRepo.listFindingsForRun(deps.db, run.id);
        const result = resultOf(run);
        const report: VerificationReport = {
          runId: run.id,
          status: run.status,
          result,
          clean: result === "clean",
          summary: { ...run.counts, requestsMade: run.requestsMade, sampleRate: run.sampleRate },
          findings,
          error: run.error,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          generatedAt: new Date().toISOString(),
        };
        return report;
      },
    );
  };
