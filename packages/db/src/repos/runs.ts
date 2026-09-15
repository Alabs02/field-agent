import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { RunListItem, RunsQuery, ScrapeOptions } from "@field-agent/shared";
import type { Database } from "../client.js";
import { scrapeRuns, verificationRuns } from "../schema/index.js";
import { scrapeRunToApi, verificationRunToApi, type ScrapeRunRow, type VerificationRunRow } from "./mappers.js";

const ACTIVE = ["queued", "running"] as const;

export async function createScrapeRun(
  db: Database,
  input: { portalId: string; triggeredBy: string | null; options: ScrapeOptions },
): Promise<ScrapeRunRow> {
  const [row] = await db
    .insert(scrapeRuns)
    .values({ portalId: input.portalId, triggeredBy: input.triggeredBy, options: input.options })
    .returning();
  return row!;
}

export async function findActiveScrapeRun(db: Database, portalId: string): Promise<ScrapeRunRow | undefined> {
  return db.query.scrapeRuns.findFirst({
    where: and(eq(scrapeRuns.portalId, portalId), inArray(scrapeRuns.status, [...ACTIVE])),
    orderBy: [desc(scrapeRuns.queuedAt)],
  });
}

export async function getScrapeRun(db: Database, id: string): Promise<ScrapeRunRow | undefined> {
  return db.query.scrapeRuns.findFirst({ where: eq(scrapeRuns.id, id) });
}

export type ScrapeRunPatch = Partial<
  Pick<
    ScrapeRunRow,
    | "status"
    | "phase"
    | "progress"
    | "attemptsMade"
    | "attempted"
    | "persisted"
    | "updated"
    | "skipped"
    | "failed"
    | "brandsAttempted"
    | "brandsFailed"
    | "requestsMade"
    | "errors"
    | "error"
    | "startedAt"
    | "heartbeatAt"
    | "finishedAt"
  >
>;

export async function updateScrapeRun(db: Database, id: string, patch: ScrapeRunPatch): Promise<void> {
  await db.update(scrapeRuns).set(patch).where(eq(scrapeRuns.id, id));
}

export async function createVerificationRun(
  db: Database,
  input: { portalId: string; triggeredBy: string | null; sampleRate: number; promotionIds?: string[] },
): Promise<VerificationRunRow> {
  const [row] = await db
    .insert(verificationRuns)
    .values({
      portalId: input.portalId,
      triggeredBy: input.triggeredBy,
      sampleRate: input.sampleRate,
      options: input.promotionIds ? { promotionIds: input.promotionIds } : {},
    })
    .returning();
  return row!;
}

export async function findActiveVerificationRun(db: Database, portalId: string): Promise<VerificationRunRow | undefined> {
  return db.query.verificationRuns.findFirst({
    where: and(eq(verificationRuns.portalId, portalId), inArray(verificationRuns.status, [...ACTIVE])),
    orderBy: [desc(verificationRuns.queuedAt)],
  });
}

export async function getVerificationRun(db: Database, id: string): Promise<VerificationRunRow | undefined> {
  return db.query.verificationRuns.findFirst({ where: eq(verificationRuns.id, id) });
}

export type VerificationRunPatch = Partial<
  Pick<
    VerificationRunRow,
    | "status"
    | "attemptsMade"
    | "checked"
    | "clean"
    | "changed"
    | "missing"
    | "unverifiable"
    | "requestsMade"
    | "errors"
    | "error"
    | "startedAt"
    | "heartbeatAt"
    | "finishedAt"
  >
>;

export async function updateVerificationRun(db: Database, id: string, patch: VerificationRunPatch): Promise<void> {
  await db.update(verificationRuns).set(patch).where(eq(verificationRuns.id, id));
}

/** Pagination and totals cover both tables in SQL, with a stable ID tie-breaker. */
export async function listRuns(db: Database, portalId: string, q: RunsQuery): Promise<{ items: RunListItem[]; total: number }> {
  const union = sql`(select id, 'scrape' as type, status, queued_at from scrape_runs where portal_id=${portalId}
    union all select id, 'verify' as type, status, queued_at from verification_runs where portal_id=${portalId}) r`;
  const where = sql`true ${q.type ? sql`and type=${q.type}` : sql``} ${q.status ? sql`and status=${q.status}` : sql``}
    ${q.from ? sql`and queued_at >= ${q.from}::timestamptz` : sql``} ${q.to ? sql`and queued_at <= ${q.to}::timestamptz` : sql``}`;
  const [total] = await db.execute(sql`select count(*)::int as n from ${union} where ${where}`);
  const page = await db.execute(sql`select id,type from ${union} where ${where} order by queued_at desc,id desc limit ${q.pageSize} offset ${(q.page-1)*q.pageSize}`);
  const ids = page.map(row => String(row.id));
  if (!ids.length) return { items: [], total: Number(total?.n ?? 0) };
  const [scrapes, verifies] = await Promise.all([
    db.select().from(scrapeRuns).where(inArray(scrapeRuns.id, ids)),
    db.select().from(verificationRuns).where(inArray(verificationRuns.id, ids)),
  ]);
  const byId = new Map<string, RunListItem>([...scrapes.map(scrapeRunToApi), ...verifies.map(verificationRunToApi)].map(row => [row.id, row]));
  return { items: ids.map(id => byId.get(id)!), total: Number(total?.n ?? 0) };
}
