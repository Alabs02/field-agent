import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { snapshotKindEnum } from "./enums.js";
import { portals } from "./portals.js";

/**
 * Raw HTML captured on first sight and whenever the content hash changes
 * (brief §14: "snapshot what you scrape on first run"). Also supplies the
 * ETag / Last-Modified for conditional requests. Stored in Postgres so
 * compose and Railway need no extra volume.
 */
export const htmlSnapshots = pgTable(
  "html_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portalId: text("portal_id")
      .notNull()
      .references(() => portals.id),
    runId: uuid("run_id"),
    kind: snapshotKindEnum("kind").notNull(),
    url: text("url").notNull(),
    finalUrl: text("final_url").notNull(),
    httpStatus: integer("http_status").notNull(),
    sha256: text("sha256").notNull(),
    etag: text("etag"),
    lastModified: text("last_modified"),
    body: text("body").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("html_snapshots_url_sha_uq").on(t.url, t.sha256),
    index("html_snapshots_url_fetched_idx").on(t.url, t.fetchedAt),
  ],
);
