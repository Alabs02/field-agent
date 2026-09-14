import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// Monorepo root, so `output: "standalone"` traces workspace files correctly.
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: repoRoot,
  transpilePackages: ["@field-agent/shared"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn-files.eu.placewise.com" },
      { protocol: "https", hostname: "www.engagementagents.com" },
    ],
  },
};

export default nextConfig;
