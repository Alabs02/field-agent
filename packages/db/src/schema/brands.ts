import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { Hours, SocialLink } from "@field-agent/shared";
import { portals } from "./portals.js";

/**
 * Brands are normalized: hours/website/socials are brand facts shared by
 * several promotions, promotionCount is a GROUP BY, and one store-page fetch
 * per brand per run is all the politeness budget can afford.
 */
export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portalId: text("portal_id")
      .notNull()
      .references(() => portals.id),
    /** Placewise store id (data-store-id / /stores/{id}-slug/). */
    sourceId: text("source_id").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sourceUrl: text("source_url").notNull(),
    websiteUrl: text("website_url"),
    websiteIsRedirect: boolean("website_is_redirect").notNull().default(false),
    hours: jsonb("hours").$type<Hours>(),
    hoursRaw: text("hours_raw"),
    phone: text("phone"),
    location: text("location"),
    description: text("description"),
    logoUrl: text("logo_url"),
    categories: text("categories").array().notNull().default([]),
    socialLinks: jsonb("social_links").$type<SocialLink[]>().notNull().default([]),
    /** sha256 of the comparable brand fields; lets a re-scrape tell "updated" from "unchanged". */
    contentHash: text("content_hash"),
    /** null = the store page has never been fetched; hours/website are unknown, not absent. */
    storePageFetchedAt: timestamp("store_page_fetched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("brands_portal_source_uq").on(t.portalId, t.sourceId),
    index("brands_portal_name_idx").on(t.portalId, t.name),
  ],
);
