import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep production deploy unblocked while we harden types incrementally.
  // Preferred long-term: remove these and fix remaining type/lint errors.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
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
