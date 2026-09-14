import { and, desc, eq, inArray } from "drizzle-orm";
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

/** Newest first across both run types, paginated in memory (tens of rows per portal). */
export async function listRuns(db: Database, portalId: string, q: RunsQuery): Promise<{ items: RunListItem[]; total: number }> {
  const all: RunListItem[] = [];
  if (q.type !== "verify") {
    const rows = await db.query.scrapeRuns.findMany({ where: eq(scrapeRuns.portalId, portalId), orderBy: [desc(scrapeRuns.queuedAt)], limit: 500 });
    all.push(...rows.map(scrapeRunToApi));
  }
  if (q.type !== "scrape") {
    const rows = await db.query.verificationRuns.findMany({ where: eq(verificationRuns.portalId, portalId), orderBy: [desc(verificationRuns.queuedAt)], limit: 500 });
    all.push(...rows.map(verificationRunToApi));
  }
  all.sort((a, b) => (a.queuedAt < b.queuedAt ? 1 : a.queuedAt > b.queuedAt ? -1 : 0));
  const start = (q.page - 1) * q.pageSize;
  return { items: all.slice(start, start + q.pageSize), total: all.length };
}
