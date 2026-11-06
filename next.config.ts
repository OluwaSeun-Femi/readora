import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // Librarians can upload a book's text (.txt, up to 4 MB) as an e-book.
    serverActions: { bodySizeLimit: "5mb" },
  },
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
