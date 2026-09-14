import { BRIARGATE_PORTAL } from "@field-agent/shared";
import { createDb } from "../client.js";
import { applyDrift, undoDrift } from "../drift.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
const undo = process.argv.includes("--undo");
const { db, close } = createDb(url, { max: 1 });
try {
  if (undo) {
    const n = await undoDrift(db, BRIARGATE_PORTAL.id);
    console.log(`drift undone on ${n} row(s)`);
  } else {
    const { applied } = await applyDrift(db, BRIARGATE_PORTAL.id, BRIARGATE_PORTAL.baseUrl);
    for (const a of applied) console.log(`${a.label}: "${a.title}" (${a.sourceId})`);
    console.log("now run: curl -s -X POST http://localhost:4000/verify");
  }
} finally {
  await close();
}
