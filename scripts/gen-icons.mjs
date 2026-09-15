// Rasterise apps/web/src/app/icon.svg into the PNG sizes the App Router icon
// conventions and Apple want, using the Playwright browser the scraper already
// depends on. Run from the repo root: node scripts/gen-icons.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = join(root, "apps", "web", "src", "app");
const require = createRequire(join(root, "packages", "scraper", "package.json"));
const { chromium } = require("playwright");

const svg = await readFile(join(appDir, "icon.svg"), "utf8");
const targets = [
  { file: join(appDir, "icon.png"), size: 32 },
  { file: join(appDir, "apple-icon.png"), size: 180 },
  { file: join(root, "docs", "brand", "field-agent-icon-512.png"), size: 512 },
];

// Prefer Playwright's own build; fall back to an installed Chrome or Edge so the
// script works on a machine that never ran `playwright install`.
const browser = await chromium.launch().catch(async () => chromium.launch({ channel: "chrome" }).catch(() => chromium.launch({ channel: "msedge" })));
try {
  for (const { file, size } of targets) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`)}</body></html>`);
    const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, png);
    console.log(`${file} (${size}x${size}, ${png.length} bytes)`);
    await page.close();
  }
} finally {
  await browser.close();
}
