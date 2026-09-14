import { desc, eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { htmlSnapshots } from "../schema/index.js";

export type SnapshotKind = (typeof htmlSnapshots.$inferSelect)["kind"];

export interface SnapshotWrite {
  portalId: string;
  runId: string | null;
  kind: SnapshotKind;
  url: string;
  finalUrl: string;
  httpStatus: number;
  sha256: string;
  etag: string | null;
  lastModified: string | null;
  body: string;
}

export async function latestSnapshot(db: Database, url: string) {
  return db.query.htmlSnapshots.findFirst({
    where: eq(htmlSnapshots.url, url),
    orderBy: [desc(htmlSnapshots.fetchedAt)],
    columns: { sha256: true, etag: true, lastModified: true, body: true, fetchedAt: true },
  });
}

/** Insert only when this exact body has not been stored for this url. */
export async function saveSnapshot(db: Database, s: SnapshotWrite): Promise<boolean> {
  const rows = await db.insert(htmlSnapshots).values(s).onConflictDoNothing().returning({ id: htmlSnapshots.id });
  return rows.length > 0;
}
