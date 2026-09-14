import { desc, eq } from "drizzle-orm";
import type { FieldChange, Finding, FindingEvidence, VerificationOutcome } from "@field-agent/shared";
import type { Database } from "../client.js";
import { brands, promotions, verificationFindings } from "../schema/index.js";
import { iso } from "./mappers.js";

export interface FindingWrite {
  runId: string;
  promotionId: string;
  kind: VerificationOutcome;
  fieldChanges: FieldChange[];
  reason: string | null;
  evidence: FindingEvidence;
}

export async function insertFindings(db: Database, rows: FindingWrite[]): Promise<void> {
  if (!rows.length) return;
  await db.insert(verificationFindings).values(rows).onConflictDoNothing();
}

export async function listFindingsForRun(db: Database, runId: string): Promise<Finding[]> {
  const rows = await db
    .select({ f: verificationFindings, p: promotions, b: brands })
    .from(verificationFindings)
    .innerJoin(promotions, eq(promotions.id, verificationFindings.promotionId))
    .innerJoin(brands, eq(brands.id, promotions.brandId))
    .where(eq(verificationFindings.runId, runId))
    .orderBy(desc(verificationFindings.kind), brands.name, promotions.title);
  return rows.map(({ f, p, b }) => ({
    id: f.id,
    kind: f.kind,
    promotion: { id: p.id, sourceId: p.sourceId, title: p.title, canonicalUrl: p.canonicalUrl, brandName: b.name },
    fieldChanges: f.fieldChanges,
    reason: f.reason,
    evidence: f.evidence,
    createdAt: iso(f.createdAt)!,
  }));
}

export async function listFindingsForPromotion(db: Database, promotionId: string, limit = 20): Promise<Finding[]> {
  const rows = await db
    .select({ f: verificationFindings, p: promotions, b: brands })
    .from(verificationFindings)
    .innerJoin(promotions, eq(promotions.id, verificationFindings.promotionId))
    .innerJoin(brands, eq(brands.id, promotions.brandId))
    .where(eq(verificationFindings.promotionId, promotionId))
    .orderBy(desc(verificationFindings.createdAt))
    .limit(limit);
  return rows.map(({ f, p, b }) => ({
    id: f.id,
    kind: f.kind,
    promotion: { id: p.id, sourceId: p.sourceId, title: p.title, canonicalUrl: p.canonicalUrl, brandName: b.name },
    fieldChanges: f.fieldChanges,
    reason: f.reason,
    evidence: f.evidence,
    createdAt: iso(f.createdAt)!,
  }));
}
