import { relations } from "drizzle-orm";
import { brands } from "./brands.js";
import { verificationFindings } from "./findings.js";
import { promotions } from "./promotions.js";
import { scrapeRuns, verificationRuns } from "./runs.js";

export * from "./enums.js";
export * from "./portals.js";
export * from "./brands.js";
export * from "./promotions.js";
export * from "./runs.js";
export * from "./findings.js";
export * from "./snapshots.js";
export * from "./auth.js";

export const brandsRelations = relations(brands, ({ many }) => ({
  promotions: many(promotions),
}));

export const promotionsRelations = relations(promotions, ({ one, many }) => ({
  brand: one(brands, { fields: [promotions.brandId], references: [brands.id] }),
  lastScrapeRun: one(scrapeRuns, { fields: [promotions.lastScrapeRunId], references: [scrapeRuns.id] }),
  findings: many(verificationFindings),
}));

export const verificationRunsRelations = relations(verificationRuns, ({ many }) => ({
  findings: many(verificationFindings),
}));

export const verificationFindingsRelations = relations(verificationFindings, ({ one }) => ({
  run: one(verificationRuns, {
    fields: [verificationFindings.runId],
    references: [verificationRuns.id],
  }),
  promotion: one(promotions, {
    fields: [verificationFindings.promotionId],
    references: [promotions.id],
  }),
}));
