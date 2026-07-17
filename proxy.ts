import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@insforge/sdk/ssr/middleware";
// ponytail: middleware does cookie-based redirect hinting.
// Real auth+role enforcement happens in route-group layouts.
// Session refresh (updateSession) handles expired access tokens.

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

  // Capture cookie state BEFORE session refresh (refresh may clear request cookies)
  const hasToken = request.cookies.has("insforge_access_token");
  const roleCookie = request.cookies.get("user_role")?.value;
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r));
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  // ── Landing page: redirect authenticated users to their dashboard ──
  if (pathname === "/") {
    if (!hasToken) return NextResponse.next();
    if (roleCookie && ROLE_REDIRECTS[roleCookie]) {
      return NextResponse.redirect(new URL(ROLE_REDIRECTS[roleCookie], request.url));
    }
    return NextResponse.next(); // rare: has token but no role cookie
  }

  // ── Auth routes: redirect authenticated users to their dashboard ──
  if (isAuthRoute && hasToken) {
    if (roleCookie && ROLE_REDIRECTS[roleCookie]) {
      return NextResponse.redirect(new URL(ROLE_REDIRECTS[roleCookie], request.url));
    }
  }

  // ── Protected routes: redirect unauthenticated to login ──
  if (isProtected && !hasToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Session refresh: exchanges expired access token for fresh one ──
  const response = NextResponse.next({ request });
  // ponytail: cast needed — Next.js RequestCookies has different set() overloads than SDK CookieStore
  await updateSession({
    requestCookies: request.cookies as never,
    responseCookies: response.cookies as never,
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
