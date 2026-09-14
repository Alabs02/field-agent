import { z } from "zod";

export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "CONFLICT",
  "RATE_LIMITED",
  "QUEUE_UNAVAILABLE",
  "SERVICE_UNAVAILABLE",
  "INTERNAL",
] as const;
export const ErrorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
  requestId: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
