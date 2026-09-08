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
      // Fully prefetched routes (event detail links use prefetch — viewport
      // scheduler warms full RSC) are cache-served for the 5-minute default
      // snapshot. EventLiveRefresh runs one silent refresh after a cached
      // open, and realtime + router.refresh() stay authoritative, so stale
      // exposure is bounded. (Next default static: 300s.)
      static: 300,
    },
  },
};

export default nextConfig;
