import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { can, type Capability, type SessionUser } from "@field-agent/shared";
import { HttpError } from "./error-handler.js";

declare module "fastify" {
  interface FastifyRequest {
    user: SessionUser | null;
  }
}

export type SessionResolver = (request: FastifyRequest) => Promise<SessionUser | null>;

export interface AuthGuardOptions {
  required: boolean;
  resolve: SessionResolver;
}

/**
 * Per-route capability guard. When AUTH_REQUIRED is false (the brief's local
 * mode) every route is open and request.user is null. When true, the session
 * is resolved once per request and checked against the shared PERMISSIONS map.
 */
export function makeGuard(opts: AuthGuardOptions) {
  const resolveOnce = async (request: FastifyRequest): Promise<SessionUser | null> => {
    if (request.user !== undefined && request.user !== null) return request.user;
    const user = await opts.resolve(request);
    request.user = user;
    return user;
  };

  return function requires(capability: Capability): preHandlerHookHandler {
    return async function guard(request: FastifyRequest, _reply: FastifyReply) {
      if (!opts.required) {
        request.user = request.user ?? null;
        return;
      }
      const user = await resolveOnce(request);
      if (!user) throw new HttpError(401, "UNAUTHORIZED", "sign in required");
      if (!can(user.role, capability)) throw new HttpError(403, "FORBIDDEN", `role ${user.role} cannot ${capability}`);
    };
  };
}

export type Guard = ReturnType<typeof makeGuard>;
