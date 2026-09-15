import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, ne, notInArray, or, sql, type SQL } from "drizzle-orm";
import type {
  BrandWithCount,
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
    // A twin that is still on the listing is a simultaneous duplicate, not a re-post; keep both rows.
    const twin = await db.query.promotions.findFirst({
      where: and(
        eq(promotions.portalId, w.portalId),
        eq(promotions.fingerprint, w.fingerprint),
        ne(promotions.sourceId, w.sourceId),
        isNotNull(promotions.removedAt),
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
        updatedAt: w.now,
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
        sourcePayload: w.sourcePayload,
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

/**
 * Promotions a verification run should look at. Listed records always; removed records only
 * while recent (`removedWithinDays`), so confirming a disappearance costs a detail request for a
 * bounded window instead of growing with every removal the portal ever made.
 */
export async function listActivePromotionsWithBrand(
  db: Database,
  portalId: string,
  ids?: string[],
  opts: { removedWithinDays?: number } = {},
): Promise<PromotionWithBrand[]> {
  const removedScope =
    opts.removedWithinDays != null
      ? or(isNull(promotions.removedAt), sql`${promotions.removedAt} >= now() - make_interval(days => ${opts.removedWithinDays})`)
      : isNull(promotions.removedAt);
  const rows = await db
    .select({ promotion: promotions, brand: brands })
    .from(promotions)
    .innerJoin(brands, eq(brands.id, promotions.brandId))
    .where(and(eq(promotions.portalId, portalId), ids?.length ? inArray(promotions.id, ids) : removedScope))
    .orderBy(asc(promotions.sourceId));
  return rows;
}

export async function updateVerificationState(
  db: Database,
  promotionId: string,
  state: { at: Date; outcome: VerificationOutcome; runId: string; baselineUpdatedAt: Date; checkedVia: "listing" | "detail" },
): Promise<void> {
  await db
    .update(promotions)
    .set({ lastVerifiedAt: state.at, lastVerificationOutcome: state.outcome, lastVerificationRunId: state.runId, lastVerificationCoverage: state.checkedVia })
    // Rows inserted before updated_at was set explicitly carry Postgres microsecond precision;
    // compare at millisecond precision so a JS Date baseline still matches them.
    .where(and(eq(promotions.id, promotionId),
      sql`date_trunc('milliseconds', ${promotions.updatedAt}) = date_trunc('milliseconds', ${state.baselineUpdatedAt.toISOString()}::timestamptz)`,
      state.outcome === "clean" && state.checkedVia !== "detail"
        ? or(isNull(promotions.lastVerificationOutcome), eq(promotions.lastVerificationOutcome, "clean")) : undefined));
}

function dayInTz(col: SQL | typeof promotions.startsAt | typeof promotions.endsAt, tz: string): SQL {
  return sql`(${col} AT TIME ZONE ${tz})::date`;
}

function promotionWhere(portalId: string, q: PromotionsQuery, tz: string) {
  const conditions: (SQL | undefined)[] = [eq(promotions.portalId, portalId)];
  if (q.presence === "removed") conditions.push(isNotNull(promotions.removedAt));
  else if (q.presence !== "all" && !q.includeRemoved) conditions.push(isNull(promotions.removedAt));
  if (q.firstSeenFrom) conditions.push(sql`${promotions.firstSeenAt} >= ${q.firstSeenFrom}::timestamptz`);
  if (q.firstSeenTo) conditions.push(sql`${promotions.firstSeenAt} <= ${q.firstSeenTo}::timestamptz`);
  if (q.endingSoon) conditions.push(sql`${promotions.endsAt} between now() and now()+interval '7 days'`);
  if (q.attention) conditions.push(inArray(promotions.lastVerificationOutcome, ["changed", "missing_at_source", "unverifiable"]));
  if (q.freshness === "never_detail") conditions.push(isNull(promotions.detailFetchedAt));
  if (q.freshness === "fresh") conditions.push(sql`${promotions.lastSeenAt} >= now()-interval '24 hours'`);
  if (q.freshness === "stale") conditions.push(sql`${promotions.lastSeenAt} < now()-interval '24 hours'`);
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
  return and(...conditions);

}

/**
 * Field names from the finding recorded by the promotion's last verification run.
 * A correlated scalar, so a page of N promotions costs one query, not N+1.
 */
const changedFieldsSql = sql<string[]>`coalesce((
  select array_agg(x->>'field' order by x->>'field')
  from verification_findings f cross join lateral jsonb_array_elements(f.field_changes) x
  where f.promotion_id = ${promotions.id} and f.run_id = ${promotions.lastVerificationRunId}
), '{}'::text[])`;

export async function listPromotions(
  db: Database,
  portalId: string,
  q: PromotionsQuery,
  tz: string,
): Promise<{ items: Promotion[]; total: number; withinValidity: number }> {
  const where = promotionWhere(portalId, q, tz);

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

  // "Listed by the portal" (total) and "currently within known validity dates" are different
  // questions; both are answered over the same filtered scope so the two numbers can be compared.
  const [totalRow] = await db
    .select({
      n: count(),
      withinValidity: sql<number>`count(*) filter (where (${promotions.startsAt} is null or ${promotions.startsAt} <= now()) and ${promotions.endsAt} is not null and ${promotions.endsAt} >= now())::int`,
    })
    .from(promotions)
    .innerJoin(brands, eq(brands.id, promotions.brandId))
    .where(where);

  const rows = await db
    .select({ promotion: promotions, brand: brands, changedFields: changedFieldsSql })
    .from(promotions)
    .innerJoin(brands, eq(brands.id, promotions.brandId))
    .where(where)
    .orderBy(...orderBy, asc(promotions.id))
    .limit(q.pageSize)
    .offset((q.page - 1) * q.pageSize);

  return { items: rows.map((r) => promotionToApi(r.promotion, r.brand, { changedFields: r.changedFields })), total: totalRow?.n ?? 0, withinValidity: Number(totalRow?.withinValidity ?? 0) };
}

/**
 * Grouped view: paginate over the brands that have matching promotions, then return each
 * selected brand's complete filtered group, so a brand is never split across pages.
 */
export async function listPromotionsGrouped(
  db: Database,
  portalId: string,
  q: PromotionsQuery,
  tz: string,
): Promise<{ items: Array<{ brand: BrandWithCount; promotions: Promotion[] }>; total: number }> {
  const where = promotionWhere(portalId, q, tz);
  const inScope = sql<number>`count(${promotions.id})::int`;
  const brandPage = await db
    .select({ brand: brands, promotionCount: inScope })
    .from(promotions)
    .innerJoin(brands, eq(brands.id, promotions.brandId))
    .where(where)
    .groupBy(brands.id)
    .orderBy(q.sort === "newest" ? sql`max(${promotions.firstSeenAt}) desc` : q.sort === "endingSoon" ? sql`min(${promotions.endsAt}) asc nulls last` : asc(brands.name), asc(brands.name), asc(brands.id))
    .limit(q.pageSize)
    .offset((q.page - 1) * q.pageSize);
  const [totalRow] = await db
    .select({ n: sql<number>`count(distinct ${promotions.brandId})::int` })
    .from(promotions)
    .innerJoin(brands, eq(brands.id, promotions.brandId))
    .where(where);
  if (brandPage.length === 0) return { items: [], total: Number(totalRow?.n ?? 0) };

  const rows = await db
    .select({ promotion: promotions, brand: brands, changedFields: changedFieldsSql })
    .from(promotions)
    .innerJoin(brands, eq(brands.id, promotions.brandId))
    .where(and(where, inArray(promotions.brandId, brandPage.map((b) => b.brand.id))))
    .orderBy(q.sort === "newest" ? desc(promotions.firstSeenAt) : q.sort === "alpha" ? asc(promotions.title) : sql`${promotions.endsAt} asc nulls last`, asc(promotions.title), asc(promotions.id));
  const byBrand = new Map<string, Promotion[]>();
  for (const r of rows) {
    const list = byBrand.get(r.brand.id) ?? [];
    list.push(promotionToApi(r.promotion, r.brand, { changedFields: r.changedFields }));
    byBrand.set(r.brand.id, list);
  }
  return {
    items: brandPage.map((b) => ({ brand: { ...brandToApi(b.brand), promotionCount: b.promotionCount }, promotions: byBrand.get(b.brand.id) ?? [] })),
    total: Number(totalRow?.n ?? 0),
  };
}

export async function getPromotionDetail(db: Database, id: string): Promise<PromotionDetail | null> {
  const [row] = await db
    .select({ promotion: promotions, brand: brands, changedFields: changedFieldsSql })
    .from(promotions)
    .innerJoin(brands, eq(brands.id, promotions.brandId))
    .where(eq(promotions.id, id))
    .limit(1);
  if (!row) return null;
  return { ...promotionToApi(row.promotion, row.brand, { changedFields: row.changedFields }), brand: brandToApi(row.brand) };
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
