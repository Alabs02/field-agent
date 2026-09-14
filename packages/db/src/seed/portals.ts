import { BRIARGATE_PORTAL } from "@field-agent/shared";
import type { Database } from "../client.js";
import { portals } from "../schema/index.js";

export async function seedPortals(db: Database): Promise<void> {
  await db
    .insert(portals)
    .values({
      id: BRIARGATE_PORTAL.id,
      name: BRIARGATE_PORTAL.name,
      baseUrl: BRIARGATE_PORTAL.baseUrl,
      timezone: BRIARGATE_PORTAL.timezone,
    })
    .onConflictDoUpdate({
      target: portals.id,
      set: { name: BRIARGATE_PORTAL.name, baseUrl: BRIARGATE_PORTAL.baseUrl },
    });
}
