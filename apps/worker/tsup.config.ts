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
});
