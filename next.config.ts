import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents disabled — conflicts with route segment configs
  // and several App Router patterns on Next 16 during production build
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
