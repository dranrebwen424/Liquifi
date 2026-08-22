# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 11 — Audit & Read-Only Views (COMPLETE — all 30 build-plan features done)
**Last completed:** Post-plan hardening — login rate limiting (`lib/rate-limit.ts` + `app/api/auth/login/route.ts`) — in-memory two-bucket escalating lockout, no new deps
**Next (non-feature):** E2E smoke test of the read-only views + EventBrowser + profile pages (needs admin/adviser creds); verify/create the `push_subscriptions` RLS policy; deploy the notification-retention scheduled function (last two need MCP)
**Status:** All 30 features done (Phase 11 complete; checkboxes + total below reflect it). Step 29 shipped the read-only layer: `readOnly` prop on `BudgetSummary`/`EventDashboardActions`/`SpendingBreakdownCard`/`ReportViewer` (mutating controls OMITTED, never disabled), `RejectedEntryActions` gated on `canMutate` (adviser leak fixed), proxy routes (image + pdf) now allow `"admin"`, three new pages — `/adviser/events/[eventId]`, `/admin/departments/[deptId]/events/[eventId]`, `/admin/departments/[deptId]/reports/[eventId]` — reusing the treasurer dashboard components, "View event" link in the adviser review header, admin dept Events/Reports tabs wired to real data (mock props deleted). Post-step refinements: `EventCard`/`EventListItem` gained an optional `href` prop (treasurer default `/treasurer/events/{id}` unchanged); new shared `components/events/EventBrowser.tsx` gives the adviser home + admin Events tab the full treasurer look — fake search bar → search mode (ArrowLeft exit, autofocus input) with Type/Treasurer/Date/Budget `FilterDropdown`s + "Search Results" divider, search-prompt + no-matches ("Clear filters") empty states, `ViewToggle` grid/list on Active Events (folder `EventCard` grid / `EventListItem` rows), Archive grouped by year + Sort dropdown — all staggered via `lib/motion-variants`. State-based search instead of the treasurer URL `?search=1` mode (that URL dance exists for the treasurer-only searchable MobileTopBar; adviser/admin layouts lack it). Verified after every step: `tsc --noEmit` clean + `next build` green. Repo uncommitted since "step 23 done" (8053cde) — commit only when explicitly requested.

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
- [x] 14 Receipt Parsing — OpenRouter Integration
- [x] 15 Receipt Confirm / Discard + Budget Deduction
- [x] 16 Manual (No-Receipt) Entry Submission

### Phase 6 — Voiding & Overspend

- [x] 17 Void Entry — Full UI + Logic
- [x] 18 Overspend Explanation Flow

### Phase 7 — Reports: Generation

- [x] 19 Report Generation — Full UI
- [x] 20 Report Generation — Real Logic
- [x] 21 Cancel Pending Report

### Phase 8 — Reports: Adviser Review

- [x] 22 Adviser Report Review — Full UI
- [x] 23 Report Approve / Reject — Real Logic

### Phase 9 — Archiving

- [x] 24 Archive Event — Full UI
- [x] 25 Archive Event — Real Logic

### Phase 10 — Notifications

- [x] 26 Push Notifications — Full Setup
- [x] 27 Notification Retention Job

### Phase 11 — Audit & Read-Only Views

- [x] 28 Audit Log — Admin View
- [x] 29 Adviser & Admin Read-Only Event/Report Views

**Total: 30 / 30 features complete**

---

## Decisions Made During Build

*Condensed 2026-08-08 (twice) on request — full verbatim history preserved in git.*

