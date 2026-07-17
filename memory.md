# Memory — Admin Departments Real Data + Anim Fix

Last updated: 2026-07-18

## What was built

- **`app/admin/departments/page.tsx`** — rewritten as Server Component: fetches departments + active adviser/treasurer users from InsForge, maps names, passes `initialDepartments` to client component
- **`components/admin/DepartmentDetailClient.tsx`** (new) — client wrapper with tabs (Users/Events/Reports/Audit Logs), real user deactivate/reactivate via `setUserAccountStatus`, loading states, error banner, responsive table/cards, GSAP stagger-in. Events/Reports/Audit tabs show empty states until those phases land
- **`app/admin/departments/[departmentId]/page.tsx`** — rewritten as Server Component: fetches department + users by ID, `notFound()` on missing department, renders `<DepartmentDetailClient>`
- **`actions/departments.ts`** — three Server Actions (`createDepartment`, `setDepartmentActive`, `setUserAccountStatus`), all guarded by `requireRole("admin")` with audit logs

## Decisions made (locked)

- **Server Actions return `{ success, department }`** — `createDepartment` returns the new department object so the client can optimistically append to local state without waiting for revalidation
- **User status transitions: active ↔ deactivated only** — `pending_approval`/`rejected` users cannot be toggled from admin; the Server Action validates transitions server-side
- **Has-active flags are derived at query time** — `has_active_adviser`/`has_active_treasurer` computed from users table, not stored on departments

## Problems solved

- **New department didn't appear after creation** — `createDepartment` now returns `{ success, department }`, client optimistically appends `result.department` to local state with `setDepartments(prev => [...prev, ...])` then calls `router.refresh()` in background for server consistency
- **Cards re-animated on every keystroke/click** — `useEffect` depended on `[filtered]` (a new array reference every render), so every search keystroke triggered GSAP stagger-in. Fixed: `useRef` guard + `[]` dependency; stagger runs once on mount only
- **Investigated: mobile auth failure on create department** — traced through `createServerClient` SSR source (`node_modules/@insforge/sdk/dist/ssr.mjs`). Our custom `cookies: { get: ... }` wrapper in `lib/insforge-server.ts` returns `string | null` which matches SDK's expected interface. Root cause not confirmed — may be unrelated to cookie shape

## Current state

- Build passes: `tsc --noEmit` clean
- Admin departments list page: renders real data, create works with instant UI update, search filters client-side
- Admin department detail page: renders real data, user deactivate/reactivate works, tabs wired (Events/Reports/Audit show empty states)
- Animation: stagger-in runs once on mount only, no re-trigger on search/type/click
- Mobile create: functional but still under investigation for auth failure on some devices

## Next session starts with

**Resolve mobile auth failure on department create.** Two paths remaining:
1. Verify whether `createServerClient` fails silently on expired tokens — `createServerClient` does not auto-refresh (unlike `createBrowserClient`). The `updateSession` in `proxy.ts` is supposed to handle this, but only runs on requests that pass through the proxy.
2. Test whether Server Action POSTs always get intercepted by `proxy.ts` — if not, the server client gets a stale/expired access token and `getCurrentUser()` returns `{ user: null }`, causing `requireRole` to throw "Authentication required".

## Open questions

- Does `proxy.ts` intercept all Server Action POST requests in Next.js 16? If not, expired tokens in Server Actions would bypass session refresh.
- Does the mobile-specific failure correlate with iOS Safari cookie restrictions or a specific browser?
