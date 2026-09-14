import { and, asc, count, desc, eq, ilike, isNull, isNotNull, lt, or, sql } from "drizzle-orm";
import type { BrandsQuery, BrandWithCount, ScrapedBrand, ScrapedBrandStub } from "@field-agent/shared";
import type { Database } from "../client.js";
import { brands, promotions } from "../schema/index.js";
import { brandToApi, type BrandRow } from "./mappers.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slugFromName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Create the brand if unknown, using only listing/directory-level facts.
 * Never overwrites data that came from a real store-page fetch.
 */
export async function ensureBrandStub(
  db: Database,
  portalId: string,
  stub: Pick<ScrapedBrandStub, "sourceId" | "name"> & Partial<ScrapedBrandStub>,
  baseUrl: string,
): Promise<BrandRow> {
  const slug = stub.slug ?? slugFromName(stub.name);
  const sourceUrl = stub.sourceUrl ?? `${baseUrl}/stores/${stub.sourceId}-${slug}/`;
  const [row] = await db
    .insert(brands)
    .values({
      portalId,
      sourceId: stub.sourceId,
      slug,
      name: stub.name,
      sourceUrl,
      categories: stub.categories ?? [],
    })
    .onConflictDoUpdate({
      target: [brands.portalId, brands.sourceId],
      set: {
        // Directory categories are cheap and safe to refresh; name/slug only when we have better ones.
        categories: stub.categories?.length ? stub.categories : sql`${brands.categories}`,
        slug: stub.slug ? stub.slug : sql`${brands.slug}`,
        sourceUrl: stub.sourceUrl ? stub.sourceUrl : sql`${brands.sourceUrl}`,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row!;
}

export interface BrandUpsertResult {
  row: BrandRow;
  outcome: "persisted" | "updated" | "skipped";
}

/** Full store-page data. Sets storePageFetchedAt so "unknown" and "not listed" stay distinguishable. */
export async function upsertBrandDetails(
  db: Database,
  portalId: string,
  scraped: ScrapedBrand,
  contentHash: string,
  now: Date,
): Promise<BrandUpsertResult> {
  const existing = await db.query.brands.findFirst({
    where: and(eq(brands.portalId, portalId), eq(brands.sourceId, scraped.sourceId)),
  });
  const values = {
    portalId,
    sourceId: scraped.sourceId,
    slug: scraped.slug,
    name: scraped.name,
    sourceUrl: scraped.sourceUrl,
    websiteUrl: scraped.websiteUrl,
    websiteIsRedirect: scraped.websiteIsRedirect,
    hours: scraped.hours,
    hoursRaw: scraped.hoursRaw,
    phone: scraped.phone,
    location: scraped.location,
    description: scraped.description,
    logoUrl: scraped.logoUrl,
    socialLinks: scraped.socialLinks,
    contentHash,
    storePageFetchedAt: now,
    updatedAt: now,
  };
  if (!existing) {
    const [row] = await db.insert(brands).values(values).returning();
    return { row: row!, outcome: "persisted" };
  }
  if (existing.contentHash === contentHash) {
    const [row] = await db
      .update(brands)
      .set({ storePageFetchedAt: now, updatedAt: now })
      .where(eq(brands.id, existing.id))
      .returning();
    return { row: row!, outcome: "skipped" };
  }
  const [row] = await db.update(brands).set(values).where(eq(brands.id, existing.id)).returning();
  return { row: row!, outcome: "updated" };
}

export async function getBrandBySourceId(db: Database, portalId: string, sourceId: string) {
  return db.query.brands.findFirst({ where: and(eq(brands.portalId, portalId), eq(brands.sourceId, sourceId)) });
}

/** Brands with at least one active promotion whose store page is missing or older than `staleBefore`. */
export async function brandsNeedingRefresh(db: Database, portalId: string, staleBefore: Date): Promise<BrandRow[]> {
  const rows = await db
    .selectDistinct({ brand: brands })
    .from(brands)
    .innerJoin(promotions, and(eq(promotions.brandId, brands.id), isNull(promotions.removedAt)))
    .where(
      and(
        eq(brands.portalId, portalId),
        or(isNull(brands.storePageFetchedAt), lt(brands.storePageFetchedAt, staleBefore)),
      ),
    );
  return rows.map((r) => r.brand);
}

export async function listBrands(db: Database, portalId: string, q: BrandsQuery): Promise<{ items: BrandWithCount[]; total: number }> {
  const promoCount = sql<number>`count(${promotions.id})::int`;
  const where = and(
    eq(brands.portalId, portalId),
    q.search ? ilike(brands.name, `%${q.search}%`) : undefined,
  );
  const having = q.hasPromotions ? sql`count(${promotions.id}) > 0` : undefined;

  const base = db
    .select({ brand: brands, promotionCount: promoCount })
    .from(brands)
    .leftJoin(promotions, and(eq(promotions.brandId, brands.id), isNull(promotions.removedAt)))
    .where(where)
    .groupBy(brands.id);
  const withHaving = having ? base.having(having) : base;

  const order = q.sort === "alpha" ? [asc(brands.name)] : [desc(promoCount), asc(brands.name)];
  const items = await withHaving
    .orderBy(...order)
    .limit(q.pageSize)
    .offset((q.page - 1) * q.pageSize);

  const totalRows = await db
    .select({ id: brands.id })
    .from(brands)
    .leftJoin(promotions, and(eq(promotions.brandId, brands.id), isNull(promotions.removedAt)))
    .where(where)
    .groupBy(brands.id)
    .having(having ?? sql`true`);

  return {
    items: items.map((r) => ({ ...brandToApi(r.brand), promotionCount: r.promotionCount })),
    total: totalRows.length,
  };
}

/** Accepts a uuid, a slug, or a name (case-insensitive). */
export async function findBrandByRef(db: Database, portalId: string, ref: string): Promise<BrandRow | undefined> {
  if (UUID_RE.test(ref)) return db.query.brands.findFirst({ where: and(eq(brands.portalId, portalId), eq(brands.id, ref)) });
  return db.query.brands.findFirst({
    where: and(eq(brands.portalId, portalId), or(eq(brands.slug, ref), ilike(brands.name, ref))),
  });
}

export async function countActivePromotions(db: Database, brandId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(promotions)
    .where(and(eq(promotions.brandId, brandId), isNull(promotions.removedAt)));
  return row?.n ?? 0;
}

export async function countBrandsWithStoreData(db: Database, portalId: string): Promise<{ fetched: number; withSocials: number }> {
  const [row] = await db
    .select({
      fetched: count(brands.storePageFetchedAt),
      withSocials: sql<number>`count(*) filter (where jsonb_array_length(${brands.socialLinks}) > 0)::int`,
    })
    .from(brands)
    .where(and(eq(brands.portalId, portalId), isNotNull(brands.storePageFetchedAt)));
  return { fetched: row?.fetched ?? 0, withSocials: row?.withSocials ?? 0 };
}
