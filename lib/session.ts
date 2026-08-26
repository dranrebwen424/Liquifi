// Sliding session window — every session refresh (proxy navigation, client
// auto-refresh) re-pins the refresh-token cookie to this duration, so an
// active user stays logged in and only ~2 days of total inactivity logs out.
export const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 2; // 2 days

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: REFRESH_COOKIE_MAX_AGE,
} as const;
