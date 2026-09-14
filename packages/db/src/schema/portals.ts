import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * One row for this slice ("briargate"). Exists so every fact carries its
 * source portal (brief §8) and a second portal is a row, not a migration.
 */
export const portals = pgTable("portals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  timezone: text("timezone").notNull().default("America/Denver"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
