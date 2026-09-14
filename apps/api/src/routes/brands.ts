import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { brandsRepo, brandToApi, promotionsRepo } from "@field-agent/db";
import {
  ApiErrorSchema,
  BrandDetailSchema,
  BrandRefParamsSchema,
  BrandsQuerySchema,
  BrandWithCountSchema,
  paginated,
  paginate,
} from "@field-agent/shared";
import type { AppDeps } from "../deps.js";
import type { Guard } from "../plugins/auth-guard.js";
import { notFound } from "../plugins/error-handler.js";

export const brandRoutes =
  (deps: AppDeps, guard: Guard): FastifyPluginAsyncZod =>
  async (app) => {
    const portalId = deps.env.PORTAL_ID;

    app.get(
      "/brands",
      {
        preHandler: guard("read"),
        schema: { tags: ["brands"], querystring: BrandsQuerySchema, response: { 200: paginated(BrandWithCountSchema), 400: ApiErrorSchema } },
      },
      async (req) => {
        const { items, total } = await brandsRepo.listBrands(deps.db, portalId, req.query);
        return paginate(items, total, req.query.page, req.query.pageSize);
      },
    );

    app.get(
      "/brands/:ref",
      {
        preHandler: guard("read"),
        schema: { tags: ["brands"], params: BrandRefParamsSchema, response: { 200: BrandDetailSchema, 404: ApiErrorSchema } },
      },
      async (req) => {
        const brand = await brandsRepo.findBrandByRef(deps.db, portalId, req.params.ref);
        if (!brand) throw notFound("brand");
        const promotions = await promotionsRepo.listPromotionsForBrand(deps.db, brand.id);
        return { ...brandToApi(brand), promotionCount: promotions.length, promotions };
      },
    );
  };
