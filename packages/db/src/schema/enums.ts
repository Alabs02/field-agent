import { pgEnum } from "drizzle-orm/pg-core";
import {
  COLLECTIONS,
  RUN_STATUSES,
  SCRAPE_PHASES,
  VERIFICATION_OUTCOMES,
} from "@field-agent/shared";

// Enums are declared from the shared constants so the DB and the API cannot drift.
export const runStatusEnum = pgEnum("run_status", RUN_STATUSES);
export const scrapePhaseEnum = pgEnum("scrape_phase", SCRAPE_PHASES);
export const verificationOutcomeEnum = pgEnum("verification_outcome", VERIFICATION_OUTCOMES);
export const promotionCollectionEnum = pgEnum("promotion_collection", COLLECTIONS);
export const dateSourceEnum = pgEnum("date_source", ["jsonld", "listing_serial", "none"]);
export const snapshotKindEnum = pgEnum("snapshot_kind", [
  "robots",
  "sitemap",
  "listing",
  "directory",
  "deal",
  "store",
]);
