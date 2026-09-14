import "server-only";
import { cookies, headers } from "next/headers";
import type { z } from "zod";

/** Server-side base URL of the Fastify API (compose: http://api:4000). */
export const API_URL = process.env.API_URL ?? "http://localhost:4000";

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/**
 * Fetch from the API on the server and parse the JSON against the shared
 * schema, so the UI boundary enforces the same contract the API serializes.
 * Cookies are forwarded so a signed-in session reaches the API.
 */
export async function apiFetch<T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  init: RequestInit & { searchParams?: Record<string, string | number | boolean | undefined> } = {},
): Promise<z.infer<T>> {
  const url = new URL(path, API_URL);
  for (const [k, v] of Object.entries(init.searchParams ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  const cookieHeader = (await cookies()).toString();
  const reqHeaders = await headers();
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      accept: "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(reqHeaders.get("x-request-id") ? { "x-request-id": reqHeaders.get("x-request-id")! } : {}),
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    throw new ApiRequestError(res.status, err?.code ?? "HTTP_ERROR", err?.message ?? `HTTP ${res.status}`, err?.details);
  }
  return schema.parse(body);
}
