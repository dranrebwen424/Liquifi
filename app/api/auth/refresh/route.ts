import { createRefreshAuthRouter } from "@insforge/sdk/ssr";
import { REFRESH_COOKIE_MAX_AGE } from "@/lib/session";

export const { POST } = createRefreshAuthRouter({
  // Keep the refresh cookie persistent on client-side auto-refresh too —
  // matches the sliding window pinned in proxy.ts and the login route.
  options: { refreshToken: { maxAge: REFRESH_COOKIE_MAX_AGE } },
});
