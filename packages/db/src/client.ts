import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export type Database = ReturnType<typeof createDb>["db"];

export interface DbOptions {
  /** Max pooled connections. Workers need few; the API a handful. */
  max?: number;
  /** Set for one-shot scripts (migrate/seed) so the process can exit. */
  onnotice?: (n: unknown) => void;
}

export function createDb(databaseUrl: string, opts: DbOptions = {}) {
  const sql = postgres(databaseUrl, {
    max: opts.max ?? 5,
    // Neon's pooler and pgbouncer disallow prepared statements; this keeps one code path.
    prepare: false,
    onnotice: opts.onnotice ?? (() => {}),
  });
  const db = drizzle(sql, { schema, casing: "snake_case" });
  return { db, sql, close: () => sql.end({ timeout: 5 }) };
}

export { schema };
