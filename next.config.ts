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
      // Fully prefetched routes (EventCard/FolderCard/NavItem warm on
      // viewport entry) are then cache-served for 5 min — one DB read per
      // page per window instead of one per open. router.refresh() after
      // every mutation and EventLiveRefresh keep this fresh.
      static: 300,
    },
  },
};

export default nextConfig;
