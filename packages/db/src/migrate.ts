import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { createDb } from "./client.js";

/**
 * Locate the committed migrations folder whether we run from source (tsx),
 * from the api bundle (dist/), or from a Docker image that copies
 * packages/db/drizzle next to the bundle.
 */
export function resolveMigrationsFolder(): string {
  const explicit = process.env.MIGRATIONS_DIR;
  if (explicit && existsSync(explicit)) return explicit;
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "../drizzle"), // packages/db/src -> packages/db/drizzle
    resolve(here, "../../drizzle"),
    resolve(here, "./drizzle"), // apps/api/dist/drizzle (copied at image build)
    resolve(process.cwd(), "drizzle"),
    resolve(process.cwd(), "packages/db/drizzle"),
  ];
  const found = candidates.find((c) => existsSync(c));
  if (!found) throw new Error(`migrations folder not found; tried ${candidates.join(", ")}`);
  return found;
}

export async function runMigrations(databaseUrl: string): Promise<number> {
  const { db, close } = createDb(databaseUrl, { max: 1 });
  try {
    const migrationsFolder = resolveMigrationsFolder();
    await migrate(db, { migrationsFolder });
    return 1;
  } finally {
    await close();
  }
}
