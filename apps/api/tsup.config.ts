import { defineConfig } from "tsup";

export default defineConfig({
  entry: { server: "src/server.ts", cli: "src/cli.ts" },
  format: ["esm"],
  target: "node22",
  platform: "node",
  sourcemap: true,
  clean: true,
  splitting: false,
  // Workspace packages are just-in-time TypeScript; bundle them, keep real deps external.
  noExternal: [/^@field-agent\//],
});
