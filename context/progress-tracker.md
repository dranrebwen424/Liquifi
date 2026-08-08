# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 8 — Reports: Adviser Review
**Last completed:** 23 Report Approve / Reject — Real Logic
**Next:** 24 Archive Event — Full UI
**Status:** 23 — Steps 22+23 complete + E2E-verified as adviser (`dranrebwen2505@gmail.com`, browser session). Both fixes shipped: (1) **overspend stamp `eq.null` bug** in `app/api/reports/[reportId]/approve/route.ts` — PostgREST/InsForge proxy rejects `.eq("overspend_resolved_at", null)` (400), so the unresolved-overspend count query errored silently (`{ data: unresolvedRows }` unchecked) → count 0 → stamp block skipped → report approved WITHOUT the overspend acknowledge; fix = `.is(..., null)` on both the count query (line ~49) and the stamp query (line ~63), plus the count query now checks `error` and 500s instead of guessing 0. (2) **Confirm Rejection button filled-red** (`bg-error text-white`) violated the outline-only destructive rule → now `rounded-full border border-error px-6 py-3 text-sm font-medium text-error hover:bg-error-lightest`, matching the Reject Report trigger. Verified E2E: reject flow (Expo FS-CRIM-2026-00002 → Rejected; reason + per-entry comment persisted to `entry_comments`, audit `report.rejected` w/ comment_count + reason, landing revalidates, no console errors; `report_rejected` notification skipped = no active treasurer in dev data — best-effort guard, NOT a bug); approve overspend flow (Testing FS-CRIM-2026-00003 → confirm dialog "This report has unresolved overspend entries. Approving acknowledges that overspend. Continue?" → Approved, audit `unresolved_overspend_count`, `polygon_tx_hash: null` soft-fail); approve plain flow (Homecoming FS-CRIM-2026-00005 → "Approve this report? This cannot be undone." → Approved, audit count 0). DB repaired manually to mirror the fixed route: SAVEMORE `7e06f3af-a0a2-486f-b9d1-67510164df0a` (Testing) stamped `overspend_resolved_at/by` post-approval — banner now correctly disappears. `tsc --noEmit` clean, `next build` green (25 routes, `/adviser/reports` + `[eventId]` + approve/reject registered). All 6 planned behaviors pass.
**Status:** 21e — fixed an SSR crash: `pdfjs-dist` is NOT Node-safe (`DOMMatrix` is referenced at module scope, and `DOMMatrix` doesn't exist in Node — confirmed via `node -e "import('pdfjs-dist')"` → `FAIL: DOMMatrix is not defined`). PdfViewer is a `"use client"` component, and client components are also evaluated server-side during SSR — so the static `import ... from "pdfjs-dist"` crashed every SSR of `/treasurer/reports/[eventId]` (saw it as an intermittent 500 in dev, would have been a hard crash under `next start`). Fix in `components/reports/PdfViewer.tsx`: static value import removed → `await import("pdfjs-dist")` inside the render effect (server never evaluates it); `GlobalWorkerOptions.workerSrc` set from the same `WORKER_SRC` module constant (the `new URL(...)` computation is Node-safe — only pdfjs itself isn't); `import type { PDFDocumentLoadingTask, RenderTask }` kept (erased at compile time). Verified: `tsc --noEmit` clean, `next build` ✓ compiled, dev server reload of the report page = 200 + canvas rendered + no console errors.
**Status:** 21d — signatory columns wrap to a max of 3 per row (`components/reports/ReportPdf.tsx`). Styles split: ≤3 signatories keep the original equal `flex:1` spread; >3 use `flexWrap:"wrap"` + `width:"33.33%"` columns with `marginBottom:12` for the wrapped rows. Verified with a real 5-signatory report (`FS-CRIM-2026-00005` on Homecoming): PDF text extraction shows row 1 = 3 names at y≈329, row 2 = 2 names at y≈280 (no row >3). `tsc --noEmit` clean.
**Status:** New `components/reports/PdfViewer.tsx` (client) renders the report PDF pages onto `<canvas>` via `pdfjs-dist@6.2.108` — kills the browser's native PDF-viewer toolbar that an `<iframe>`/`<embed>` always shows (it cannot be hidden via CSS/URL params). Worker loaded via `new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)` (bundles under Turbopack — `next build` green). Fetches the same-origin auth proxy `/api/reports/[id]/pdf` (cookies flow automatically); pages fit container width (cap 800px, min 1.5× for DPR via `OutputScale` transform); per-page `aria-label`, render tasks cancelled + `loadingTask.destroy()` + `mount.replaceChildren()` on unmount (React-strict-mode safe — spinner lives outside the imperative mount div); error state replaces the box. Replaced both PDF iframes (`ReportViewer.tsx` + `ReportGenerationFlow.tsx`) with `<PdfViewer>`. `PrintReportButton` unaffected (prints via its own hidden iframe). Verified: `tsc --noEmit` clean, `next build` passes, real-browser check as treasurer on `FS-CRIM-2026-00003` — 0 iframes, 1 canvas (475×614, fit-width), no console errors.
**Status:** Report PDF redesigned to the official Liquidation Report template (`context/Design/liquidation-report-sample-v2.md`): `components/reports/ReportPdf.tsx` rebuilt (LETTER, Times-Roman) — letterhead (MABINI COLLEGES / Finance Division — Accounting Department) moved to the BOTTOM of the page; LIQUIDATION REPORT title, meta row (No./Date), DOMAIN (`dept name (code)`), Project Name/Activity, College/Dept., APPROVED BUDGET PER CV No. (N/A — no CV field) + AMOUNT, Date of CV (N/A); 4-column expense table (Expense Accounts/Items | Approved Budget | Actual Expenses | Variance) with one row per deducted entry (description = `supplier_name ?? document_type_raw ?? "Expense"`, sub-line `date · documentType · documentNumber` when present), built in `app/api/reports/generate/route.tsx` — per-row budget/variance `—` (no per-entry budget tracked), TOTAL row real with red `₱ (x)` variance when overspent; template note line; returned-amount block (ACTUAL EXPENSES / O.R. N/A / DATE OF OR N/A / RETURNED AMOUNT = ₱0.00 + overage note when overspent); side-by-side signatory columns (one per signatory on file — first two slots `Prepared by`/`Approved by`, extras headed by position; `ReportGenerationFlow` refreshes the server page after generate so the superseded PDF with old signatories doesn't linger below); Remarks header blank; `ACCOUNT CODE: 5-02-01-030` static template constant; verbatim footer note; `PrintReportButton` (client, hidden same-origin iframe → `contentWindow.print()`) shown in `ReportViewer` only when the report is `approved` — treasurer printing is gated on adviser approval. Also: detail page (`app/treasurer/reports/[eventId]/page.tsx`) now puts the regeneration flow (signatory setup + Generate) ABOVE the superseded PDF when the latest report is cancelled/rejected — the flow is the primary action; viewer-first order kept for pending/approved/no-report states. Verified: `tsc --noEmit` clean, `next build` passes.
**Status:** Step 21 complete — real cancel + the report PDF is now reachable from every report state (persistent viewer). New `POST /api/reports/[reportId]/cancel` (`app/api/reports/[reportId]/cancel/route.ts`): `requireRole("treasurer")` → 404 report/event missing or cross-dept → 409 archived event → 409 `status !== "pending_adviser_approval"` → **conditional update** `.update({status:"cancelled"}).eq("id",reportId).eq("status","pending_adviser_approval").select("id")` — 0 affected rows = raced an adviser approve/reject → 409 "This report can no longer be cancelled" (same race guard as `withdrawPendingEntry`) → `audit_logs` `report.cancelled` (metadata: event_id, fs_document_number, revision_count) → `revalidatePath` x4 → `{success:true}`. Event unlocks automatically (is_locked derived — no row touched). UI: new `components/reports/CancelReportButton.tsx` (client, two-step confirm, real fetch, `router.refresh()` on success) used in BOTH the ephemeral generation preview and the new persistent viewer; the Step 20 mock cancel ("nothing was created (mock)") deleted from `ReportGenerationFlow.tsx`. New `components/reports/ReportViewer.tsx` (server component, zero client state — survives logout/login by construction): FS No. + `StatusBadge` + PDF iframe (`/api/reports/[reportId]/pdf`, `h-[70vh]`) + lock warning + Cancel button only when `pending_adviser_approval` && !archived. `app/treasurer/reports/[eventId]/page.tsx` restructured: one card renders the viewer whenever `latestReport` exists (pending/approved = locked view w/ cancel-when-pending; rejected/cancelled = superseded PDF + regen flow below; archived = read-only PDF) and the `ReportGenerationFlow` only when `!isArchived && !isLocked`. No notification on cancel (no `report_cancelled` type in `notifications`; overview requires none). Verified: `tsc --noEmit` clean, `next build` passes (25 routes, `/api/reports/[reportId]/cancel` registered f), dev server live — unauth cancel → 401, unauth pdf → 404 (guard layer). Full E2E (generate → leave page → PDF persists → cancel → unlocked → regen same FS No. rev 2) pending the interactive browser session.

History (Steps 16/15, still true): `submitManualEntry` server action in `actions/entries.ts` replaces the mock `onSubmit` on both treasurer surfaces. Per-form gate: threshold `max(minCeiling, budget_total × pct/100)` per category (floors + percentages in `manual-categories.ts` `CategoryConfig`, cents via `manualGateThresholdCents` helper); over-ceiling without explanation → `{ explanationRequired, overAmount, threshold }` with **zero writes**, second call with `aboveRangeExplanation` inserts and stores `above_range` in `form_payload_json` (witness/justification/field values/route/occasion/recipient + `item_breakdown`). Guard chain = `requireRole("treasurer")` → event exists → dept match → not archived → no pending/approved report (`is_locked` derived) — mirrors `discardReceiptEntry`. Upload-first: crypto id → `uploadReceipt` before insert; upload failure = no row, form intact. Audit `entry.manual_submitted` + best-effort `notifications` insert (`manual_entry_pending` → active dept adviser). UI: `ManualQuickForm` gate callout (AlertTriangle, required explanation textarea, warning tokens, "Submit with Explanation"), synchronous `submitLockRef` kills double-submit (reset in `finally` so explanation retry works), server errors inline; `LogEntryModal` + standalone `entries/new` both call the action, advance to success only on confirmed insert, `router.refresh()` after. Verified: `scripts/check-manual-gate.ts` (asserts gate math incl. ₱800-on-₱1,000 floor case) passes, `tsc --noEmit` clean, `next build` passes, DB schema confirmed (`form_payload_json`/`item_breakdown` jsonb, no type/status CHECK constraints, RLS allows dept insert). Notes: cross-user notification inserts proven working (2 `adviser_signup_pending` rows in prod DB — `notifications_own` policy doesn't block); no E2E run (no treasurer creds — assertions pending a manual login test); orphan-blob-on-post-insert-failure accepted + audited. `ai_parsed → deducted` now happens ONLY on explicit treasurer confirm. New `confirmReceiptEntry` server action in `actions/entries.ts` (the only path that writes `deducted`): requireRole treasurer + precondition chain mirroring the receipt POST route (event exists, dept match, not archived, no pending/approved report — derived `is_locked`); server-authoritative cents math (`budget_total − Σ deducted − amount`, all ×100); overspending with no explanation returns `{ overspendRequired, overshoot }` with **zero write** — the second call with `overspendExplanation` deducts and sets `causes_overspend`/`overspend_explanation`; conditional update `.eq("status","ai_parsed")` + re-fetch makes double-click idempotent; audit `entry.confirmed`; revalidates treasurer home + event dashboard. UI: `LogEntryModal` (desktop + mobile sheet) and standalone `entries/new` page both wired to the real action — inline warning callout (₱ overshoot, warning tokens), required explanation textarea, "Confirm Overspend" button label, server errors shown inline, mock `handleConfirm` deleted from both surfaces. **Abandoned-review cleanup:** closing the modal (X / overlay / Escape / drag / Cancel) without confirming fires `discardReceiptEntry` fire-and-forget (server-guarded) — kills stranded `ai_parsed` ghost rows; close is safe post-confirm (`confirmed` flag) and after discard (`entryId` cleared). Also fixed a guard parity gap: `discardReceiptEntry` now also checks `is_locked` (was archived-only) so all entry mutations are blocked during pending/approved reports. `tsc --noEmit` clean, `next build` passes. Notes: `treasurer_reviewed` enum member exists but is unused — the authoritative transition is `ai_parsed → deducted` (build-plan law); orphaned receipt blobs for discarded entries are unreachable (keyed by deleted entryId) — cleanup deferred; overspend callout duplicated between `LogEntryModal` inline and `ReceiptReview.tsx` — dedupe recorded as debt; Step 18 adds `overspend_resolved_by/at` + report-time resolution stamps (explanation capture is already in place).

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

- [ ] 24 Archive Event — Full UI
- [ ] 25 Archive Event — Real Logic

### Phase 10 — Notifications

- [ ] 26 Push Notifications — Full Setup
- [ ] 27 Notification Retention Job

### Phase 11 — Audit & Read-Only Views

- [ ] 28 Audit Log — Admin View
- [ ] 29 Adviser & Admin Read-Only Event/Report Views

**Total: 18 / 30 features complete**

---

## Decisions Made During Build

*Condensed 2026-08-08 (twice) on request — full verbatim history preserved in git.*

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
