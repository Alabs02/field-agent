import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { runsRepo, scrapeRunToApi, verificationRunToApi } from "@field-agent/db";
import { ApiErrorSchema, IdParamsSchema, paginated, paginate, RunListItemSchema, RunsQuerySchema, type RunListItem } from "@field-agent/shared";
import type { AppDeps } from "../deps.js";
import type { Guard } from "../plugins/auth-guard.js";
import { notFound } from "../plugins/error-handler.js";
import { effectiveStatus, queueStateOf } from "../plugins/job-state.js";

export const runRoutes =
  (deps: AppDeps, guard: Guard): FastifyPluginAsyncZod =>
  async (app) => {
    const portalId = deps.env.PORTAL_ID;

    /**
     * Lists and detail pages must agree with the run detail endpoints: a row that still says
     * "running" with a stale heartbeat is reported as stalled here too, so an operator never
     * sees "Running" in one place and "Stalled" in another. Only active rows cost a queue lookup.
     */
    const withEffectiveStatus = async (run: RunListItem): Promise<RunListItem> => {
      if (run.status !== "running" && run.status !== "queued") return run;
      const queue = run.type === "scrape" ? deps.queues.scrape : deps.queues.verify;
      const status = effectiveStatus(run.status, run.heartbeatAt, await queueStateOf(queue, run.id));
      return status === run.status ? run : { ...run, status };
    };

    app.get(
      "/runs",
      { preHandler: guard("read"), schema: { tags: ["jobs"], querystring: RunsQuerySchema, response: { 200: paginated(RunListItemSchema) } } },
      async (req) => {
        const { items, total } = await runsRepo.listRuns(deps.db, portalId, req.query);
        return paginate(await Promise.all(items.map(withEffectiveStatus)), total, req.query.page, req.query.pageSize);
      },
    );

    app.get(
      "/runs/:id",
      { preHandler: guard("read"), schema: { tags: ["jobs"], params: IdParamsSchema, response: { 200: RunListItemSchema, 404: ApiErrorSchema } } },
      async (req) => {
        const scrape = await runsRepo.getScrapeRun(deps.db, req.params.id);
        if (scrape) return withEffectiveStatus(scrapeRunToApi(scrape));
        const verify = await runsRepo.getVerificationRun(deps.db, req.params.id);
        if (verify) return withEffectiveStatus(verificationRunToApi(verify));
        throw notFound("run");
      },
    );
  };
