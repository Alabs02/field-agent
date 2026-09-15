import { randomUUID } from "node:crypto";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { tables } from "@field-agent/db";
import { ApiErrorSchema, IsoDateTime, RoleSchema, SessionUserSchema } from "@field-agent/shared";
import type { AppDeps } from "../deps.js";
import type { Guard } from "../plugins/auth-guard.js";
import { HttpError, notFound } from "../plugins/error-handler.js";

const AdminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: RoleSchema.nullable(),
  createdAt: IsoDateTime,
});

export const adminRoutes =
  (deps: AppDeps, guard: Guard): FastifyPluginAsyncZod =>
  async (app) => {
    app.get(
      "/me",
      { schema: { tags: ["auth"], response: { 200: SessionUserSchema.nullable() } } },
      async (req) => {
        // The guard is not applied here on purpose: "who am I" must answer null when signed out.
        if (!deps.env.AUTH_REQUIRED) return null;
        return req.user ?? null;
      },
    );

    app.get(
      "/admin/users",
      { preHandler: guard("admin"), schema: { tags: ["admin"], response: { 200: z.array(AdminUserSchema), 401: ApiErrorSchema, 403: ApiErrorSchema } } },
      async () => {
        const rows = await deps.db.query.user.findMany({ orderBy: [desc(tables.user.createdAt)], limit: 200 });
        return rows.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: RoleSchema.safeParse(u.role).success ? (u.role as z.infer<typeof RoleSchema>) : null,
          createdAt: u.createdAt.toISOString(),
        }));
      },
    );

    app.post(
      "/admin/users/:id/role",
      {
        preHandler: guard("admin"),
        schema: {
          tags: ["admin"],
          params: z.object({ id: z.string() }),
          body: z.object({ role: RoleSchema }),
          response: { 200: AdminUserSchema, 404: ApiErrorSchema, 409: ApiErrorSchema },
        },
      },
      async (req) => {
        if (req.user?.id === req.params.id && req.body.role !== "super_admin") {
          throw new HttpError(409, "CONFLICT", "you cannot remove your own super_admin role");
        }
        // The role change and its audit event commit together, or not at all.
        const row = await deps.db.transaction(async (tx) => {
          const [before] = await tx.select({ role: tables.user.role, email: tables.user.email }).from(tables.user).where(eq(tables.user.id, req.params.id)).for("update");
          if (!before) return undefined;
          const [updated] = await tx.update(tables.user).set({ role: req.body.role }).where(eq(tables.user.id, req.params.id)).returning();
          if (updated && before.role !== req.body.role) {
            await tx.insert(tables.auditEvents).values({
              portalId: deps.env.PORTAL_ID,
              eventKey: randomUUID(),
              action: "user.role_changed",
              actor: req.user?.email ?? "local operator",
              entityType: "user",
              entityId: updated.id,
              label: updated.email,
              before: { role: before.role },
              after: { role: req.body.role },
              message: `Role changed for ${updated.email}: ${before.role ?? "none"} to ${req.body.role}`,
              href: "/app/admin",
              severity: "info",
            });
          }
          return updated;
        });
        if (!row) throw notFound("user");
        return { id: row.id, email: row.email, name: row.name, role: req.body.role, createdAt: row.createdAt.toISOString() };
      },
    );
  };
