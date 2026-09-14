import { z } from "zod";
import { HttpUrl, IsoDateTime } from "./primitives";

/** Only one portal exists in this slice; the literal keeps every payload explicit about its source. */
export const PortalIdSchema = z.literal("briargate");
export type PortalId = z.infer<typeof PortalIdSchema>;

export const PortalSchema = z.object({
  id: PortalIdSchema,
  name: z.string(),
  baseUrl: HttpUrl,
  timezone: z.string(),
  createdAt: IsoDateTime,
});
export type Portal = z.infer<typeof PortalSchema>;

export const BRIARGATE_PORTAL = {
  id: "briargate",
  name: "The Promenade Shops at Briargate",
  baseUrl: "https://www.thepromenadeshopsatbriargate.com",
  timezone: "America/Denver",
} as const satisfies Omit<Portal, "createdAt">;
