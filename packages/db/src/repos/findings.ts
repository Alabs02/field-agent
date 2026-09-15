import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { FieldChange, Finding, FindingEvidence, FindingsQuery, VerificationOutcome } from "@field-agent/shared";
import type { Database } from "../client.js";
import { brands, promotions, verificationFindings } from "../schema/index.js";
import { iso } from "./mappers.js";

type FindingRow = typeof verificationFindings.$inferSelect;
type PromotionRow = typeof promotions.$inferSelect;
type BrandRow = typeof brands.$inferSelect;

/**
 * The finding keeps a snapshot of the promotion as it was at check time, so a report still
 * shows the original title after the record is edited later. Older findings (before the
 * snapshot column existed) fall back to the current row.
 */
function toFinding(f: FindingRow, p: PromotionRow, b: BrandRow): Finding {
  return {
    id: f.id,
    runId: f.runId,
    kind: f.kind,
    promotion: f.promotionSnapshot ?? { id: p.id, sourceId: p.sourceId, title: p.title, canonicalUrl: p.canonicalUrl, brandName: b.name },
    fieldChanges: f.fieldChanges,
    reason: f.reason,
    evidence: f.evidence,
    createdAt: iso(f.createdAt)!,
  };
}

export async function listFindings(db: Database, portalId: string, q: FindingsQuery) {
  const where = and(eq(promotions.portalId, portalId),
    q.runId ? eq(verificationFindings.runId, q.runId) : undefined,
    q.outcome ? eq(verificationFindings.kind, q.outcome) : undefined,
    q.search ? or(ilike(promotions.title, `%${q.search}%`), sql`${verificationFindings.promotionSnapshot}->>'title' ilike ${`%${q.search}%`}`) : undefined,
    q.brand ? or(eq(brands.slug, q.brand), ilike(brands.name, `%${q.brand}%`)) : undefined,
    q.field ? sql`exists(select 1 from jsonb_array_elements(${verificationFindings.fieldChanges}) f where f->>'field'=${q.field})` : undefined);
  const [total] = await db.select({ n: count() }).from(verificationFindings).innerJoin(promotions, eq(promotions.id, verificationFindings.promotionId)).innerJoin(brands, eq(brands.id, promotions.brandId)).where(where);
  const rows = await db.select({ f: verificationFindings, p: promotions, b: brands }).from(verificationFindings).innerJoin(promotions, eq(promotions.id, verificationFindings.promotionId)).innerJoin(brands, eq(brands.id, promotions.brandId)).where(where)
    .orderBy(desc(verificationFindings.createdAt), desc(verificationFindings.id)).limit(q.pageSize).offset((q.page - 1) * q.pageSize);
  return { total: total?.n ?? 0, items: rows.map(({ f, p, b }) => toFinding(f, p, b)) };
}

export interface FindingWrite {
  runId: string;
  promotionId: string;
  kind: VerificationOutcome;
  fieldChanges: FieldChange[];
  reason: string | null;
  evidence: FindingEvidence;
  promotionSnapshot?: Finding["promotion"];
  baselineUpdatedAt?: Date;
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
  return rows.map(({ f, p, b }) => toFinding(f, p, b));
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
  return rows.map(({ f, p, b }) => toFinding(f, p, b));
}
