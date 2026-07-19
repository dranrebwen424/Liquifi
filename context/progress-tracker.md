# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 5 — Treasurer: Logging Entries
**Last completed:** 10 + 11 + 12 Treasurer Events & Budget — Full UI + Real Data & Mutations
**Next:** 13 Entry Logging — Full UI
**Status:** Steps 10-12 complete — Treasurer layout (sidebar + mobile bottom nav), events list with real data from InsForge, event creation wired to Server Action (createEvent), event dashboard with full entry list, BudgetSummary, LockedBanner, EntryRow/EntryList components. Query layer (lib/queries/events.ts) computes total_spent, budget_locked, and is_locked at query time. Step 13 complete — Entry Logging full UI (ReceiptUpload, ReceiptReview modal/sheet, ManualEntryForm, method-toggle page). All components use mock data; no real API wiring yet. Build passes clean.

---

## Progress

### Phase 0 — Authorization Foundation

- [x] 00 Route × Role × Precondition Matrix

### Phase 1 — Foundation

- [x] 01 Landing + Auth Shell
- [x] 02 Database Schema
- [x] 03 Auth — Signup, OTP, Approval Routing
- [x] 04 Login, Session, Role-Based Redirect

### Phase 2 — Admin: Departments & Approvals

- [x] 05 Admin Departments Page — Full UI
- [x] 06 Admin Departments — Real Data + Mutations
- [x] 07 Admin Approvals — Adviser Signups

### Phase 3 — Adviser: Approvals

- [x] 08 Adviser Approvals Page — Full UI
- [x] 09 Adviser Approvals — Real Data + Mutations

### Phase 4 — Treasurer: Events & Budget

- [x] 10 Treasurer Home + Event Creation — Full UI
- [x] 11 Event Creation + Budget Lock — Real Data
- [x] 12 Event Dashboard — Full UI

### Phase 5 — Treasurer: Logging Entries

- [x] 13 Entry Logging — Full UI
- [ ] 14 Receipt Parsing — OpenRouter Integration
- [ ] 15 Receipt Confirm / Discard + Budget Deduction
- [ ] 16 Manual (No-Receipt) Entry Submission

### Phase 6 — Voiding & Overspend

- [ ] 17 Void Entry — Full UI + Logic
- [ ] 18 Overspend Explanation Flow

### Phase 7 — Reports: Generation

- [ ] 19 Report Generation — Full UI
- [ ] 20 Report Generation — Real Logic
- [ ] 21 Cancel Pending Report

### Phase 8 — Reports: Adviser Review

- [ ] 22 Adviser Report Review — Full UI
- [ ] 23 Report Approve / Reject — Real Logic

### Phase 9 — Archiving

- [ ] 24 Archive Event — Full UI
- [ ] 25 Archive Event — Real Logic

### Phase 10 — Notifications

- [ ] 26 Push Notifications — Full Setup
- [ ] 27 Notification Retention Job

### Phase 11 — Audit & Read-Only Views

- [ ] 28 Audit Log — Admin View
- [ ] 29 Adviser & Admin Read-Only Event/Report Views

**Total: 10 / 30 features complete**

---

## Decisions Made During Build

