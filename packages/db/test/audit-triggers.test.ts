import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "../src/client.js";
import { auditEvents, brands, portals, promotions } from "../src/schema/index.js";
import { overview } from "../src/repos/overview.js";

/**
 * The audit trail is a database trigger, so it can only be tested against a database.
 * Runs when DATABASE_URL points at a migrated database (the Compose stack locally);
 * skipped otherwise. Every write happens inside a transaction that is rolled back,
 * so the database is left exactly as it was found.
 */
const url = process.env.DATABASE_URL;
const PORTAL = "briargate";
class Rollback extends Error {}

describe.skipIf(!url)("audit triggers", () => {
  const conn = url ? createDb(url, { max: 1 }) : null;
  const db = conn!.db;

  beforeAll(async () => {
    await db.insert(portals).values({ id: PORTAL, name: "The Promenade Shops at Briargate", timezone: "America/Denver", baseUrl: "https://www.thepromenadeshopsatbriargate.com" }).onConflictDoNothing();
  });
  afterAll(async () => {
    await conn?.close();
  });

  it("records creation, meaningful edits, removal and reappearance of a promotion with the row as it was", async () => {
    await expect(
      db.transaction(async (tx) => {
        const [brand] = await tx.insert(brands).values({ portalId: PORTAL, sourceId: "test-brand", slug: "test-brand", name: "Test Brand", sourceUrl: "https://example.test/stores/test-brand/" }).returning();
        const now = new Date();
        const [promo] = await tx
          .insert(promotions)
          .values({ portalId: PORTAL, brandId: brand!.id, sourceId: "test-9999", fingerprint: "fp", title: "Original title", canonicalUrl: "https://example.test/deals/9999/", contentHash: "h1", firstSeenAt: now, lastSeenAt: now, scrapedAt: now, updatedAt: now })
          .returning();
        const events = async () => tx.select({ action: auditEvents.action, label: auditEvents.label, before: auditEvents.before, after: auditEvents.after }).from(auditEvents).where(and(eq(auditEvents.entityId, promo!.id), eq(auditEvents.portalId, PORTAL))).orderBy(auditEvents.createdAt, auditEvents.id);

        expect((await events()).map((e) => e.action)).toEqual(["promotion.created"]);

        // Bookkeeping-only updates (a scrape that found the same content) leave no event.
        await tx.update(promotions).set({ lastSeenAt: new Date(), updatedAt: new Date() }).where(eq(promotions.id, promo!.id));
        expect((await events()).map((e) => e.action)).toEqual(["promotion.created"]);

        await tx.update(promotions).set({ title: "Edited title", contentHash: "h2" }).where(eq(promotions.id, promo!.id));
        await tx.update(promotions).set({ removedAt: new Date() }).where(eq(promotions.id, promo!.id));
        await tx.update(promotions).set({ removedAt: null }).where(eq(promotions.id, promo!.id));
        const all = await events();
        expect(all.map((e) => e.action)).toEqual(["promotion.created", "promotion.updated", "promotion.removed", "promotion.reappeared"]);
        // History keeps the label and values of the moment, not the current row.
        expect(all[0]!.label).toBe("Original title");
        expect(all[1]!.before).toMatchObject({ title: "Original title", content_hash: "h1" });
        expect(all[1]!.after).toMatchObject({ title: "Edited title", content_hash: "h2" });

        const brandEvents = await tx.select({ action: auditEvents.action }).from(auditEvents).where(eq(auditEvents.entityId, brand!.id));
        expect(brandEvents.map((e) => e.action)).toEqual(["brand.created"]);
        throw new Rollback();
      }),
    ).rejects.toBeInstanceOf(Rollback);
  });

  it("refuses to update or delete audit events", async () => {
    await expect(
      db.transaction(async (tx) => {
        const [event] = await tx.insert(auditEvents).values({ portalId: PORTAL, eventKey: `test:${Date.now()}`, action: "test.event", actor: "test", entityType: "test", entityId: "x", label: "x", message: "x" }).returning();
        // Drizzle wraps the database error; the trigger's message is on the cause.
        const appendOnly = (e: unknown) => /append-only/.test(String((e as { cause?: { message?: string } }).cause?.message ?? (e as Error).message));
        await expect(tx.transaction(async (sp) => sp.update(auditEvents).set({ message: "tampered" }).where(eq(auditEvents.id, event!.id)))).rejects.toSatisfy(appendOnly);
        await expect(tx.transaction(async (sp) => sp.delete(auditEvents).where(eq(auditEvents.id, event!.id)))).rejects.toSatisfy(appendOnly);
        throw new Rollback();
      }),
    ).rejects.toBeInstanceOf(Rollback);
  });

  it("keeps the overview's coverage tiles consistent with the listed inventory", async () => {
    const data = await overview(db, PORTAL, new Date(Date.now() - 7 * 86_400_000), new Date());
    expect(data.inventory.listingChecked + data.inventory.detailChecked + data.inventory.unverified).toBe(data.inventory.listed);
    const [row] = await db.execute(sql`select count(*)::int as n from promotions where portal_id=${PORTAL} and removed_at is null`);
    expect(data.inventory.listed).toBe(Number(row?.n));
  });
});
