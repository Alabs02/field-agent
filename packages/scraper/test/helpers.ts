import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeCanonicalizer } from "../src/url.js";

const here = dirname(fileURLToPath(import.meta.url));

export const BASE = "https://www.thepromenadeshopsatbriargate.com";
export const TZ = "America/Denver";
export const canonicalize = makeCanonicalizer(BASE);

export function fixture(name: string): string {
  return readFileSync(resolve(here, "fixtures", name), "utf8");
}
