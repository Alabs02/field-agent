export { createDb, schema } from "./client.js";
export type { Database } from "./client.js";
export { runMigrations, resolveMigrationsFolder } from "./migrate.js";
export { seedPortals } from "./seed/portals.js";
export * as tables from "./schema/index.js";
