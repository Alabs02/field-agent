#!/usr/bin/env node
/**
 * pnpm bootstrap — local development without running the apps in Docker.
 *
 *   1. starts Postgres and Redis with docker compose (only those two)
 *   2. creates .env from .env.example if it is missing
 *   3. applies migrations, seeds the portal row and the five demo accounts
 *   4. prints the demo credentials and the next command
 *
 * Idempotent: run it again whenever the datastores were reset.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function step(title) {
  console.log(`\n\x1b[1;35m▸ ${title}\x1b[0m`);
}
function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, ...env } });
  if (r.status !== 0) {
    console.error(`\n${cmd} ${args.join(" ")} failed (exit ${r.status ?? "signal"})`);
    process.exit(r.status ?? 1);
  }
}
function parseDotenv(file) {
  const out = {};
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

step("Docker: Postgres and Redis only");
const dockerOk = spawnSync("docker", ["compose", "version"], { cwd: root, stdio: "ignore", shell: process.platform === "win32" }).status === 0;
if (!dockerOk) {
  console.error("docker compose is not available. Install Docker Desktop, or point DATABASE_URL and REDIS_URL in .env at your own instances and re-run.");
  process.exit(1);
}
run("docker", ["compose", "up", "-d", "--wait", "postgres", "redis"]);

step(".env");
const envFile = path.join(root, ".env");
if (existsSync(envFile)) {
  console.log(".env exists; leaving it alone");
} else {
  copyFileSync(path.join(root, ".env.example"), envFile);
  console.log("created .env from .env.example (localhost:5433 Postgres, localhost:6380 Redis, AUTH_REQUIRED=false)");
}
const env = parseDotenv(envFile);

step("Migrate and seed");
run(pnpm, ["--filter", "api", "cli", "migrate", "seed"], env);

console.log(`
Next:

  pnpm dev                       api :4000 · worker · web :3000
  open http://localhost:3000/app and press "Scrape" on the Runs page (or: curl -X POST localhost:4000/scrape)

  pnpm demo:credentials          print the table above again
  pnpm demo:drift                edit a few stored rows, then verify to see the discrepancy report
`);
