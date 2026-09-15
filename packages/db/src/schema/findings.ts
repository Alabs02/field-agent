import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { FieldChange, Finding, FindingEvidence } from "@field-agent/shared";
import { verificationOutcomeEnum } from "./enums.js";
import { promotions } from "./promotions.js";
import { verificationRuns } from "./runs.js";

/**
 * One row per promotion per verification run, including clean ones, so the
 * report can prove what was checked and not only what failed.
 */
export const verificationFindings = pgTable(
  "verification_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => verificationRuns.id, { onDelete: "cascade" }),
    promotionId: uuid("promotion_id")
      .notNull()
      .references(() => promotions.id, { onDelete: "cascade" }),
    kind: verificationOutcomeEnum("kind").notNull(),
    fieldChanges: jsonb("field_changes").$type<FieldChange[]>().notNull().default([]),
    reason: text("reason"),
    evidence: jsonb("evidence").$type<FindingEvidence>().notNull(),
    promotionSnapshot: jsonb("promotion_snapshot").$type<Finding["promotion"]>(),
    baselineUpdatedAt: timestamp("baseline_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("verification_findings_run_promotion_uq").on(t.runId, t.promotionId),
    index("verification_findings_promotion_idx").on(t.promotionId, t.createdAt),
  ],
);
