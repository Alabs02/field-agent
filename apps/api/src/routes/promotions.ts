import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { promotionsRepo, findingsRepo } from "@field-agent/db";
import {
  ApiErrorSchema,
  FindingSchema,
  IdParamsSchema,
  paginated,
  paginate,
  PromotionDetailSchema,
  PromotionSchema,
  PromotionsQuerySchema,
  BRIARGATE_PORTAL,
} from "@field-agent/shared";
import { z } from "zod";
import type { AppDeps } from "../deps.js";
import { notFound } from "../plugins/error-handler.js";
import type { Guard } from "../plugins/auth-guard.js";

export const promotionRoutes =
  (deps: AppDeps, guard: Guard): FastifyPluginAsyncZod =>
  async (app) => {
    const portalId = deps.env.PORTAL_ID;
    const tz = BRIARGATE_PORTAL.timezone;

    app.get(
      "/promotions",
      {
        preHandler: guard("read"),
        schema: {
          tags: ["promotions"],
          querystring: PromotionsQuerySchema,
          response: { 200: paginated(PromotionSchema), 400: ApiErrorSchema },
        },
      },
      async (req) => {
        const { items, total } = await promotionsRepo.listPromotions(deps.db, portalId, req.query, tz);
        return paginate(items, total, req.query.page, req.query.pageSize);
      },
    );

    app.get(
      "/promotions/:id",
      {
        preHandler: guard("read"),
        schema: { tags: ["promotions"], params: IdParamsSchema, response: { 200: PromotionDetailSchema, 404: ApiErrorSchema } },
      },
      async (req) => {
        const promo = await promotionsRepo.getPromotionDetail(deps.db, req.params.id);
        if (!promo) throw notFound("promotion");
        return promo;
      },
    );

    app.get(
      "/promotions/:id/findings",
      {
        preHandler: guard("read"),
        schema: { tags: ["promotions"], params: IdParamsSchema, response: { 200: z.array(FindingSchema), 404: ApiErrorSchema } },
      },
      async (req) => {
        const promo = await promotionsRepo.getPromotionDetail(deps.db, req.params.id);
        if (!promo) throw notFound("promotion");
        return findingsRepo.listFindingsForPromotion(deps.db, req.params.id);
      },
    );
  };
