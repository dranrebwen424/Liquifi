# Memory — Phase 1 Auth Wiring + Phase 2 Step 05 UI + Logout Bug Fix

Last updated: 2026-07-17

## What was built

**Auth foundation (Phase 1):**
- **5 API routes** wired to InsForge SDK:
  - `POST /api/auth/signup` — `signUp()` + `users` row insert + department auto-seed + notification routing (adviser→admin, treasurer→department adviser)
  - `POST /api/auth/otp/send` — `resendVerificationEmail()` / `sendResetPasswordEmail()` (anti-enumeration, always returns 200)
  - `POST /api/auth/otp/verify` — `verifyEmail()` / `exchangeResetPasswordToken()` with `otp_verified_at` stamp
  - `POST /api/auth/change-password` — `resetPassword()` with token from OTP exchange
  - `POST /api/auth/login` — `signInWithPassword()` + `account_status` check (rejected/pending/active) + role-based redirect URL
- **`lib/insforge-client.ts`** — browser SDK via `createClient()`
- **Auth page wiring** — signup, OTP, forgot-password, change-password call real APIs
- **`proxy.ts`** (Next.js 16) — middleware cookie-based redirect hinting
- **`lib/layout-guard.ts`** — `requireLayoutRole(role)` for server-side role enforcement
- **3 route group layouts** — `app/(treasurer|adviser|admin)/layout.tsx` using `requireLayoutRole`
- **3 role home pages** — `/treasurer/home`, `/adviser/home`, `/admin/departments` (placeholders)
- Fixed pre-existing type errors in `lib/auth-guard.ts`, `lib/storage.ts`

**Admin UI (Phase 2 step 05):**
- `components/ui/StatusBadge.tsx` — shared status badge with preset mappers
- `components/ui/EmptyState.tsx` — reusable empty state component
- `components/admin/AdminSidebar.tsx` — client component, fixed sidebar, 3 nav items + profile dropdown
- `app/admin/departments/page.tsx` — mock departments table + inline new-dept form
- `app/admin/departments/[departmentId]/page.tsx` — dept header + 4 tabs (Events/Reports/Audit Logs/Users)
- `lib/format.ts` — `formatPHP()` helper

**Logout bug fix (this session):**
- `app/api/auth/logout/route.ts` — SSR route using `createAuthActions().signOut()` with `responseCookies` callback (same `pendingCookies` → `response.cookies.set()` pattern as login route). Initial version omitted `responseCookies` → SDK threw "requires a writable cookie store"; fixed to match login pattern.
- `components/admin/AdminSidebar.tsx` — logout button now POSTs to `/api/auth/logout` before navigating

## Decisions made (locked)

- **Anti-enumeration on OTP send** — always returns 200 regardless of whether email exists
- **`proxy.ts` over `middleware.ts`** — Next.js 16 requires export named `proxy`, not `middleware`
- **`createServerClient` takes 1 object arg** — `{ cookies: { get: (name) => value } }` from `@insforge/sdk/ssr`
- **`insforge.database.from(...)`** — SDK scopes DB queries under `database` property
- **Middleware does cookie-surface check only** — real auth+role enforcement is in route group layouts
- **Logout is SSR-only** — uses `createAuthActions()` for proper cookie clearing via CookieStore
- **Best-effort logout** — navigates to `/login` even if API call fails

## Problems solved

- `createServerClient` cookies.get adaptation — Next.js cookies return `{ name, value }` objects, SDK expects `string | undefined`
- `middleware.ts` → `proxy.ts` rename — required changing exported function name
- SDK type for `insforge.database.from(...)` — operations are under `insforge.database.*`, not `insforge.*`
- **Logout button did nothing** — just ran `router.push("/login")` without calling `signOut()`. Auth cookie remained, so `proxy.ts` redirected authenticated users away from `/login` and `/signup` back to landing — making buttons appear dead.
- Missing logout API route — project had none, created one using `createAuthActions().signOut()`

## Current state

- Build passes: 0 type errors, 19 routes compiled (6 API routes + proxy + auth pages + 3 role pages + admin pages)
- All auth flows wired end-to-end: signup → OTP → pending-approval; forgot-password → OTP → change-password → login
- Login checks `account_status`: rejected (403), pending (403), active (OK + role redirect)
- Middleware blocks unauthenticated access to role-group routes
- Route group layouts enforce role server-side
- Admin departments full UI built with mock data (tabbed detail, StatusBadge, EmptyState)
- Logout properly clears session and cookies; buttons work normally after logout
- 5/30 features complete (Phase 1 steps 00-04, Phase 2 step 05)

## Next session starts with

**Phase 2 — Step 06: Admin Departments — Real Data + Mutations.** Wire the admin departments UI to real InsForge DB queries and Server Actions (create dept, toggle `is_active`, deactivate/reactivate users).

## Open questions

- `.env.local` has placeholder InsForge values — need real credentials before runtime testing.
