import { and, asc, count, desc, eq, ilike, inArray, isNull, ne, notInArray, or, sql, type SQL } from "drizzle-orm";
import type {
  Collection,
  DateSource,
  Promotion,
  PromotionDetail,
  PromotionsQuery,
  VerificationOutcome,
} from "@field-agent/shared";
import type { Database } from "../client.js";
import { brands, promotions } from "../schema/index.js";
import { brandToApi, promotionToApi, type BrandRow, type PromotionRow } from "./mappers.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PromotionWrite {
  portalId: string;
  brandId: string;
  sourceId: string;
  fingerprint: string;
  collection: Collection;
  title: string;
  description: string | null;
  descriptionHtml: string | null;
  imageUrl: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  dateSource: DateSource;
  canonicalUrl: string;
  sourcePayload: Record<string, unknown> | null;
  contentHash: string;
  /** Set when the detail page was fetched successfully in this run. */
  detailFetchedAt: Date | null;
  runId: string;
  now: Date;
}

export type UpsertOutcome = "persisted" | "updated" | "skipped";

/**
 * Identity: (portal, source_id). If unknown, a matching fingerprint on an
 * active row means the same campaign was re-posted under a new id: relink
 * in place and remember the old id. Unchanged content is "skipped" (seen,
 * hash equal), which also clears removed_at and bumps last_seen_at.
 */
export async function upsertPromotion(db: Database, w: PromotionWrite): Promise<{ row: PromotionRow; outcome: UpsertOutcome }> {
  let existing = await db.query.promotions.findFirst({
    where: and(eq(promotions.portalId, w.portalId), eq(promotions.sourceId, w.sourceId)),
  });
  let relinkedFrom: string | null = null;

  if (!existing) {
    const twin = await db.query.promotions.findFirst({
      where: and(
        eq(promotions.portalId, w.portalId),
        eq(promotions.fingerprint, w.fingerprint),
        ne(promotions.sourceId, w.sourceId),
      ),
      orderBy: [desc(promotions.lastSeenAt)],
    });
    if (twin) {
      existing = twin;
      relinkedFrom = twin.sourceId;
    }
  }

  const content = {
    brandId: w.brandId,
    collection: w.collection,
    title: w.title,
    description: w.description,
    descriptionHtml: w.descriptionHtml,
    imageUrl: w.imageUrl,
    startsAt: w.startsAt,
    endsAt: w.endsAt,
    dateSource: w.dateSource,
    canonicalUrl: w.canonicalUrl,
    sourcePayload: w.sourcePayload,
    contentHash: w.contentHash,
    fingerprint: w.fingerprint,
  };

  if (!existing) {
    const [row] = await db
      .insert(promotions)
      .values({
        portalId: w.portalId,
        sourceId: w.sourceId,
        ...content,
        firstSeenAt: w.now,
        lastSeenAt: w.now,
        scrapedAt: w.now,
        detailFetchedAt: w.detailFetchedAt,
        lastScrapeRunId: w.runId,
      })
      .returning();
    return { row: row!, outcome: "persisted" };
  }

  const unchanged = existing.contentHash === w.contentHash && relinkedFrom === null;
  if (unchanged) {
    const [row] = await db
      .update(promotions)
      .set({
        lastSeenAt: w.now,
        removedAt: null,
        lastScrapeRunId: w.runId,
        detailFetchedAt: w.detailFetchedAt ?? existing.detailFetchedAt,
        updatedAt: w.now,
      })
      .where(eq(promotions.id, existing.id))
      .returning();
    return { row: row!, outcome: "skipped" };
  }

  const [row] = await db
    .update(promotions)
    .set({
      ...content,
      sourceId: w.sourceId,
      previousSourceIds: relinkedFrom ? [...existing.previousSourceIds, relinkedFrom] : existing.previousSourceIds,
      lastSeenAt: w.now,
      scrapedAt: w.now,
      removedAt: null,
      detailFetchedAt: w.detailFetchedAt ?? existing.detailFetchedAt,
      lastScrapeRunId: w.runId,
      updatedAt: w.now,
    })
    .where(eq(promotions.id, existing.id))
    .returning();
  return { row: row!, outcome: "updated" };
}

/** Promotions not seen in this run disappear from the listing: mark, never delete. */
export async function markRemovedExcept(db: Database, portalId: string, seenSourceIds: string[], now: Date): Promise<number> {
  const rows = await db
    .update(promotions)
    .set({ removedAt: now, updatedAt: now })
    .where(
      and(
        eq(promotions.portalId, portalId),
        isNull(promotions.removedAt),
        seenSourceIds.length ? notInArray(promotions.sourceId, seenSourceIds) : undefined,
      ),
    )
    .returning({ id: promotions.id });
  return rows.length;
}

export async function findPromotionBySourceId(db: Database, portalId: string, sourceId: string) {
  return db.query.promotions.findFirst({ where: and(eq(promotions.portalId, portalId), eq(promotions.sourceId, sourceId)) });
}

export interface PromotionWithBrand {
  promotion: PromotionRow;
  brand: BrandRow;
}

