import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      // Client router cache: repeat navigations within 30s render instantly
      // from the client cache instead of re-running every DB query.
      // router.refresh() (after every mutation in the app) and hard reloads
      // always bypass this — same-device freshness is unchanged.
      // (default dynamic: 0 — every click re-fetches the server; this was the
      // "loads first every time I open a page" problem.)
      dynamic: 30,
    },
  },
};

export default nextConfig;