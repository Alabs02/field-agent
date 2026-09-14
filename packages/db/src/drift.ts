import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import type { Database } from "./client.js";
import { brands, promotions } from "./schema/index.js";

/**
 * Demo helper: mutate a few *persisted* rows so the next verification run has
 * real discrepancies to report. It never touches the portal. `undo` restores.
 *
 *   A  title edited            -> changed [title]
 *   B  end date moved +3 days  -> changed [endsOn]
 *   C  url moved under /search -> unverifiable (robots_disallowed)
 *   D  fake promotion inserted -> missing_at_source
 */
export interface DriftResult {
  applied: Array<{ label: string; promotionId: string; sourceId: string; title: string }>;
}

const DRIFT_KEY = "__drift";
const FAKE_SOURCE_ID = "9999999";

export async function applyDrift(db: Database, portalId: string, baseUrl: string): Promise<DriftResult> {
  const candidates = await db.query.promotions.findMany({
    where: and(eq(promotions.portalId, portalId), isNull(promotions.removedAt), isNotNull(promotions.detailFetchedAt), sql`${promotions.sourcePayload} -> ${DRIFT_KEY} is null`),
    orderBy: [desc(promotions.firstSeenAt)],
    limit: 3,
  });
  if (candidates.length < 3) throw new Error(`need at least 3 verified promotions to drift; found ${candidates.length}. Run a scrape first.`);
  const [a, b, c] = candidates as [typeof candidates[number], typeof candidates[number], typeof candidates[number]];
  const applied: DriftResult["applied"] = [];
  const backup = (p: typeof a) => ({ ...(p.sourcePayload ?? {}), [DRIFT_KEY]: { title: p.title, endsAt: p.endsAt?.toISOString() ?? null, canonicalUrl: p.canonicalUrl } });

  await db.update(promotions).set({ title: `${a.title} (edited locally)`, sourcePayload: backup(a) }).where(eq(promotions.id, a.id));
  applied.push({ label: "A title edited", promotionId: a.id, sourceId: a.sourceId, title: a.title });

  const movedEnd = b.endsAt ? new Date(b.endsAt.getTime() + 3 * 86_400_000) : new Date(Date.now() + 3 * 86_400_000);
  await db.update(promotions).set({ endsAt: movedEnd, sourcePayload: backup(b) }).where(eq(promotions.id, b.id));
  applied.push({ label: "B end date +3 days", promotionId: b.id, sourceId: b.sourceId, title: b.title });

  await db
    .update(promotions)
    .set({ canonicalUrl: `${baseUrl}/search/deals/${c.sourceId}/`, sourcePayload: backup(c) })
    .where(eq(promotions.id, c.id));
  applied.push({ label: "C url under robots Disallow", promotionId: c.id, sourceId: c.sourceId, title: c.title });

  const brand = await db.query.brands.findFirst({ where: eq(brands.id, a.brandId) });
  const now = new Date();
  const [d] = await db
    .insert(promotions)
    .values({
      portalId,
      brandId: brand!.id,
      sourceId: FAKE_SOURCE_ID,
      fingerprint: `drift-${FAKE_SOURCE_ID}`,
      collection: "deals",
      title: "Phantom Promotion (inserted by demo:drift)",
      description: "This row exists only in our database. The portal has never listed it.",
      canonicalUrl: `${baseUrl}/deals/${FAKE_SOURCE_ID}/`,
      dateSource: "none",
      sourcePayload: { [DRIFT_KEY]: { inserted: true } },
      contentHash: "drift",
      firstSeenAt: now,
      lastSeenAt: now,
      scrapedAt: now,
      detailFetchedAt: now,
    })
    .onConflictDoNothing()
    .returning();
  if (d) applied.push({ label: "D phantom promotion", promotionId: d.id, sourceId: d.sourceId, title: d.title });
  return { applied };
}

export async function undoDrift(db: Database, portalId: string): Promise<number> {
  const drifted = await db.query.promotions.findMany({
    where: and(eq(promotions.portalId, portalId), sql`${promotions.sourcePayload} -> ${DRIFT_KEY} is not null`),
  });
  let n = 0;
  for (const p of drifted) {
    const payload = (p.sourcePayload ?? {}) as Record<string, unknown>;
    const saved = payload[DRIFT_KEY] as { title?: string; endsAt?: string | null; canonicalUrl?: string; inserted?: boolean };
    if (saved.inserted) {
      await db.delete(promotions).where(eq(promotions.id, p.id));
    } else {
      const { [DRIFT_KEY]: _omit, ...rest } = payload;
      await db
        .update(promotions)
        .set({
          title: saved.title ?? p.title,
          endsAt: saved.endsAt === undefined ? p.endsAt : saved.endsAt ? new Date(saved.endsAt) : null,
          canonicalUrl: saved.canonicalUrl ?? p.canonicalUrl,
          sourcePayload: rest,
        })
        .where(eq(promotions.id, p.id));
    }
    n += 1;
  }
  return n;
}
