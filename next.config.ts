import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      // Client router cache: primary-nav prefetches and repeat navigations
      // within 30s render instantly instead of re-running every DB query.
      // router.refresh() (after every mutation in the app) and hard reloads
      // always bypass this — same-device freshness is unchanged.
      // (default dynamic: 0 — every click re-fetches the server; this was the
      // "loads first every time I open a page" problem.)
      dynamic: 30,
      // Explicitly prefetched links otherwise use Next's 5-minute static
      // default. Financial pages need the same short freshness window.
      static: 30,
    },
  },
};

export default nextConfig;
