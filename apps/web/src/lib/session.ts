import "server-only";
import { z } from "zod";
import { RoleSchema, type SessionUser } from "@field-agent/shared";
import { apiFetch } from "./api";

const GetSessionSchema = z
  .object({
    user: z.object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      role: z.string().nullish(),
    }),
  })
  .nullable();

/** Resolve the signed-in user for server components by asking Better Auth (cookies are forwarded). */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const s = await apiFetch("/api/auth/get-session", GetSessionSchema);
    if (!s?.user) return null;
    const role = RoleSchema.safeParse(s.user.role);
    return { id: s.user.id, email: s.user.email, name: s.user.name, role: role.success ? role.data : "reviewer" };
  } catch {
    return null;
  }
}

export const authRequired = (): boolean => process.env.AUTH_REQUIRED === "true";