- **2026-08-22 — Signup split into 3-step wizard (user request):** `app/(auth)/signup/page.tsx` only — same AuthInput/AuthSelect/AuthButton components, zero API changes. Step 1 Name (first*/last*/middle), step 2 Account (email*/password*), step 3 Council (role + department). Every forward button reads **"Continue"**; final one performs the existing POST → sessionStorage `pending_signup` → `/otp` redirect unchanged. Per-step gating reuses the `submitted` red-border pattern (`STEP_REQUIRED` map); `submitted` resets on step change so borders never leak across steps; steps unmount conditionally while values persist in the single `form` state. Extras kept from plan: outline "Back" button beside Continue on steps 2–3 (flex gap-3 row) and `AuthCard` subtitle repurposed as "Step N of 3 · <section>". Departments fetch + fallback list untouched. Verified: `tsc --noEmit` clean, `next build` green.
- **2026-08-22 — Login lockout v2: cycle-based with password-reset redemption (supersedes the flat ladder below):** `lib/rate-limit.ts` email bucket now walks a 3-cycle state machine (`BucketConfig` gained a `mode: "cycles" | "ladder"` union; IP bucket keeps the ladder untouched): cycle 1 = 5 fails → 1 min cooldown, cycle 2 = 3 fails → 5 min cooldown, cycle 3 = 3 fails → **soft lock** whose cooldown rides `IDLE_TTL_MS` (24 h) — when the lock lifts, the staleness check wipes the bucket in the same request, so expiry can never leave a one-fail-from-relock zombie. Cycle counters reset to 0 on each cooldown trip; stale buckets (idle > 24 h) restart at cycle 1; success still clears everything. Route: `checkRateLimit`/`LockStatus` now carry `softLocked`, threaded through both pre-auth and post-failure 429 paths as a machine-readable `softLocked: true` JSON flag (error copy: "…locked for 24 hours. Reset your password to regain access."); `formatWait` gained an hours tier. Redemption loop: `/api/auth/change-password` calls `clearRateLimit("e:{email}")` after successful `resetPassword` (safe — completing it requires OTP + inbox access). UI: login page raises an inline soft-lock modal (registry overlay/card tokens, `role="alertdialog"`; Reset Password → `/forgot-password`, Try again later dismisses; overlay click closes). Verified: simulated-clock script drove the full 5→60s→3→300s→3→24h ladder + staleness/expiry/clear/IP-ladder regression (all passed), `tsc --noEmit` clean, `next build` green.
- **2026-08-22 — Login rate limiting (post-plan hardening):** `lib/rate-limit.ts` — in-memory two-bucket escalating lockout, zero new deps. Email bucket (`e:{lowercased email}`, threshold 5) and IP bucket (`ip:{xff first hop ?? x-real-ip}`, threshold 15; bucket **skipped entirely** when neither header exists rather than lumping everyone into one shared key). Ladder: `baseMs × 2^(failures − threshold)` capped (email 30 min, IP 1 hr); buckets expire 24 h after last failure; size-capped sweep at 5000. Route integration: pre-auth check → 429 + `Retry-After` before InsForge is touched; both 401 paths route through `handleFailedAttempt` which records failures and re-checks (a tripping failure returns the 429, not a 401); near-limit countdown on the last two allowed failures ("2 more attempts before your account is temporarily locked"); success clears only the email bucket (typos forgiven), IP bucket persists. 403s (pending/rejected accounts) never count — credentials were proven correct. Blocked requests never extend timers. In-memory accepted ceiling: resets on deploy, per-instance — DB-backed table is the documented upgrade path. No UI changes (client renders `data.error` verbatim). Verified: `tsc --noEmit` clean, `next build` green.
- **2026-08-09 — Profile pages for all roles (post-Step-29 refinement):** the sidebar popover "Profile" + all three mobile bottom navs already pointed at `/treasurer/profile`, `/adviser/profile`, `/admin/profile` — dead links that 404'd. Built them: three thin `force-dynamic` pages + one shared server `components/profile/ProfileView.tsx` — `requireRole(role)` → `users` select (first/middle/last name, email, role, account_status, `departments(name)` embed) → card with initials avatar circle (`h-14 w-14 rounded-full bg-accent-light text-accent`, first+last initials, `email[0]` fallback; middle name → single initial "F. M. Last") + role badge + divider rows (Email, Department — hidden for admin whose `department_id` is null — Account status). Read-only by design (no edit forms, no avatar upload — the `avatars` bucket stays unused). `LogoutButton` (client, best-effort `POST /api/auth/logout` → `router.push("/login")`, same as Sidebar) rendered `lg:hidden` — mobile logout sits at the page bottom (user direction: desktop keeps the sidebar popover). Verified: `tsc --noEmit` clean, `next build` green (24 routes, all three profile routes registered ƒ).
- **2026-08-09 — Step 29 Read-only views (Phase 11 done, all 30 features):** `readOnly` prop on the 4 dashboard/report components (mutating controls OMITTED, not disabled — distinct from the treasurer `canMutate=false` lock semantics); `RejectedEntryActions` leak fixed (gated on `canMutate`); proxy routes + `"admin"`; three new pages (adviser + admin event, admin report) reusing the treasurer dashboard components per ui-rules read-only convention; adviser home placeholder → read-only events list; admin dept Events/Reports tabs wired real data (mock props deleted). Admin RLS risk retired with evidence — dept-scoped tables are admin-unrestricted per `architecture.md` and proven by existing admin reads of `users`/`audit_logs`.
- **2026-08-09 — Post-Step-29 UI consistency:** adviser home + admin Events tab now mirror the treasurer home exactly — `EventCard` folder grid for Active Events, `EventListItem` rows grouped by year for Archive. Unblocked by an optional `href` prop on both components (default stays `/treasurer/events/{id}`; adviser/admin pass their own read-only paths). Admin `Event` row type extended (`num_entries`, `created_by_name`, `created_at`); motion stagger variants deduped into shared `lib/motion-variants.ts`. `tsc --noEmit` clean, `next build` green.
- **2026-08-09 — Search + view toggle for adviser/admin:** both surfaces moved to a shared `EventBrowser` client component (`components/events/EventBrowser.tsx`) — treasurer-style centered search bar (name filter, `useDeferredValue`) + `ViewToggle` grid/list + Active grid / Archive-by-year, all staggered. Plain inline input instead of treasurer's `?search=1` URL mode + FilterDropdowns (those depend on the treasurer-only searchable MobileTopBar and management filters). Admin `Event` row renamed `spent` → `total_spent` to match `EventBrowserItem`; duplicated EventsTab/groupByYear code deleted. `tsc --noEmit` clean, `next build` green.
- **2026-08-09 — Filters + Sort for adviser/admin (full treasurer parity):** `EventBrowser` grew the complete treasurer search mode — fake search bar → search screen (ArrowLeft exit, autofocus input) + Type/Treasurer/Date/Budget `FilterDropdown`s + "Search Results" divider, search-prompt empty state, no-matches EmptyState with "Clear filters", and a Sort dropdown on the Archive header. All filter/sort constants + logic copied from the treasurer client (`app/treasurer/home/client.tsx`); state-based instead of URL `?search=1` (treasurer's URL mode serves its searchable MobileTopBar, absent here). `tsc --noEmit` clean, `next build` green.
- **2026-08-09 — Step 25 Archive Event (history, consolidated from Current Status):** `POST /api/events/[eventId]/archive` — `requireRole("treasurer")`; guards → 404 (no event / wrong dept), 403 (no latest approved report), 409 (already archived or `has_unresolved_overspend`); flow: upload each signed page via `uploadSignedReport(report.id, i+1, file)` → `countPdfPages(getReportPdfBlob(reportId))` (regex on PDFKit uncompressed `/Type /Pages … /Count N`, fallback 1 — pdfjs-dist is NOT Node-safe, client-only) → `verifySignedDocument` (agent/document-verifier.ts: gpt-4o via OpenRouter, 3 attempts; checks fs_document_number + signature-like marks per `report_signatories` ordered by `sort_order` + page count — completeness only, never authenticity) → any fail: best-effort delete uploaded keys via `deleteSignedReportPage` + 422 with per-check `checks`/`summary` → pass: race-safe event update `.eq("id").eq("status","open")` (0 rows → 409 + rollback), report update `{signed_document_urls: [keys], signed_page_count, signing_confirmed_by/at}`, audit `event.archived`, revalidate ×3. UI: `ArchiveEventModal.tsx` — `ArchiveEventButton` (outline destructive `border-error text-error`) + 3-phase modal (upload with "every page, not just the signature page" notice + multi-image thumbnails; uploading spinner; result screen `bg-success-lightest`/`bg-error-lightest` per-check rows — stays open on failure, Try Again resets, Done closes + `router.refresh()`); dashboard gate `canArchive = latestReport?.status === "approved" && !isArchived && !event.has_unresolved_overspend`. Verified: tsc clean, build green.
- **2026-08-09 — Step 21e pdfjs-dist SSR crash (history):** pdfjs-dist is NOT Node-safe — `DOMMatrix` referenced at module scope (confirmed `node -e "import('pdfjs-dist')"` → `DOMMatrix is not defined`); client components are SSR-evaluated, so the static value import crashed every SSR of `/treasurer/reports/[eventId]`. Fix in `components/reports/PdfViewer.tsx`: static value import → `await import("pdfjs-dist")` inside the render effect; `GlobalWorkerOptions.workerSrc` from the same `WORKER_SRC` module constant; `import type` kept (erased at compile).
- **2026-08-09 — Step 21d signatory wrap (history):** `ReportPdf.tsx` signatory columns wrap at 3 per row — ≤3 keep equal `flex:1` spread; >3 use `flexWrap:"wrap"` + `width:"33.33%"` columns with `marginBottom:12`. Verified on a 5-signatory report (row1 = 3 names y≈329, row2 = 2 names y≈280).
- **2026-08-09 — Steps 15–16 residuals (history, consolidated from Current Status, all still true):** `discardReceiptEntry` is server-guarded (fire-and-forget from UI; `is_locked` check added so all entry mutations block during pending/approved reports — same parity as deduct/void); `treasurer_reviewed` enum member exists but is unused — the authoritative transition is `ai_parsed → deducted`; orphaned receipt blobs for discarded entries are unreachable (keyed by the deleted entryId) — cleanup deferred; the overspend callout is duplicated between `LogEntryModal` and `ReceiptReview.tsx` — dedupe recorded as debt.
- **2026-08-09 — Phase 10 (Notifications) complete:** single `createNotification` choke point replaces 7 inline `notifications.insert` sites; content map in `lib/notifications.ts` drives push AND list pages (3 new types: `report_approved`, `manual_entry_pending`, `entry_rejected`); badge count passed server-side from layouts (deviates from plan's client-polling provider — refresh-on-navigation, per ponytail); `PushSubscriber` never prompts for permission (browser settings are the entry point); retention job is a scheduled InsForge function — SQL artifact + boundary check shipped, actual scheduled-function deploy needs MCP.
- **2026-08-09 — Step 28 Audit Log (Phase 11 start):** the Audit Logs tab already had UI (rendering empty `mockAuditLogs`) — wired real data instead of building the planned `/admin/departments/[deptId]/audit-logs` route: page fetches `audit_logs` scoped to dept (limit 100, desc), actor names resolved via second query on distinct actor ids (`.in()` guarded — empty array errors on PostgREST); target id short form `#id.slice(0,8)`; expandable metadata = plain chevron toggle + `<pre>` pretty JSON (no separate modal); timestamp gained time-of-day. Doubles as the plan's end-to-end audit check: 20+ audit insert sites exist across Phases 2–9.
- **2026-08-08 — Overspend stamp needs `is(..., null)`, not `eq(..., null)`:** InsForge's PostgREST proxy rejects `eq.null` (400) — only `.is(col, null)` works. Also: never trust an unchecked count query; `{ data }` without `error` silently degrades to 0 and skips critical logic.
- **2026-08-08 — Destructive buttons are outline-only project-wide:** Confirm Rejection was built filled-red (`bg-error text-white`) in Phase 8, contradicts ui-rules — fixed to `border border-error text-error hover:bg-error-lightest`. Reject trigger already conformed.
- **2026-08-08 — `report_rejected` notification is best-effort:** fires only when the dept has an `active` treasurer; dev data has none (and `users` reads are RLS-hidden to advisers) so it skipped — guard clause, not a bug.
- **2026-08-08 — FS number anchored per EVENT:** report number = first-assigned `fs_document_number` (revision = max+1); suffix increments per event via dept/year counter; cancelled/rejected regens never consume a new number.
- **2026-08-08 — Cancelled reports hidden from treasurer list:** event whose newest report is `cancelled` → back to "No report yet" (PDF still viewable on detail page); rejected stays in "With reports". Stack ordered newest `generated_at` first.
- **2026-08-08 — Real cancel + persistent ReportViewer (supersedes Step 20 mock):** cancel = treasurer, dept-scoped, event not archived, `pending_adviser_approval` only, race-guarded (racing approve → 409); PDF always viewable via server-side viewer (survives logout/login); no adviser cancel notification.
- **2026-08-08 — Step 20 real generation (incl. RLS discovery):** no `router.refresh()` after generate (kills client preview); cross-user notification inserts were silently failing → added `notifications_same_dept_insert` RLS policy; `pdf_url` = storage key not URL (proxy streams); `reports` orders by `generated_at` (no `created_at`).
- **2026-08-07 — Step 19 signatories + mock preview:** signatories client-only (localStorage) until Step 20 persists `report_signatories`. Note: codebase uses `insforge.database.from(...)`, not `insforge.from(...)`.
- **2026-08-07 — Count inputs block letters:** retired `type="number"` (allows `e`/`E` → NaN→0) for `FloatingInput.digits` (strips non-digits) + `inputMode="numeric"`; tradeoff: no spin buttons.
- **2026-08-07 — Currency inputs digits-only + live separators (reverses 08-03 trade-off):** live `formatNumberInput` + comma-aware `toNumber()` at every coercion point; decimals survive.
- **2026-08-05 (final) — Withdraw/discard semantics (supersedes the soft-terminal `discarded` entry below):** nothing irreversible → removable: `ai_parsed` → Discard = hard delete; `pending_approval` manual → Withdraw = hard delete; `rejected`/`resubmitted` → permanent (resubmit only, 2nd rejection terminal); `deducted` → Void. `discarded` no longer reachable.
- **2026-08-05 — Discard consolidated (SUPERSEDED by above):** kept for history — `deleteReceiptBlob` + conditional-delete race-guard work retained.
- **2026-08-04 — Void moved into the entry info modal (user direction):** full-width destructive pill at modal bottom when `canMutate && status==="deducted"`; stale modal closes on success.
- **2026-08-03 — "Entry has no event" on approve (fixed):** PostgREST to-one embeds return a single **object**, not an array; extract shape-agnostically.
- **2026-08-03 — Adviser batch-approve did nothing (fixed):** confirm dialog dispatched `executeUserAction`, which no-ops without `userId`; batch path now dispatches `executeBatchApprove`.
- **2026-08-03 — Rejection reason visible to treasurer:** `rejection_reason` threaded to EntryDetailModal red callout.
- **2026-08-03 — Manual entries get real titles:** `entryTitle(e)` = supplier → "Category — detail" (recipient/route/occasion/item) → category → "Untitled entry".
- **2026-08-03 — Manual currency/number bugs (user-reported):** store raw strings while typing, coerce at edges only; dropped live separators (reversed 08-07).
- **2026-08-03 — Step 16 Manual entry submission:** rows `type:"manual"`, `status:"pending_approval"`, never deducted at creation; per-form per-category gate `max(minCeiling, round(budget×pct/100))`, explanation never blocks; floors: Transportation 20%/₱300 · Meals 55%/₱500 · Honorarium 45%/₱1,000 · Supplies 25%/₱500 · Printing 12%/₱300 · Rental 65%/₱1,000 · Others 20%/₱300.
- **2026-07-12→13 — Landing page:** token-only per Phase 1; Figma rebuild (structure only, Montserrat→Poppins); Antigravity hierarchy (whitespace exceeds 24/32px caps — pre-approved); hero image holder.
- **2026-07-13 — Phase 0 (Route × Role × Precondition Matrix):** `docs/auth-matrix.md` + `lib/auth-guard.ts` `requireRole(role, departmentId?, precondition?)` — the server-side security boundary.
- **2026-07-13 — `01 Auth Shell` (UI only):** 5 `(auth)` pages, mock submits; real auth = 03/04.
- **2026-07-15 — Forgot-password 3-step flow wired:** `/forgot-password` → `/otp?purpose=reset` → `/change-password` → `/login`; back buttons via `backHref`.
- **2026-07-17 — `03 Auth` complete:** 5 API routes (signup w/ dept code→ID + auto-seed + notification routing, otp/send anti-enumeration, otp/verify, change-password); dept auto-seeds on first signup (Phase 2 replaces).
- **2026-07-16 — `02 Database Schema` complete:** 11 tables; one active adviser/treasurer per dept (partial unique indexes); derived columns never stored; RLS on all tables; storage access is app-level path-based, not SQL RLS.
- **2026-07-17 — `04 Login/session/redirect` complete:** login checks `account_status` → role redirect; middleware + route-group layouts (note: `middleware.ts` deprecated vs Next 16 `proxy.ts`).
- **2026-07-17 — `05 Admin Departments` (UI):** mock data only; Phase 2 `06` wires real.
- **2026-07-18 — Animation stack:** CSS → framer-motion (micro) → GSAP (heavy); primitive order shadcn → @base-ui → custom.
- **2026-07-18 — Signup bug fix:** SSR `signUp` returns optional `user` (no false 500); users row deferred to create-profile after OTP; SSR client's `verifyEmail()` doesn't persist cookies (see below).
- **2026-07-18 — Auto-redirect + welcome email on approval:** `/api/auth/status` polling (10s) → redirect/banner; nodemailer welcome email on approve.
- **2026-07-18 — OTP session cookie gap fixed:** manually persist access/refresh cookies in OTP verify (SSR client never writes response cookies).
- **2026-07-18 — Phase 3 (Adviser Approvals) complete:** 4 server actions with full precondition chains; native button/checkbox (no shadcn init). [CORRECTION 08-03: "events join returns array" was wrong — to-one embeds return objects.]
- **2026-07-18 — Entry logging → modal/sheet:** LogEntryModal (web modal / mobile sheet); standalone page kept as fallback.
- **2026-07-18 — Phase 5 Step 13 (Entry Logging UI):** upload / manual / review mock flow.
- **2026-07-18 — Phase 4 (Treasurer Events & Budget) complete:** `lib/queries/events.ts` computes `total_spent`/`budget_locked`/`is_locked` at query time — never persisted.
- **2026-07-25 — New Event → modal/sheet:** NewEventModal; standalone page deleted.
- **2026-07-29 — Manual entry UX refined:** 2-step flow (category picker → quick form); 7 categories in `manual-categories.ts`; localStorage witness reuse.
- **2026-08-01 — Receipt OCR: OpenRouter → Google Gemini direct (speed):** 60–90s → ~2.5s via `lib/gemini.ts` (`gemini-3.5-flash-lite`, JSON mode, 120s timeout).
- **2026-08-01 — Receipt upload downscaled client-side:** ≤1600px JPEG q0.8 (5–10× smaller; falls back on any failure); accuracy re-verified.
- **2026-08-02 — 3-outcome guided upload (valid/borderline/invalid):** verdicts short-circuit with guidance + audit, no row; only `valid` creates a row; numberless receipts → `""` not null; verdicts don't count toward the 3-attempt ceiling.
- **2026-08-01 — Model pinned `gemini-3.5-flash-lite`:** benchmark — faster + tighter spread than 3.1-flash-lite, 9/9 accuracy.
- **2026-08-02 — EntryDetailModal scrollbar hidden:** plain CSS class (not `@utility` — Turbopack didn't compile it).
- **2026-08-02 — Camera UX (4 iterations):** fullscreen viewfinder portal to body (parent transforms break fixed); flash only when torch capability; green sweet-spot brackets + live dim/close/far/blur hints; thumb-comfort sizing; mobile-only, no FAB; real-device QA outstanding.
- **2026-08-03 — Expense category at parse time:** AI infers (7-way taxonomy, doubt → `others`), stored on insert; AI final — review read-only; no backfill.
- **2026-08-01 — EventCard Figma "folder 2" + refinements:** all info on paper sheet, framer-motion hover, grid capped 5 cols, neutral hover only, mobile filter popover; mock data removed (breakdown deducted-only; card always rendered).
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
