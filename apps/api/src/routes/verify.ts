import { launch } from "../services/launch.js";
import { effectiveStatus, queueStateOf } from "../plugins/job-state.js";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { findingsRepo, runsRepo, verificationRunToApi } from "@field-agent/db";
import {
  ApiErrorSchema,
  EnqueueResponseSchema,
  RunIdParamsSchema,
  VerificationReportSchema,
  VerifyRequestSchema,
  type VerificationReport,
  type VerificationResult,
  type VerificationRun,
} from "@field-agent/shared";
import type { AppDeps } from "../deps.js";
import type { Guard } from "../plugins/auth-guard.js";
import { notFound } from "../plugins/error-handler.js";

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
        const result = await launch(deps, { type: "verify", user: req.user, sampleRate, promotionIds: body.promotionIds });
        return reply.status(result.reused ? 200 : 202).send(result);
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
        run.status = effectiveStatus(run.status, run.heartbeatAt, await queueStateOf(deps.queues.verify, row.id));
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
