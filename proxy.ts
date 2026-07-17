import { NextResponse, type NextRequest } from "next/server";
// ponytail: middleware just does cookie-based redirect hinting.
// Real auth+role enforcement happens in route-group layouts.

const AUTH_ROUTES = ["/login", "/signup", "/otp", "/forgot-password", "/change-password", "/pending-approval"];
const PROTECTED_PREFIXES = ["/treasurer", "/adviser", "/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Public routes — skip ──────────────────────────────────────
  if (pathname === "/" || pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  // ── Check for an existing auth session via cookie ─────────────
  const hasToken = request.cookies.has("insforge_access_token");

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r));
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  // Auth route + already logged in → landing
  if (isAuthRoute && hasToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protected route + no token → login
  if (isProtected && !hasToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
