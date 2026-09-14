/**
 * Operational subcommands bundled with the API image so compose and Railway
 * can run them without a separate toolchain:
 *
 *   node dist/cli.js migrate      apply committed migrations
 *   node dist/cli.js seed         seed the portal row (and demo users once auth lands)
 *   node dist/cli.js migrate seed both, in order
 *   node dist/cli.js drift        edit a few persisted rows so the next verify has discrepancies
 *   node dist/cli.js undrift      restore them
 */
import { applyDrift, createDb, runMigrations, seedPortals, undoDrift } from "@field-agent/db";
import { BRIARGATE_PORTAL } from "@field-agent/shared";
import { loadEnv } from "./env.js";

const env = loadEnv();
const commands = process.argv.slice(2);
if (commands.length === 0) {
  console.error("usage: cli <migrate|seed|drift|undrift> [...]");
  process.exit(2);
}

for (const cmd of commands) {
  switch (cmd) {
    case "migrate": {
      await runMigrations(env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL);
      console.log("[cli] migrations applied");
      break;
    }
    case "seed": {
      const { db, close } = createDb(env.DATABASE_URL, { max: 1 });
      try {
        await seedPortals(db);
        console.log("[cli] seeded portal", env.PORTAL_ID);
      } finally {
        await close();
      }
      break;
    }
    case "drift":
    case "undrift": {
      const { db, close } = createDb(env.DATABASE_URL, { max: 1 });
      try {
        if (cmd === "drift") {
          const { applied } = await applyDrift(db, BRIARGATE_PORTAL.id, BRIARGATE_PORTAL.baseUrl);
          for (const a of applied) console.log(`[cli] ${a.label}: "${a.title}" (${a.sourceId})`);
          console.log("[cli] now POST /verify and open the report");
        } else {
          console.log(`[cli] drift undone on ${await undoDrift(db, BRIARGATE_PORTAL.id)} row(s)`);
        }
      } finally {
        await close();
      }
      break;
    }
    default:
      console.error(`[cli] unknown command: ${cmd}`);
      process.exit(2);
  }
}
process.exit(0);
