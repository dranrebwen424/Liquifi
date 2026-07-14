# Build Plan

## Core Principle

Full page UI built with mock data first — verified visually before any logic is written. Then functionality is built and wired to the UI step by step. Every feature must be visible and testable before moving to the next. No invisible backend phases.

Because Liquifi is state-machine heavy, every wiring step must also implement the relevant precondition checks (role × department × resource state) from `architecture.md` — not just the happy-path write. A feature is not "done" until its guard conditions are testable too (e.g. confirm a locked event actually blocks the action in the UI and rejects it server-side).

---

## Phase 0 — Authorization Foundation

### 00 Route × Role × Precondition Matrix

Build the authorization matrix before any routes or API logic. This single artifact drives both the InsForge RLS policies and the `lib/auth-guard.ts` middleware, making every later wiring step mechanical rather than a judgment call.

**Logic:**

- Produce one markdown table enumerating every route (from `architecture.md` and `project-overview.md`) with columns:
  - **Route** — path pattern
  - **Method** — GET / POST / PUT / DELETE
  - **Role** — admin / adviser / treasurer / public
  - **Department match?** — yes (resource must belong to actor's department) / no (admin global) / n/a (public)
  - **State preconditions** — resource-state checks required before allowing the action:
    - `Event.is_locked` (must be `false` for entries/voids/edits)
    - `Event.budget_locked` (must be `false` for budget edits)
    - `Entry.status` (must be specific value for transitions)
    - `Report.status` (must be specific value for approve/reject)
    - `Event.status !== 'archived'` (all mutations)
  - **RLS policy** — the InsForge row-level policy rule
- Store the matrix as `docs/auth-matrix.md` — it is a spec artifact, not runtime code
- Build `lib/auth-guard.ts` directly from the matrix: one function that accepts `(requiredRole, departmentId?, preconditionCheck?)` and throws if any check fails
- Every later phase's wiring step references this matrix instead of re-deriving guard conditions

---

## Phase 1 — Foundation

### 01 Landing + Auth Shell

Build the complete landing page and auth screen UI.

**UI:**

- Landing page — hero, how-it-works, footer
- Login page — email + password form
- Signup page — first/middle/last name, email, password, role selector (Treasurer | Adviser only), department picker (mock list)
- OTP verification screen — 6-digit input, resend link (disabled countdown), "Verify" button
- Pending approval screen — holding message, "we'll notify you" copy
  - Forgot password screen — email → OTP (reset purpose) → change-password (new password + confirm password) → login

**Logic:**

- None yet — static UI only, mock submit handlers

---

### 02 Database Schema

All InsForge tables created before any data is written.

**Logic:**

- Create `departments`, `users`, `events`, `entries`, `reports`, `report_signatories`, `entry_comments`, `department_report_counters`, `notifications`, `push_subscriptions`, `audit_logs` tables with all columns from `architecture.md`
- Partial unique indexes:
  - `UNIQUE(department_id) WHERE role = 'adviser' AND account_status = 'active'`
  - `UNIQUE(department_id) WHERE role = 'treasurer' AND account_status = 'active'`
- Create storage buckets following the `storage/departments/{department_id}/events/{event_id}/...` layout
- RLS policies on every `department_id`-bearing table: adviser/treasurer scoped to their own `department_id`, admin unrestricted
- Realtime channels scoped per department

---

### 03 Auth — Signup, OTP, Approval Routing

Wire the auth shell to InsForge Auth + OTP.

**Logic:**

- InsForge email/password signup, writes `users` row with `account_status = pending_approval`
- Email OTP: 10 min expiry, resend after 60s (max 5/hour), 5 wrong attempts locks the OTP and forces resend
- On verified OTP → `pending_approval` state, redirect to `/pending-approval`
- Signup role = Adviser → notification/queue entry routed to `/admin/approvals`
- Signup role = Treasurer → routed to that department's active adviser's `/adviser/approvals` ("Pending Users" tab)
- No blocking at signup even if the department already has an active adviser/treasurer
  - Forgot password: OTP-based reset (reuses `app/api/auth/otp/send` + `otp/verify` with a reset intent; same OTP rules as signup) → `/change-password` (new password + confirm) → `/login`
- Admin accounts are never created via `/signup` — role selector excludes "Admin" in UI and server-side validation

---

### 04 Login, Session, Role-Based Redirect

**Logic:**

- InsForge login with session cookie
- Middleware protects `/treasurer/*`, `/adviser/*`, `/admin/*` route groups
- Each route group layout enforces a server-side role check (never client-only)
- On login → redirect by role: Treasurer → `/treasurer/home`, Adviser → `/adviser/home`, Admin → `/admin/departments`
- Rejected accounts cannot log in; no resubmit path — must sign up again from scratch (no cooldown)

---

## Phase 2 — Admin: Departments & Approvals

### 05 Admin Departments Page — Full UI

Build the complete admin departments UI with mock data.

**UI:**

- Departments list — name, code, active adviser/treasurer indicators, active/inactive toggle
- New department form — name, code
- Department detail — tabs: Events, Reports, Audit Logs, Users
- Users tab — list with role, status, deactivate/reactivate action (view-only otherwise)

**Logic:**

- None yet — mock data only

---

### 06 Admin Departments — Real Data + Mutations

**Logic:**

- Server Action `actions/departments.ts` — create department (name, code), toggle `is_active`
- Deactivate/reactivate user action — writes `account_status`, logs to `audit_logs`
- `has_active_adviser` / `has_active_treasurer` displayed as derived read values (computed from `users` query, not stored fields the UI can drift from)
- `revalidatePath` after every mutation

---

### 07 Admin Approvals — Adviser Signups

**UI:**

- `/admin/approvals` — list of pending adviser applicants, department name, applied date, Approve/Reject buttons
- Explicitly shows applicants for departments that already have an active adviser (no hiding/filtering)

**Logic:**

- POST/Server Action approves or rejects a pending adviser applicant
- Approve → `account_status = active`, push notification to the new adviser
- Reject → `account_status = rejected` (terminal, no resubmit path)
- Admin manually deactivates a current adviser as a separate, explicit action before approving a replacement — no automatic supersede
- Audit log entry on every approve/reject/deactivate

---

## Phase 3 — Adviser: Approvals

### 08 Adviser Approvals Page — Full UI

Build the complete adviser approvals UI with mock data.

**UI:**

- `/adviser/approvals` — two tabs: "Pending Expenses" and "Pending Users"
- Pending Users tab — list of pending treasurer applicants for this adviser's department, Approve/Reject buttons
- Pending Expenses tab — list of `pending_approval` manual entries, multi-select checkboxes, "Approve Selected" button, single Reject (with required reason) per row

**Logic:**

- None yet — mock data only

---

### 09 Adviser Approvals — Real Data + Mutations

**Logic:**

- Pending Users: same approve/reject pattern as Phase 2, scoped to the adviser's own department, routes through `account_status`
- Pending Expenses: batch approve — each selected `Entry` transitions `pending_approval → deducted` individually, each stamped with its own `approved_by`/`approved_at` (same audit trail as single approval, batching is a UI/endpoint convenience only)
- Single-entry reject requires `rejection_reason` → `Entry.status = rejected` → treasurer edits and resubmits (`resubmitted → pending_approval` loop) or discards (`discarded`, terminal)
- Audit log entry on every approval/rejection

---

## Phase 4 — Treasurer: Events & Budget

### 10 Treasurer Home + Event Creation — Full UI

Build the complete treasurer events list and event creation UI with mock data.

**UI:**

- `/treasurer/home` — events list, status badges (open/archived), Total/Spent/Remaining preview per card, "New Event" button
- `/treasurer/events/new` — event name, budget total form

**Logic:**

- None yet — mock data only

---

### 11 Event Creation + Budget Lock — Real Data

**Logic:**

- Server Action `actions/events.ts` — creates `Event` row (`status = open`, `budget_locked` computed, not stored)
- `budget_total` editable only while `budget_locked = false` — `budget_locked` derived as `EXISTS(entry WHERE event_id = X AND status = 'deducted')`
- Budget edit form is disabled once `budget_locked = true`, with a visible reason shown, not just a silently failing save
- Server Action rejects a budget edit attempt server-side too, even if the UI is bypassed

---

### 12 Event Dashboard — Full UI

Build the complete event dashboard UI with mock data.

**UI:**

- `/treasurer/events/[eventId]` — Total / Spent / Remaining summary bar (Remaining shown in red/negative styling when overspent)
- Entry list — receipt/manual type indicator, status, amount, voided entries shown struck-through/tagged
- "Log Entry" button → `/treasurer/events/[eventId]/entries/new`
- "Generate Report" button (disabled state defined, wired in Phase 6)
- `is_locked` banner shown when a report is pending/approved for this event

**Logic:**

- None yet — mock data only

---

## Phase 5 — Treasurer: Logging Entries

### 13 Entry Logging — Full UI

Build the complete entry logging UI (both methods) with mock data.

**UI:**

- `/treasurer/events/[eventId]/entries/new` — method toggle: Receipt Upload vs No Receipt (manual form)
- Receipt Upload — drag/drop or file picker (image only), "one document per upload" note, upload progress state
- Receipt Review (post-parse) — all extracted fields shown **read-only**: document type (verbatim), document number, issue date/time, supplier name, amount, itemized breakdown table; Confirm and Discard buttons
- Manual form — category, amount fields, computed total display, submit button

**Logic:**

- None yet — mock data only

---

### 14 Receipt Parsing — OpenRouter Integration

**Logic:**

- API route `app/api/entries/receipt` receives the uploaded image
- Calls `agent/receipt-parser.ts` (OpenRouter): extracts `document_type_raw` (verbatim, never forced into an enum), `document_type_category` (normalized, falls to `other`), `document_number` (Rule A — tied to the label matching `document_type_raw`, not incidental POS metadata), `issue_date`/`issue_time` (time optional, never combined), `supplier_name`, `amount` (Rule B — final Amount Due, never sub-total), `item_breakdown` (required)
- Duplicate check: reject if `(document_type_raw + document_number)` already exists for an entry in the same event
- A failed/malformed parse **never creates an `Entry` row** — image stays client-side as a retryable upload
- Only a successful parse creates the `Entry` row, directly at `ai_parsed` status
- After 3 failed attempts, UI surfaces the manual-entry fallback

---

### 15 Receipt Confirm / Discard + Budget Deduction

**Logic:**

- Confirm → `Entry.status = deducted`, budget deducted, `budget_locked` becomes true as a side effect
- If this deduction pushes Remaining below ₱0 → `causes_overspend = true`, treasurer prompted for `overspend_explanation`
- Discard → `Entry` row deleted, no budget impact, re-upload available
- Entry actions blocked entirely if `Event.is_locked = true`

---

### 16 Manual (No-Receipt) Entry Submission

**Logic:**

- Server Action creates `Entry` at `draft` → immediately submitted to `pending_approval` (system computes total from `form_payload_json`)
- Push notification to the department's active adviser
- Blocked if `Event.is_locked = true`
- Rejected entries (from Phase 9) resubmit through this same submission path, transitioning `rejected → resubmitted → pending_approval`

---

## Phase 6 — Voiding & Overspend

### 17 Void Entry — Full UI + Logic

**UI:**

- Void action on each `deducted` entry row (visible only to treasurer, hidden entirely for adviser/admin read-only views)
- Void modal — required reason field

**Logic:**

- Void allowed by the **current active treasurer** of the department, on any entry regardless of `created_by`
- Only available while `Event.is_locked = false`
- `voided_by`, `voided_at`, `void_reason` recorded; entry stays visible in the list, excluded from all spend totals (`SUM(amount) WHERE status = 'deducted'`)
- Voiding a deducted entry does **not** unlock `budget_locked` — historically accurate, never reopens budget editing

---

### 18 Overspend Explanation Flow

**UI:**

- Overspend modal triggered automatically when a confirmed/approved entry pushes Remaining below ₱0
- Explanation textarea, required to submit

**Logic:**

- `causes_overspend = true`, `overspend_explanation` saved
- No standalone adviser push at this stage — entry sits with `overspend_resolved_by/at = null` until report-approval time (Phase 8)
- `Event.has_unresolved_overspend` recalculated whenever an overspend entry's resolution state changes

---

## Phase 7 — Reports: Generation

### 19 Report Generation — Full UI

Build the complete report generation UI with mock data.

**UI:**

- "Generate Report" flow from the event dashboard
- Signatory Setup step — position + full name rows, add/remove row, "reuse last list" option
- Generated report preview screen — PDF preview, `fs_document_number` shown, status badge (`pending_adviser_approval`)
- "Cancel Report" button (treasurer-only, before adviser acts)

**Logic:**

- None yet — mock data only

---

### 20 Report Generation — Real Logic

**Logic:**

- Precondition: all manual entries resolved (approved/discarded/terminally rejected)
- Precondition: no existing `Report` for this event currently `pending_adviser_approval` or `approved` — "Generate Report" disabled client-side and rejected server-side otherwise
- `fs_document_number` assigned via `DepartmentReportCounter` (read-then-increment, format `FS-{DEPTCODE}-{YYYY}-{00001}`, resets per department per calendar year) — assigned once, persists across regeneration
- `ReportSignatory` rows saved (position, full_name, sort_order)
- `@react-pdf/renderer` builds the PDF (`components/reports/ReportPdf.tsx`) — letterhead, dept/event/`fs_document_number`, itemized table, totals block, dynamic signatory block
- `Report.status = pending_adviser_approval`; `Event.is_locked` becomes true as a derived side effect — event dashboard immediately reflects the lock (no new entries, voids, or budget edits)
- Push notification to the department's active adviser

---

### 21 Cancel Pending Report

**Logic:**

- Treasurer-initiated, no reason required, only before the adviser acts
- `Report.status = cancelled` (terminal for that row)
- `Event.is_locked` returns to false
- Regeneration later creates a new `Report` row reusing the same `fs_document_number`, `revision_count` incremented (audit-only, never printed on the PDF)

---

## Phase 8 — Reports: Adviser Review

### 22 Adviser Report Review — Full UI

Build the complete report review UI with mock data.

**UI:**

- `/adviser/reports/[eventId]` — full entry list (voided entries visible, tagged), unresolved overspend entries surfaced inline
- "Acknowledge overspend & Approve" primary action
- "Reject" action — required `rejection_reason` textarea, optional per-entry comment inputs on flagged rows

**Logic:**

- None yet — mock data only

---

### 23 Report Approve / Reject — Real Logic

**Logic:**

- Approve → single action: stamps `overspend_resolved_by/at` on every unresolved overspend entry for the event AND sets `Report.status = approved`; `Event.is_locked` stays true through to archiving
- On approval: `agent/report-anchor.ts` computes SHA-256 hash of (`fs_document_number` + final PDF bytes + full set of entry IDs/amounts), submits to Polygon, stores `polygon_tx_hash` on the `Report` row — this is the only point anchoring ever happens
- Reject → `rejection_reason` required; optional `EntryComment` rows saved (tied to this `report_id`, so they stay attached to the revision they were made against); `Event.is_locked` returns to false
- Fresh push notification to the treasurer on every regeneration cycle, same payload shape as original ("[Event name] report ready for approval") — confirmed working on resubmission, not just first generation

---

## Phase 9 — Archiving

### 24 Archive Event — Full UI

Build the complete signed-document upload / archive UI with mock data.

**UI:**

- "Archive Event" button on event dashboard (replaces old "Mark as Done" language entirely) — visible only once `Report.status = approved`
- Upload modal — explicit "capture/upload every page of the fully signed report, not just the signature page" notice, multi-page upload
- Post-check result screen — pass/fail per check with reasons shown on failure, modal stays open on failure

**Logic:**

- None yet — mock data only

---

### 25 Archive Event — Real Logic

**Logic:**

- `agent/document-verifier.ts` (OpenRouter) checks: `fs_document_number` on uploaded pages matches this report, signature-like marks present in each expected signatory block, page count matches the originally generated PDF
- Scope explicitly limited to completeness/presence checks — never claims authenticity verification
- Any check fails → reject upload, show reason, modal stays open, nothing saved
- All pass → `signed_document_urls`, `signing_confirmed_by/at` saved; `Event.status = archived` (terminal); `archived_at`/`archived_by` recorded
- Once archived: every route under this event rejects mutation attempts at the guard layer, regardless of role — approved report remains downloadable/printable indefinitely

---

## Phase 10 — Notifications

### 26 Push Notifications — Full Setup

**Logic:**

- `lib/web-push.ts` — subscribe/send wrapper around `web-push`
- Service worker registered for push receipt
- `POST /api/notifications/subscribe` saves `PushSubscription` rows
- Notification types wired per the table in `code-standards.md`: report ready for approval, adviser/treasurer signup pending, signup approved/rejected, report rejected
- `/treasurer/notifications` and `/adviser/notifications` pages — list, read/unread state, mark-as-read on open

---

### 27 Notification Retention Job

**Logic:**

- Scheduled function (cron / InsForge scheduled function) hard-deletes `Notification` rows older than 1 year, regardless of `read` state
- `AuditLog` is never touched by this job — confirmed via test data spanning the retention boundary

---

## Phase 11 — Audit & Read-Only Views

### 28 Audit Log — Admin View

**UI:**

- `/admin/departments/[deptId]/audit-logs` — table: actor, action, target type/id, timestamp, expandable metadata

**Logic:**

- Query `audit_logs` scoped to `department_id`, admin-only route
- Confirms every mutating action across Phases 2–9 actually wrote a row here — this phase doubles as an end-to-end audit check on everything built so far

---

### 29 Adviser & Admin Read-Only Event/Report Views

**Logic:**

- `/adviser/events/[eventId]` and `/admin/departments/[deptId]/events/[eventId]` reuse the treasurer event dashboard components with all mutating controls hidden (per the "role-scoped read-only mode" convention in `ui-registry.md`)
- Same pattern applied to `/adviser/reports/[eventId]` (outside the approval action) and `/admin/departments/[deptId]/reports/[eventId]`

---

## Feature Count

| Phase                                     | Features |
| ------------------------------------------- | -------- |
| Phase 0 — Authorization Foundation         | 1        |
| Phase 1 — Foundation                       | 4        |
| Phase 2 — Admin: Departments & Approvals    | 3        |
| Phase 3 — Adviser: Approvals                | 2        |
| Phase 4 — Treasurer: Events & Budget         | 3        |
| Phase 5 — Treasurer: Logging Entries         | 4        |
| Phase 6 — Voiding & Overspend                | 2        |
| Phase 7 — Reports: Generation                 | 3        |
| Phase 8 — Reports: Adviser Review             | 2        |
| Phase 9 — Archiving                           | 2        |
| Phase 10 — Notifications                      | 2        |
| Phase 11 — Audit & Read-Only Views            | 2        |
| **Total**                                    | **30**   |