- **2026-07-12 — Landing page UI (`app/page.tsx` + `components/landing/RoleCard.tsx`):** Built the public landing page per Phase 1 / `01` (Landing Navbar + Hero/How-It-Works/Footer). Narrow job = confirm the right visitor is in the right place, done via a role-identification grid (Treasurer / Adviser / Admin) using `<RoleCard>` (reused 3×, role-badge color map keyed off `--role-*` tokens). All styling uses `@theme` tokens only — no hardcoded hex, no raw Tailwind color classes. `tsc --noEmit` passes; page renders 200 with correct a11y tree. Note: the reference `context/Design/landing-page.png` could NOT be viewed (this model has no image input) — built from `ui-tokens.md`/`ui-rules.md` instead. `/login` and `/signup` links point to pages not yet built (Phase 1 auth shell remains). Did not check `01` fully since Login/Signup/OTP/Pending/Forgot are still pending.
- **2026-07-12 (revision) — Landing page reshaped:** Per user direction, removed the Treasurer/Adviser/Admin role grid (`components/landing/RoleCard.tsx` deleted — now dead code) and replaced it with a **Problem** section ("The paper trail ends here." + 3 pain points from `project-overview.md`) as the identity-confirmation device. Hero H1 changed to "From receipt to signed report — all in one place." Added a high-contrast **final bottom CTA** band (`bg-accent`). CTA placement = Navbar + Hero + bottom. Section order: Navbar → Hero → Problem → How it works → Final CTA → Footer. Still token-only; `RoleCard` entry removed from `ui-registry.md`.
- **2026-07-12 (redesign) — Landing page rebuilt from Figma:** Pulled Figma web (`#154:23`) + mobile (`#156:87`) via `figma_get_figma_data`; used as **structure/layout only** (not copy or exact styling). New section order: Navbar → Hero(+ product-visual dashboard mock) → Features(×3) → How it works(×3) → Final CTA → Footer. Mobile nav = native `<details>`/`<summary>` hamburger (no client JS). Replaced the `bg-accent` final CTA band with a white `bg-surface` card so every section is a white card per `ui-rules.md`. Hero visual = token-styled mock of an event budget dashboard (status/stat/budget-bar/entries). Figma used Montserrat → overridden to Poppins (system mandate). `tsc --noEmit` passes. `app/page.tsx` is the single landing source (RoleCard still dead code, confirmed no references).
- **2026-07-12 (hierarchy/whitespace refinement) — Antigravity pattern, token-only:** Per user, adopted Antigravity's *structural pattern, whitespace, and visual hierarchy* — **not** its dark theme (stayed light/monochrome per `ui-tokens`). Every section now has a 3-tier hierarchy: uppercase `text-text-muted` eyebrow → `text-base` heading → `text-sm text-text-secondary` intro → content. Whitespace increased (sections `py-20 md:py-28`, hero `pt-20 md:pt-32`, grids `gap-8`); the hero product mock is the focal "product shot". No new sections, no dark bands, no card-color changes. **Deviation:** whitespace exceeds `ui-rules.md` 24/32px spacing caps (pre-approved for the airy Antigravity feel). Verified: `tsc --noEmit` passes, page renders 200, **0 console errors**, a11y tree shows eyebrow→heading→intro on every section.
- **2026-07-12 (image holder) — hero visual now shows `img-1.png`:** The hero product-visual card (the former budget-dashboard mock) became a pure **image holder**: `rounded-[24px] overflow-hidden border border-border bg-surface` frame containing `next/image` of `/landing/img-1.png` (722×530, `priority`, `h-auto w-full`). Asset copied from `context/Design/img-1.png` → `public/landing/img-1.png`. Verified: `tsc --noEmit` passes, page + `/landing/img-1.png` both return 200 (212,634 bytes), **0 console errors**.
- **2026-07-13 — Phase 0 complete (`00` Route × Role × Precondition Matrix):** Built `docs/auth-matrix.md` (spec artifact) enumerating every route from `project-overview.md` Pages + `architecture.md` `app/api` routes + `actions/` Server Actions, with columns Route / Method / Role / Dept match? / State preconditions / RLS policy. Built `lib/auth-guard.ts` directly from the matrix: `requireRole(requiredRole, departmentId?, preconditionCheck?)` — resolves current `AuthUser` via `createInsforgeServer()` + `auth.getCurrentUser()` + `users`-table lookup, throws `AuthError` (401 unauthenticated / 403 forbidden_role / 403 forbidden_department), runs the caller-supplied `preconditionCheck`. Overloads give `AuthUser` for protected calls and `AuthUser | null` for `public`. Also created `lib/insforge-server.ts` (server client) and `types/index.ts` (Role / AuthUser / GuardContext / PreconditionCheck) as hard dependencies of the guard. `tsc --noEmit` passes. `requireRole` accepts `Role | Role[]` so dual-role surfaces (`/api/notifications/subscribe` = treasurer|adviser) work without a second call.
- **2026-07-13 — `01 Landing + Auth Shell` complete (UI only):** Built the shared auth layout + 4 primitives and all 5 `app/(auth)/*` pages. Added `--shadow-card` token to `globals.css` (canonical card shadow; `AuthCard` uses `shadow-card`, the landing page still hardcodes its own `shadow-[...]` — left as-is, working code). Components: `components/auth/AuthShell.tsx` (split centered, `bg-surface-inverse` brand panel web-only + form side; `lg:hidden` logo on mobile), `AuthCard.tsx` (title/subtitle + `shadow-card` card), `AuthInput.tsx` (`"use client"`, controlled, supports `inputMode` for OTP, required `*` in `text-error`), `AuthButton.tsx` (`"use client"`, primary/secondary/ghost → exact `ui-rules.md` button tokens, `loading`/`disabled`), `AuthLink.tsx` (`next/link` wrapper, `text-accent`). Pages: `login` (email+password), `signup` (name/email/password + role select locked to `treasurer`/`adviser` per AGENTS, mock `DEPARTMENTS` const), `otp` (`inputMode=numeric` 6-digit, 60s resend countdown), `pending-approval` (static), `forgot-password` (email → inline mock success). All pages use `useState` **mock** submit handlers that `router.push` to the next step — **no InsForge calls yet**; real auth wiring is Phase 1 `03`/`04`. Verified: `tsc --noEmit` 0 errors; `next build` success (6 routes); `/login` `/signup` `/otp` all 200 with expected HTML. Registry + this tracker updated.
- **2026-07-15 — Forgot-password flow defined (Phase 1):** Intended reset flow is `/forgot-password` (email) → `/otp?purpose=reset&email=...` → `/change-password` (new password + confirm password) → `/login`. Corrects the earlier partial cut where `/forgot-password` ended at an inline mock success. Still Phase 1 (UI-only mock first; real OTP-send / verify / password-update wired in `03`). `/change-password` does not yet exist; `/otp` currently routes only to `/pending-approval` (signup). The 3-step wiring is pending — `build-plan.md` `01` UI line and `03` logic line updated, `project-overview.md` Pages list + Core User Flow + Features In Scope updated to match.
- **2026-07-15 — Forgot-password 3-step flow wired + back buttons added (Phase 1 UI foundation complete):** Built `app/(auth)/change-password/page.tsx` (new+confirm password, match check → `/login`, Suspense-wrapped `useSearchParams`). Rewrote `/forgot-password` to push to `/otp?purpose=reset&email=...`. Rewrote `/otp` to be `purpose`-aware (inner wrapped in `<Suspense>`): `purpose=reset` → `/change-password?email=...`; else → `/pending-approval`. Added `backHref?: string` prop to `AuthShell.tsx` (icon-only arrow-left link, `aria-label`). Back button wired on `signup`(/login), `forgot-password`(/login), `otp`(reset→/forgot-password, signup→/signup), `change-password`(/otp?purpose=reset&email=... or /login). Excluded from `login` and `pending-approval` per requirement. Verified in browser: full reset flow reaches `/login`; signup OTP still → `/pending-approval`; back buttons present/absent correctly; `tsc --noEmit` clean. User declared Phase 1 complete this session — interpreted as UI/foundation done; 02/03/04 (DB schema + real auth wiring) still pending in build-plan.
- **2026-07-17 — `03 Auth — Signup, OTP, Approval Routing` complete (API routes + page wiring):** Created 5 API routes: `POST /api/auth/signup` (department code→ID resolution with auto-seed, InsForge auth user via `insforge.auth.signUp()`, `users` table insert, notification routing for adviser→admin and treasurer→adviser), `POST /api/auth/otp/send` (resend signup OTP or send reset-password email, anti-enumeration response), `POST /api/auth/otp/verify` (signup OTP verification with `insforge.auth.verifyEmail()` + `otp_verified_at` stamp, or reset-code exchange via `insforge.auth.exchangeResetPasswordToken()`), `POST /api/auth/change-password` (finalize reset via `insforge.auth.resetPassword()`). Created `lib/insforge-client.ts` (browser SDK via `createClient` for future client-side auth state). Wired all 4 auth pages (signup, OTP, forgot-password, change-password) with real API calls: loading states, error display, success redirects. Fixed pre-existing type errors in `lib/auth-guard.ts` (overload compat with `"public"` type widening) and `lib/storage.ts` (`insforge.from()` → `insforge.database.from()`, `.upload()` signature, `getUser()` → `getCurrentUser()`, joined query types). Build passes clean; all 5 API routes registered as `ƒ (Dynamic)`. Key deviation: department auto-seeds on first signup if absent (Phase 2 admin management replaces this); new `otp_verified_at` column presumed present on `users` table per initial schema.
- **2026-07-16 — `02 Database Schema` complete (11 tables, indexes, RLS, storage):** Created all 11 Postgres tables via `insforge_run-raw-sql`: `departments`, `users` (FK → `auth.users`), `events`, `entries`, `reports`, `report_signatories`, `entry_comments`, `department_report_counters`, `notifications`, `push_subscriptions`, `audit_logs`. Added 2 partial unique indexes on `users` enforcing one-active-adviser-per-department and one-active-treasurer-per-department. Added 13 lookup indexes (event→department, entry→event, entry→status, report→event, report→status, etc.). `budget_locked`, `is_locked`, `has_active_adviser`, `has_active_treasurer`, `has_unresolved_overspend` are **derived at query time** per architecture, not stored columns. Created `get_user_role()` and `get_user_department_id()` helper functions for RLS. Enabled RLS on all 11 tables. Created 15 RLS policies: admin unrestricted on all; adviser/treasurer scoped via `department_id` or `event → department` joins; own-user policies on `users`, `notifications`, `push_subscriptions`; audit-log insert allowed for all (read scoped by role). Created 3 public storage buckets: `receipts`, `signed-reports`, `avatars` — storage access control is application-level (path-based: `departments/{id}/events/{id}/receipts/{id}.jpg`), not SQL RLS (InsForge manages storage internally). Updated `types/index.ts` with all 11 DB row types plus union types for statuses. Verified via `get-backend-metadata` (11 tables confirmed) and `get-table-schema` (users, entries, reports spot-checked — columns, indexes, FKs, policies all match spec).
- **2026-07-17 — `04 Login, Session, Role-Based Redirect` complete:** Created `POST /api/auth/login` route (`createInsforgeServer` → `signInWithPassword` → `users` table lookup → `account_status` check [rejected/pending/active] → role-based redirect URL). Wired `app/(auth)/login/page.tsx` with real API call: loading spinner, error display, role-based redirect via `data.redirectTo`. Created `middleware.ts` (cookie-based redirect hinting: prevents authenticated users on auth pages, blocks unauthenticated access to `/treasurer/*`, `/adviser/*`, `/admin/*`). Created `lib/layout-guard.ts` (shared `requireLayoutRole()` for server-side role enforcement via `createInsforgeServer` + auth check + role DB lookup). Created route group layouts (`app/treasurer/layout.tsx`, `app/adviser/layout.tsx`, `app/admin/layout.tsx`) using `requireLayoutRole`. Created placeholder role home pages (`/treasurer/home`, `/adviser/home`, `/admin/departments`). Build passes clean (0 type errors, all 5 API routes + middleware + 3 dynamic role pages). Note: middleware uses the deprecated `middleware.ts` convention (Next.js 16 recommends `proxy.ts`); non-blocking for now. SDK API clarification: `createServerClient` from `@insforge/sdk/ssr` takes a single object argument `{ cookies: { get(name) => value } }`, not 3 positional args — the existing `lib/insforge-server.ts` was already correct.
- **2026-07-17 — `05 Admin Departments Page — Full UI` complete:** Built admin shell (sidebar + layout) and departments list/detail pages with mock data. Created `components/ui/StatusBadge.tsx` (shared status badge with variants: default/success/warning/error/info/neutral + preset mappers `AccountStatusBadge`, `EventStatusBadge`, `RoleBadge`), `components/ui/EmptyState.tsx` (reusable empty state with icon/title/description/action), `components/admin/AdminSidebar.tsx` (client component, fixed 240px sidebar on desktop, top bar on mobile, 3 nav items: Departments/Approvals/Profile). Updated `app/admin/layout.tsx` (server component, `requireLayoutRole("admin")` guard + sidebar + content area with `lg:pl-60` offset). Created `app/admin/departments/page.tsx` (client component, mock departments table with columns: Name/Code/Adviser/Treasurer/Status, inline new-department form with name+code inputs, rows link to detail). Created `app/admin/departments/[departmentId]/page.tsx` (client component, department header card + 4 tabs: Events/Reports/Audit Logs/Users; Users tab has RoleBadge + AccountStatusBadge + Deactivate/Reactivate buttons; all tabs have empty states). Created `lib/format.ts` (`formatPHP()` using `Intl.NumberFormat`). All token-only styling per `ui-rules.md`. `tsc --noEmit` clean; `next build` registers both `/admin/departments` and `/admin/departments/[departmentId]` as dynamic routes. Mock data only — no InsForge queries or Server Actions yet (Phase 2 `06`).
- **2026-07-18 — Animation stack split + doc standards established:** Decision to separate animation concerns into 3 tiers: CSS transitions (trivial, zero cost) → framer-motion (micro-interactions: mount/unmount, stagger, spring, layout) → GSAP (heavy/timeline: ScrollTrigger, SVG morphing, complex sequences). Created 5 Apple-style animation rules (meaning-only, short durations, spring motion, subtle movement, purposeful). Updated `code-standards.md` with animation selection section, `ui-rules.md` with Animation Standards, `library-docs.md` with framer-motion/GSAP/@base-ui/react sections, `architecture.md` stack table with all 3 animation libs. Migrated GSAP stagger-ins in `DepartmentsListClient.tsx` and `DepartmentDetailClient.tsx` to framer-motion variants (spring 200ms, y:12, stagger 40ms). Tightened FAB hover from `scale-105` to `scale-[1.02]`. Added UI primitive order rule (shadcn/ui → @base-ui/react → custom). `tsc --noEmit` passes, `next build` succeeds.
- **2026-07-18 — Signup bug fix (signUp user.id not returned by SSR client):** Original `POST /api/auth/signup` route treated missing `data.user.id` as a 500 failure, even though the auth user was created (the SDK's SSR `signUp` returns an optional `user` field). Removed the `if (!authUserId)` check — `users` row creation deferred to `POST /api/auth/create-profile` after OTP. Also discovered `createInsforgeServer()` uses the SSR `InsForgeClient` class directly, NOT the `createAuthActions` wrapper — meaning `verifyEmail()` class method doesn't persist session cookies in server mode. That was a latent bug with no impact until we needed authenticated downstream calls. See next entry.
- **2026-07-18 — Auto-redirect + welcome email for approved signups:** Added `GET /api/auth/status` polling endpoint (reads `users.account_status`). Updated `app/(auth)/pending-approval/page.tsx` with 10s `setInterval` polling `/api/auth/status` — on `"active"` redirects to `/login`, on `"rejected"` shows rejection banner, on `"unauthenticated"` shows session-expired hint. Created `lib/email.ts` with nodemailer transporter (Gmail SMTP, port 587, app password). Added `sendWelcomeEmail` call to `approveAdviserSignup()` server action in `actions/approvals.ts`. Added `sendRejectionEmail` function (not yet wired to `rejectAdviserSignup()`).
- **2026-07-18 — Fixed session cookie gap in OTP verify route:** The SSR client's `verifyEmail()` method calls `saveSessionFromResponse()` which in server mode only sets tokens on the internal HTTP client instance — it never writes cookies to the HTTP response. Fixed `app/api/auth/otp/verify/route.ts` to manually persist `insforge_access_token` and `insforge_refresh_token` cookies via `cookieStore.set()` using the same options the SDK's own `setAuthCookies` would use (httpOnly≈false access / true refresh, secure in production, sameSite lax, path /). Also: added `requireTLS: true` + `transporter.verify()` to `lib/email.ts` (nodemailer), and added session-lost UX hint on `pending-approval/page.tsx` when status is `"unauthenticated"`. Verified: build passes clean.
- **2026-07-18 — Phase 3 complete (08+09 Adviser Approvals):** Built full adviser nav infrastructure — `AdviserSidebar.tsx` (desktop), `AdviserMobileBottomNav.tsx` (mobile), wired in `app/adviser/layout.tsx`. Approvals page with 2 tabs (Pending Expenses + Pending Users) in `AdviserApprovalsClient.tsx`. Server page `app/adviser/approvals/page.tsx` fetches pending treasurers (same dept) + manual entries (via two-phase: events→dept→entries). 4 server actions in `actions/approvals.ts`: `approveTreasurerSignup`, `rejectTreasurerSignup`, `batchApproveEntries`, `rejectEntry` — all with full precondition chains (role, dept match, event-not-archived, status guards). Missing shadcn init sidestepped — wrote native `components/ui/button.tsx` (5 variants, 4 sizes) and `components/ui/checkbox.tsx` (native input, SVG checkmark). Noted: InsForge `events` join returns array not object — access via `eventsArr?.[0]` pattern. `tsc --noEmit` passes clean. Next in build-plan: Phase 4 — Treasurer Events & Budget (step 10).
- **2026-07-18 — Entry logging refactored: page → modal/sheet:** Changed "Log Entry" from page navigation to modal (web) / bottom sheet (mobile) per UI/UX request. Created `LogEntryModal.tsx` (AnimatePresence overlay + centered modal on sm+ / bottom sheet below sm, contains method toggle + ReceiptUpload + ManualEntryForm + ReceiptReview all in one modal shell). Created `EventDashboardActions.tsx` (client component encapsulating the Log Entry + Generate Report button pair and modal state). Updated `app/treasurer/events/[eventId]/page.tsx` to use `<EventDashboardActions>` instead of the `<Link>` to `/entries/new`. The standalone `/entries/new` page remains intact as a fallback route. `tsc --noEmit` passes.
- **2026-07-18 — Phase 5 Step 13 complete (Entry Logging — Full UI):** Built 3 new components and the route page: `ReceiptUpload.tsx` (drag/drop zone, file validation, image preview, mock 1s parse), `ReceiptReview.tsx` (AnimatePresence centered modal on sm+ / bottom sheet below sm, read-only extracted fields + itemized table, Confirm/Discard buttons), `ManualEntryForm.tsx` (inline form, itemized breakdown rows with auto-computed line amounts and totals, add/remove items, submit). Route page `app/treasurer/events/[eventId]/entries/new/page.tsx` orchestrates all 3 — segmented toggle (Upload Receipt / No Receipt), shows `ReceiptUpload` or `ManualEntryForm`, opens `ReceiptReview` on parse complete. All components use mock data only (no real API). `tsc --noEmit` passes clean.
- **2026-07-18 — Phase 4 complete (10+11+12 Treasurer Events & Budget):** Built full treasurer nav infrastructure — `TreasurerSidebar.tsx` (desktop, 4 items: Home/Reports/Notifications/Profile), `TreasurerMobileBottomNav.tsx` (matches sidebar). Wired in `app/treasurer/layout.tsx`. Events list (`app/treasurer/home/`) is a server→client split: server page fetches via `getDepartmentEvents()`, client `TreasurerHomeClient.tsx` handles filter tabs + framer-motion stagger grid. Event creation (`app/treasurer/events/new/`) passes `createEvent` Server Action as `onSubmit` to `EventForm`. Event dashboard (`app/treasurer/events/[eventId]/`) is a server component fetching via `getEventDashboard()`. Created `lib/queries/events.ts` — shared query layer that computes `total_spent` (SUM of deducted entries), `budget_locked` (any deducted entry exists), and `is_locked` (any report in pending/approved status) at query time, never persisted. Created `actions/events.ts` — `createEvent` Server Action with role guard, department scoping, audit log. Created `components/entries/EntryRow.tsx` (type badge, amount, status badge, void attribution) and `EntryList.tsx` (stagger-animated list with header + empty state). `BudgetSummary.tsx` (total/spent/remaining bar with progress fill) and `LockedBanner.tsx` (info/neutral variant for locked/archived states). Key pattern: `getDepartmentEvents()` batch-fetches spending per event in one query and uses Set for O(1) `is_locked` lookups. Build passes clean. Next in build-plan: Phase 5 — Entry Logging (step 13).

---

## Notes

*(Environment quirks, sandbox limitations, verification commands that passed/failed, and anything a future agent needs to know before touching this codebase again. Append, don't overwrite.)*

- **SDK import correction (flagged):** `architecture.md` imports the server client as `from "@insforge/ssr"`. The installed package is `@insforge/sdk@1.4.4` (per AGENTS.md), which exposes the server client at the subpath `@insforge/sdk/ssr` (`createServerClient`). There is no standalone `@insforge/ssr` package installed. `lib/insforge-server.ts` uses `@insforge/sdk/ssr`. Corrected import path only — API matches the architecture's intent. If a future session adds `@insforge/ssr` separately, this should be reconciled.
- `users`-table lookup in `getCurrentUser()` (auth-guard) requires the `users` table from Phase 1 / `02` to exist before runtime auth works. The guard compiles now and is structurally correct; it becomes live once schema + signup land.
- **InsForge storage RLS:** InsForge manages storage access internally — SQL-level `storage.objects` policies (like Supabase) are not available. Storage buckets are created as public; access control is enforced application-side via path-based conventions (`departments/{deptId}/events/{eventId}/receipts/{entryId}.jpg`) and server-side auth guards in API routes.

---

## How to Update This File

After finishing a feature:

1. Check its box under **Progress**.
2. Update **Current Status** — `Last completed` becomes what you just finished, `Next` becomes the next unchecked item in build order, `Phase` updates if you crossed a phase boundary.
3. Add one bullet to **Decisions Made During Build** describing what was actually built (file paths, exact function/table names, any deviation from `build-plan.md` or `architecture.md` and why).
4. Add to **Notes** only if something environment/verification-related happened (build failures, sandbox network issues, lint warnings carried forward).
5. Never delete history from this file — it is append-only except for the **Current Status** and checkbox sections.
6. If a decision here ever contradicts `architecture.md`, the architecture doc wins — flag the conflict in **Notes** rather than silently resolving it.
