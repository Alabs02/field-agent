import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@field-agent/shared"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn-files.eu.placewise.com" },
      { protocol: "https", hostname: "www.engagementagents.com" },
    ],
  },
};

export default nextConfig;
