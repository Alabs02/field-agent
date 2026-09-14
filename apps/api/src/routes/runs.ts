import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { runsRepo, scrapeRunToApi, verificationRunToApi } from "@field-agent/db";
import { ApiErrorSchema, IdParamsSchema, paginated, paginate, RunListItemSchema, RunsQuerySchema } from "@field-agent/shared";
import type { AppDeps } from "../deps.js";
import type { Guard } from "../plugins/auth-guard.js";
import { notFound } from "../plugins/error-handler.js";

export const runRoutes =
  (deps: AppDeps, guard: Guard): FastifyPluginAsyncZod =>
  async (app) => {
    const portalId = deps.env.PORTAL_ID;

    app.get(
      "/runs",
      { preHandler: guard("read"), schema: { tags: ["jobs"], querystring: RunsQuerySchema, response: { 200: paginated(RunListItemSchema) } } },
      async (req) => {
        const { items, total } = await runsRepo.listRuns(deps.db, portalId, req.query);
        return paginate(items, total, req.query.page, req.query.pageSize);
      },
    );

    app.get(
      "/runs/:id",
      { preHandler: guard("read"), schema: { tags: ["jobs"], params: IdParamsSchema, response: { 200: RunListItemSchema, 404: ApiErrorSchema } } },
      async (req) => {
        const scrape = await runsRepo.getScrapeRun(deps.db, req.params.id);
        if (scrape) return scrapeRunToApi(scrape);
        const verify = await runsRepo.getVerificationRun(deps.db, req.params.id);
        if (verify) return verificationRunToApi(verify);
        throw notFound("run");
      },
    );
  };
