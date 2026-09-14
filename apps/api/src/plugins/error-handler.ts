import type { FastifyError, FastifyInstance } from "fastify";
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from "fastify-type-provider-zod";
import type { ApiError, ErrorCode } from "@field-agent/shared";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const notFound = (what: string) => new HttpError(404, "NOT_FOUND", `${what} not found`);

const codeForStatus = (status: number): ErrorCode => {
  switch (status) {
    case 400:
      return "VALIDATION_ERROR";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 429:
      return "RATE_LIMITED";
    case 503:
      return "SERVICE_UNAVAILABLE";
    default:
      return "INTERNAL";
  }
};

/** Every error leaves as the shared ApiError envelope, never as Fastify's default shape. */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((err: unknown, request, reply) => {
    const requestId = request.id;

    if (hasZodFastifySchemaValidationErrors(err)) {
      const body: ApiError = {
        error: {
          code: "VALIDATION_ERROR",
          message: "request does not match the schema",
          details: err.validation.map((v) => ({ path: v.instancePath, message: v.message })),
        },
        requestId,
      };
      return reply.status(400).send(body);
    }

    if (isResponseSerializationError(err)) {
      // Our own output broke the contract; say so loudly (G2: one source of truth).
      request.log.error({ err: err.cause, method: err.method, url: err.url }, "response failed schema validation");
      const body: ApiError = { error: { code: "INTERNAL", message: "response did not match the API contract" }, requestId };
      return reply.status(500).send(body);
    }

    if (err instanceof HttpError) {
      const body: ApiError = { error: { code: err.code, message: err.message, details: err.details }, requestId };
      return reply.status(err.statusCode).send(body);
    }

    const fe = err as Partial<FastifyError> & { message?: string };
    const status = typeof fe.statusCode === "number" && fe.statusCode >= 400 ? fe.statusCode : 500;
    if (status >= 500) request.log.error({ err }, "unhandled error");
    const body: ApiError = {
      error: { code: codeForStatus(status), message: status >= 500 ? "internal error" : (fe.message ?? "error") },
      requestId,
    };
    return reply.status(status).send(body);
  });

  app.setNotFoundHandler((request, reply) => {
    const body: ApiError = { error: { code: "NOT_FOUND", message: `route ${request.method} ${request.url} not found` }, requestId: request.id };
    return reply.status(404).send(body);
  });
}
