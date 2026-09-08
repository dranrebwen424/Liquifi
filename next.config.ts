import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      // Client router cache: repeat navigations within 30s render instantly
      // instead of re-running every DB query. router.refresh() (after every
      // mutation in the app) and hard reloads always bypass this — same-device
      // freshness is unchanged. (default dynamic: 0 — every click re-fetches
      // the server; this was the "loads first every time I open a page" problem.)
      dynamic: 30,
      // Fully statically prefetched routes are cache-served for the same short
      // window. Dynamic routes only prefetch the loading shell, so there is no
      // DB fan-out at mount — data is fetched fresh on navigation.
      static: 30,
    },
  },
};

export default nextConfig;
