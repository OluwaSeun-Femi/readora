import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The SPEC's /members page now lives in the librarian area.
  async redirects() {
    return [{ source: "/members", destination: "/admin/members", permanent: false }];
  },
};

export default nextConfig;
