import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { tables, type Database } from "@field-agent/db";
import { ROLES, RoleSchema, type Role, type SessionUser } from "@field-agent/shared";
import type { Env } from "./env.js";

/**
 * Better Auth lives only here: one auth server, one DB writer. The web app
 * talks to it through /backend/api/auth/* so cookies stay first-party.
 */
export function createAuth(env: Env, db: Database) {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    trustedOrigins: env.WEB_ORIGIN.split(",").map((o) => o.trim()),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: tables.user, session: tables.session, account: tables.account, verification: tables.verification },
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    // Role is a plain user field (not the admin plugin): our RBAC lives in the shared PERMISSIONS map.
    user: { additionalFields: { role: { type: "string", required: false, defaultValue: "reviewer", input: false } } },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    advanced: { useSecureCookies: env.NODE_ENV === "production" && env.BETTER_AUTH_URL.startsWith("https") },
  });
}

export type Auth = ReturnType<typeof createAuth>;

function toWebHeaders(request: FastifyRequest): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(request.headers)) {
    if (Array.isArray(v)) v.forEach((x) => h.append(k, x));
    else if (typeof v === "string") h.append(k, v);
  }
  return h;
}

/** Mount the Better Auth handler on GET/POST /api/auth/*. */
export function mountAuth(app: FastifyInstance, auth: Auth): void {
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    handler: async (request, reply) => {
      const url = new URL(request.url, `${request.protocol}://${request.headers.host ?? "localhost"}`);
      const headers = toWebHeaders(request);
      const body = request.method === "POST" && request.body != null ? JSON.stringify(request.body) : undefined;
      if (body) headers.set("content-type", "application/json");
      const res = await auth.handler(new Request(url.toString(), { method: request.method, headers, body }));
      reply.status(res.status);
      res.headers.forEach((value, key) => {
        if (key.toLowerCase() !== "set-cookie") reply.header(key, value);
      });
      const cookies = res.headers.getSetCookie();
      if (cookies.length) reply.header("set-cookie", cookies);
      return reply.send(res.body ? await res.text() : null);
    },
  });
}

/** Resolve the signed-in user for the capability guard. */
export function makeSessionResolver(auth: Auth) {
  return async (request: FastifyRequest): Promise<SessionUser | null> => {
    const result = await auth.api.getSession({ headers: toWebHeaders(request) }).catch(() => null);
    if (!result?.user) return null;
    const role = RoleSchema.safeParse((result.user as { role?: string | null }).role);
    return {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: role.success ? role.data : "reviewer",
    };
  };
}

export const DEMO_USERS: Array<{ email: string; name: string; role: Role }> = [
  { email: "super.admin@fieldagent.demo", name: "Demo Super Admin", role: "super_admin" },
  { email: "operations@fieldagent.demo", name: "Demo Operations", role: "operations" },
  { email: "data.engineer@fieldagent.demo", name: "Demo Data Engineer", role: "data_engineer" },
  { email: "account.manager@fieldagent.demo", name: "Demo Account Manager", role: "account_manager" },
  { email: "reviewer@fieldagent.demo", name: "Demo Reviewer", role: "reviewer" },
];

/** Idempotent: creates the five persona accounts (correctly hashed) and sets their roles. */
export async function seedDemoUsers(auth: Auth, db: Database, password: string): Promise<{ created: number; existing: number }> {
  let created = 0;
  let existing = 0;
  for (const u of DEMO_USERS) {
    const found = await db.query.user.findFirst({ where: eq(tables.user.email, u.email) });
    if (found) {
      if (found.role !== u.role) await db.update(tables.user).set({ role: u.role }).where(eq(tables.user.id, found.id));
      existing += 1;
      continue;
    }
    await auth.api.signUpEmail({ body: { email: u.email, password, name: u.name } });
    await db.update(tables.user).set({ role: u.role, emailVerified: true }).where(eq(tables.user.email, u.email));
    created += 1;
  }
  return { created, existing };
}

export const ROLE_LIST = ROLES;
