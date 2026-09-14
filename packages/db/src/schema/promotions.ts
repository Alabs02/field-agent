import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { brands } from "./brands.js";
import { dateSourceEnum, promotionCollectionEnum, verificationOutcomeEnum } from "./enums.js";
import { portals } from "./portals.js";
import { scrapeRuns, verificationRuns } from "./runs.js";

/**
 * Stable identity is (portal_id, source_id) where source_id is the Placewise
 * deal id in the URL. `fingerprint` (normalized title | brand source id | end
 * day) catches the same promotion re-posted under a new id; the old ids are
 * kept in previous_source_ids.
 *
 * Dates are timestamptz from JSON-LD; day-granularity logic happens in the
 * portal's timezone at query/diff time, never by storing a lossy `date`.
 *
 * Scrape is the only writer of content columns. Verification writes only the
 * last_verification_* columns.
 */
export const promotions = pgTable(
  "promotions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portalId: text("portal_id")
      .notNull()
      .references(() => portals.id),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "restrict" }),
    sourceId: text("source_id").notNull(),
    previousSourceIds: text("previous_source_ids").array().notNull().default([]),
    fingerprint: text("fingerprint").notNull(),
    collection: promotionCollectionEnum("collection").notNull().default("other"),
    title: text("title").notNull(),
    description: text("description"),
    descriptionHtml: text("description_html"),
    imageUrl: text("image_url"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    dateSource: dateSourceEnum("date_source").notNull().default("none"),
    canonicalUrl: text("canonical_url").notNull(),
    /** Parsed JSON-LD + listing data-* attributes, kept for provenance. */
    sourcePayload: jsonb("source_payload").$type<Record<string, unknown>>(),
    /** sha256 of the comparable fields; "skipped" in run counts means this did not change. */
    contentHash: text("content_hash").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull(),
    /** null = detail page never fetched successfully; explains a null description honestly. */
    detailFetchedAt: timestamp("detail_fetched_at", { withTimezone: true }),
    /** Set when absent from the listing; cleared if it reappears. Rows are never deleted. */
    removedAt: timestamp("removed_at", { withTimezone: true }),
    lastScrapeRunId: uuid("last_scrape_run_id").references(() => scrapeRuns.id, {
      onDelete: "set null",
    }),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    lastVerificationOutcome: verificationOutcomeEnum("last_verification_outcome"),
    lastVerificationRunId: uuid("last_verification_run_id").references(() => verificationRuns.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("promotions_portal_source_uq").on(t.portalId, t.sourceId),
    uniqueIndex("promotions_portal_canonical_uq").on(t.portalId, t.canonicalUrl),
    index("promotions_brand_idx").on(t.brandId),
    index("promotions_active_ends_idx").on(t.portalId, t.removedAt, t.endsAt),
    index("promotions_fingerprint_idx").on(t.fingerprint),
  ],
);
