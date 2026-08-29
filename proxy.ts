import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@insforge/sdk/ssr/middleware";
import { REFRESH_COOKIE_MAX_AGE } from "@/lib/session";

// Session refresh happens FIRST (below) so redirect decisions use the REAL
// post-refresh auth state, not the stale pre-refresh cookie state. Without
// this, closing/reopening the browser clears or expires the access-token
// cookie while the 2-day refresh cookie survives — the proxy then sees "no
// token" and bounces an actually-logged-in user to /login until they refresh
// the page (by which time the refreshed access token is a cookie again).

const AUTH_ROUTES = ["/login", "/signup", "/otp", "/forgot-password", "/change-password", "/pending-approval"];
const PROTECTED_PREFIXES = ["/treasurer", "/adviser", "/admin"];
const ROLE_REDIRECTS: Record<string, string> = {
  treasurer: "/treasurer/home",
  adviser: "/adviser/home",
  admin: "/admin/departments",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Public assets — skip (no auth needed) ──
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  // ── Session refresh FIRST — exchanges expired/missing access token for a
  //    fresh one using the persistent refresh token. `accessToken` reflects
  //    the user's true session state after the refresh: non-null means the
  //    user is still logged in (sliding 2-day window), null means no session. ──
  const response = NextResponse.next({ request });
  const { accessToken } = await updateSession({
    requestCookies: request.cookies as never,
    responseCookies: response.cookies as never,
    // Pin the refresh cookie to the sliding window — without this the SDK
    // writes it as a browser-session cookie and users get logged out on close.
    options: { refreshToken: { maxAge: REFRESH_COOKIE_MAX_AGE } },
  });

  const authenticated = accessToken !== null;
  const roleCookie = request.cookies.get("user_role")?.value;
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r));
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  // ── Landing page: redirect authenticated users to their dashboard ──
  if (pathname === "/") {
    if (!authenticated) return response;
    if (roleCookie && ROLE_REDIRECTS[roleCookie]) {
      return NextResponse.redirect(new URL(ROLE_REDIRECTS[roleCookie], request.url));
    }
    return response; // rare: session but no role cookie yet
  }

  // ── Auth routes: redirect authenticated users to their dashboard ──
  if (isAuthRoute && authenticated) {
    if (roleCookie && ROLE_REDIRECTS[roleCookie]) {
      return NextResponse.redirect(new URL(ROLE_REDIRECTS[roleCookie], request.url));
    }
  }

  // ── Protected routes: redirect unauthenticated to login ──
  if (isProtected && !authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
