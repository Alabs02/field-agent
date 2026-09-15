import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Application-authored copy avoids em dashes and bare placeholder glyphs: a missing value reads
 * as "Not available" or "Not checked", never "—". Source evidence (scraped text, before/after
 * values) is exempt because it is rendered verbatim. The marketing lander is a separate brief.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SCAN = [join(ROOT, "apps", "web", "src", "app", "app"), join(ROOT, "apps", "web", "src", "components"), join(ROOT, "apps", "web", "src", "lib"), join(ROOT, "apps", "api", "src"), join(ROOT, "apps", "worker", "src")];
const SKIP = [join("components", "marketing"), join("app", "app", "page.tsx.bak")];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|mts)$/.test(name)) out.push(full);
  }
  return out;
}

describe("copy policy", () => {
  it("has no em dashes in application-authored copy", () => {
    const offenders: string[] = [];
    for (const dir of SCAN) {
      for (const file of walk(dir)) {
        const rel = relative(ROOT, file);
        if (SKIP.some((s) => rel.includes(s))) continue;
        const lines = readFileSync(file, "utf8").split("\n");
        lines.forEach((line, i) => {
          // Comments may use any punctuation; only strings and JSX text reach a person.
          const code = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
          if (code.includes("—")) offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});
