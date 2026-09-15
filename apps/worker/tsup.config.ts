import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  target: "node22",
  platform: "node",
  sourcemap: true,
  clean: true,
  splitting: false,
  noExternal: [/^@field-agent\//],
  // Playwright is an optional engine; never bundle it, never require it at boot.
  external: ["playwright"],
  // @field-agent/scraper pulls got-scraping → http2-wrapper, a CommonJS module
  // that does `require("http2")` at load. Bundled into ESM, esbuild's shim
  // throws "Dynamic require of "http2" is not supported" unless a real
  // `require` exists in module scope. Found in production on Node 22.23.
  banner: { js: 'import { createRequire as __fa_createRequire } from "node:module"; const require = __fa_createRequire(import.meta.url);' },
});