export async function listActivePromotionsWithBrand(db: Database, portalId: string, ids?: string[]): Promise<PromotionWithBrand[]> {
  const rows = await db
    .select({ promotion: promotions, brand: brands })
    .from(promotions)
    .innerJoin(brands, eq(brands.id, promotions.brandId))
    .where(
      and(
        eq(promotions.portalId, portalId),
        ids?.length ? inArray(promotions.id, ids) : isNull(promotions.removedAt),
      ),
    )
    .orderBy(asc(promotions.sourceId));
  return rows;
}

export async function updateVerificationState(
  db: Database,
  promotionId: string,
  state: { at: Date; outcome: VerificationOutcome; runId: string },
): Promise<void> {
  await db
    .update(promotions)
    .set({ lastVerifiedAt: state.at, lastVerificationOutcome: state.outcome, lastVerificationRunId: state.runId })
    .where(eq(promotions.id, promotionId));
}

function dayInTz(col: SQL | typeof promotions.startsAt | typeof promotions.endsAt, tz: string): SQL {
  return sql`(${col} AT TIME ZONE ${tz})::date`;
}

export async function listPromotions(
  db: Database,
  portalId: string,
  q: PromotionsQuery,
  tz: string,
): Promise<{ items: Promotion[]; total: number }> {
  const conditions: (SQL | undefined)[] = [eq(promotions.portalId, portalId)];
  if (!q.includeRemoved) conditions.push(isNull(promotions.removedAt));
  if (q.search) {
    const needle = `%${q.search}%`;
    conditions.push(or(ilike(promotions.title, needle), ilike(brands.name, needle)));
  }
  if (q.startDate) {
    // still running on/after startDate: no end, or end day >= startDate
    conditions.push(or(isNull(promotions.endsAt), sql`${dayInTz(promotions.endsAt, tz)} >= ${q.startDate}::date`));
  }
  if (q.endDate) {
    conditions.push(or(isNull(promotions.startsAt), sql`${dayInTz(promotions.startsAt, tz)} <= ${q.endDate}::date`));
  }
  if (q.brand) {
    conditions.push(
      UUID_RE.test(q.brand)
        ? eq(brands.id, q.brand)
        : or(eq(brands.slug, q.brand), ilike(brands.name, q.brand), eq(brands.sourceId, q.brand)),
    );
  }
  if (q.collection) conditions.push(eq(promotions.collection, q.collection));
  if (q.category) {
    conditions.push(sql`exists (select 1 from unnest(${brands.categories}) c where c ilike ${q.category})`);
  }
  if (q.verification) {
    conditions.push(
      q.verification === "never"
        ? isNull(promotions.lastVerificationOutcome)
        : eq(promotions.lastVerificationOutcome, q.verification),
    );
  }
  const where = and(...conditions);

  const orderBy = (() => {
    switch (q.sort) {
      case "newest":
        return [desc(promotions.firstSeenAt), asc(promotions.title)];
      case "alpha":
        return [asc(promotions.title)];
      case "brand":
        return [asc(brands.name), asc(promotions.title)];
      case "endingSoon":
      default:
        return [sql`${promotions.endsAt} asc nulls last`, asc(promotions.title)];
    }
  })();

  const [totalRow] = await db
    .select({ n: count() })
    .from(promotions)
    .innerJoin(brands, eq(brands.id, promotions.brandId))
    .where(where);

  const rows = await db
    .select({ promotion: promotions, brand: brands })
    .from(promotions)
    .innerJoin(brands, eq(brands.id, promotions.brandId))
    .where(where)
    .orderBy(...orderBy)
    .limit(q.pageSize)
    .offset((q.page - 1) * q.pageSize);

  return { items: rows.map((r) => promotionToApi(r.promotion, r.brand)), total: totalRow?.n ?? 0 };
}

export async function getPromotionDetail(db: Database, id: string): Promise<PromotionDetail | null> {
  const [row] = await db
    .select({ promotion: promotions, brand: brands })
    .from(promotions)
    .innerJoin(brands, eq(brands.id, promotions.brandId))
    .where(eq(promotions.id, id))
    .limit(1);
  if (!row) return null;
  return { ...promotionToApi(row.promotion, row.brand), brand: brandToApi(row.brand) };
}

export async function listPromotionsForBrand(db: Database, brandId: string): Promise<Promotion[]> {
  const rows = await db
    .select({ promotion: promotions, brand: brands })
    .from(promotions)
    .innerJoin(brands, eq(brands.id, promotions.brandId))
    .where(and(eq(promotions.brandId, brandId), isNull(promotions.removedAt)))
    .orderBy(sql`${promotions.endsAt} asc nulls last`, asc(promotions.title));
  return rows.map((r) => promotionToApi(r.promotion, r.brand));
}

export async function countCompletedScrapes(db: Database, portalId: string): Promise<number> {
  const { scrapeRuns } = await import("../schema/index.js");
  const [row] = await db
    .select({ n: count() })
    .from(scrapeRuns)
    .where(and(eq(scrapeRuns.portalId, portalId), inArray(scrapeRuns.status, ["completed", "completed_with_errors"])));
  return row?.n ?? 0;
}
