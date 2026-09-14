/**
 * One-off, throttled capture of real portal pages into test/fixtures.
 * These are the "snapshot on first run" the brief asks for, committed so the
 * parsers are tested against real markup and a structure change is diffable.
 *
 *   pnpm --filter @field-agent/scraper fixtures:capture
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HttpEngine } from "../src/engines/http.js";
import { MemoryThrottle } from "../src/throttle.js";
import { makeCanonicalizer } from "../src/url.js";

const BASE = "https://www.thepromenadeshopsatbriargate.com";
const UA = "FieldAgentBot/0.1 (+https://github.com/Alabs02/field-agent; alabson.inc@gmail.com)";
const DELAY_MS = Number(process.env.SCRAPE_MIN_DELAY_MS ?? 2000);

const targets: Array<[string, string]> = [
  ["robots.txt", "/robots.txt"],
  ["sitemap.xml", "/sitemap.xml"],
  ["listing.html", "/sales/"],
  ["directory.html", "/directory/"],
  ["deal-3444509.html", "/deals/3444509/"],
  ["store-1035999-altard-state.html", "/stores/1035999-altard-state/"],
  ["store-1035965-chicos.html", "/stores/1035965-chicos/"],
];

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../test/fixtures");
const canonicalize = makeCanonicalizer(BASE);
const engine = new HttpEngine({ userAgent: UA, timeoutMs: 20_000 });
const throttle = new MemoryThrottle(DELAY_MS);

await mkdir(outDir, { recursive: true });
for (const [file, path] of targets) {
  const url = canonicalize(path);
  await throttle.acquire(new URL(url).hostname);
  const res = await engine.fetchHtml(url, { kind: "listing" });
  await writeFile(resolve(outDir, file), res.body, "utf8");
  console.log(`${res.status} ${url} -> ${file} (${res.body.length} bytes)`);
}
await engine.close();
