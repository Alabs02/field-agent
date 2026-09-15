import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { operationsRepo, overview, findingsRepo } from "@field-agent/db";
import { AuditEventSchema, AuditQuerySchema, NotificationSchema, ScheduleInputSchema, ScheduleSchema, IdParamsSchema,
  OperationPolicySchema, OverviewSchema, PeriodQuerySchema, ExportRequestSchema, FindingsQuerySchema, FindingSchema, can, paginated, paginate } from "@field-agent/shared";
import type { AppDeps } from "../deps.js";
import type { Guard } from "../plugins/auth-guard.js";
import { retryRun, cancelRun } from "../services/launch.js";
import { startCycle, advanceCycles } from "../services/scheduler.js";
import { generateExport } from "../services/export.js";

export const operationRoutes = (deps: AppDeps, guard: Guard): FastifyPluginAsyncZod => async app => {
  const portalId = deps.env.PORTAL_ID;
  app.get("/findings", { preHandler: guard("read"), schema: { querystring: FindingsQuerySchema, response: { 200: paginated(FindingSchema) } } }, async req => {
    const result = await findingsRepo.listFindings(deps.db, portalId, req.query);
    return paginate(result.items, result.total, req.query.page, req.query.pageSize);
  });
  app.post("/exports", { preHandler: guard("read"), schema: { body: ExportRequestSchema } }, async (req,reply) => {
    const output = await generateExport(deps, req.body, req.user?.email ?? "local operator");
    return reply.type(output.contentType).header("content-disposition", `attachment; filename="${output.filename}"`).send(output.body);
  });
  app.get("/overview", { preHandler: guard("read"), schema: { querystring: PeriodQuerySchema, response: { 200: OverviewSchema } } }, async req => {
    const to = req.query.to ? new Date(req.query.to) : new Date();
    const days = req.query.period === "24h" ? 1 : req.query.period === "30d" ? 30 : 7;
    const from = req.query.from ? new Date(req.query.from) : new Date(to.getTime() - days * 86_400_000);
    return overview(deps.db, portalId, from, to);
  });
  app.get("/operations/policy", { preHandler: guard("read"), schema: { response: { 200: OperationPolicySchema } } }, async req => ({
    authRequired: deps.env.AUTH_REQUIRED, canRun: !deps.env.AUTH_REQUIRED || can(req.user?.role, "scrape"),
    canAdvanced: !deps.env.AUTH_REQUIRED || can(req.user?.role, "advanced"), canSchedule: !deps.env.AUTH_REQUIRED || can(req.user?.role, "schedule"),
    minDelayMs: Number(process.env.SCRAPE_MIN_DELAY_MS ?? 2000), sampleRate: deps.env.VERIFY_SAMPLE_RATE, reviewerCooldownSeconds: req.user?.role === "reviewer" ? 300 : 0,
  }));
  app.get("/audit", { preHandler: guard("read"), schema: { querystring: AuditQuerySchema, response: { 200: paginated(AuditEventSchema) } } }, async req => {
    const result = await operationsRepo.listAudit(deps.db, portalId, req.query);
    return paginate(result.items, result.total, req.query.page, req.query.pageSize);
  });
  app.get("/notifications", { preHandler: guard("read"), schema: { querystring: AuditQuerySchema,
    response: { 200: paginated(NotificationSchema).extend({ unread: z.number(), localMode: z.boolean() }) } } }, async req => {
    const result = await operationsRepo.listAudit(deps.db, portalId, req.query, true, req.user?.id);
    return { ...paginate(result.items, result.total, req.query.page, req.query.pageSize),
      unread: await operationsRepo.unreadCount(deps.db, portalId, req.user?.id ?? ""), localMode: !deps.env.AUTH_REQUIRED };
  });
  app.post("/notifications/read", { preHandler: guard("read"), schema: { body: z.object({ id: z.uuid().optional() }) } }, async req => {
    if (req.user) await operationsRepo.markRead(deps.db, portalId, req.user.id, req.body.id);
    return { ok: true, localMode: !deps.env.AUTH_REQUIRED };
  });
  app.get("/schedules", { preHandler: guard("read"), schema: { response: { 200: ScheduleSchema } } }, async () => operationsRepo.scheduleToApi(await operationsRepo.getSchedule(deps.db, portalId)));
  app.post("/schedules", { preHandler: guard("schedule"), schema: { body: ScheduleInputSchema, response: { 200: ScheduleSchema } } }, async req => {
    await operationsRepo.getSchedule(deps.db, portalId);
    return operationsRepo.updateSchedule(deps.db, portalId, req.body, req.user?.email ?? "local operator");
  });
  app.post("/schedules/run-now", { preHandler: guard("schedule") }, async req => {
    const cycleId = await startCycle(deps, req.user, true);
    await advanceCycles(deps);
    return { cycleId };
  });
  app.post("/runs/:id/retry", { preHandler: guard("scrape"), schema: { params: IdParamsSchema } }, async req => retryRun(deps, req.params.id, req.user));
  app.post("/runs/:id/cancel", { preHandler: guard("scrape"), schema: { params: IdParamsSchema } }, async req => cancelRun(deps, req.params.id, req.user));
};
