# Project Overview

## About the Project

**Liquifi** is a full stack liquidation-management system for department councils at Mabini Colleges. It replaces manual expense computation and physical receipt-keeping with a digital workflow: treasurers log expenses either by uploading a receipt photo (AI-parsed via OpenRouter) or filling a no-receipt form, advisers review and approve, and the system tracks running budgets in real time. Once an event's spending is fully resolved, the treasurer generates a signed Financial Report PDF, routes it through adviser approval and offline physical signing, then archives the event as a permanent, read-only record.

All monetary values are in **PHP (₱)**, stored as `decimal(12,2)`.

---

## The Problem It Solves

Department councils currently track event spending on paper — torn, faded, or lost receipts; manual arithmetic for running totals; physical liquidation reports assembled by hand. There is no single source of truth for what was spent, no audit trail for corrections, and no transparency for advisers until a report is physically handed to them.

Liquifi digitizes the entire lifecycle: every entry is parsed or recorded digitally, every budget number updates immediately, every approval and void is attributed and timestamped, and every finalized report is tamper-evident (hash-anchored on Polygon) and permanently archived.

---

## Roles

| Role | Scope | Summary |
|---|---|---|
| **Admin** | Global | Creates departments, approves adviser signups, deactivates/reactivates any account, views all audit logs. Never creates events or entries. |
| **Adviser** | One department | Approves treasurer signups for their department, approves/rejects no-receipt entries (batchable) and Financial Reports (which also resolves overspend acknowledgments). Read-only on events/reports otherwise. |
| **Treasurer** | One department | Creates events, logs entries (receipt or manual), reviews AI parses, voids entries, generates reports. |

Exactly **one active adviser** and **one active treasurer** per department at any time — enforced at the database level (partial unique indexes), not just in application logic.

---

## Pages

```
Public
  /                              → Landing
  /login
  /signup
  /pending-approval
  /forgot-password
  /otp                            → OTP verify (signup verification + password reset)
  /change-password                → Set new password (password reset only)

Treasurer
  /treasurer/home                          → Events list
  /treasurer/events/new                    → Event creation form
  /treasurer/events/[eventId]              → Event dashboard (Total / Spent / Remaining, entries)
  /treasurer/events/[eventId]/entries/new  → Receipt upload or manual form
  /treasurer/reports
  /treasurer/reports/[eventId]
  /treasurer/notifications
  /treasurer/profile

Adviser
  /adviser/home
  /adviser/events/[eventId]                → View-only
  /adviser/approvals                       → Tabs: Pending Expenses | Pending Users
  /adviser/reports
  /adviser/reports/[eventId]
  /adviser/notifications
  /adviser/profile

Admin
  /admin/departments
  /admin/departments/new
  /admin/departments/[deptId]
  /admin/departments/[deptId]/events
  /admin/departments/[deptId]/events/[eventId]
  /admin/departments/[deptId]/reports
  /admin/departments/[deptId]/reports/[eventId]
  /admin/departments/[deptId]/audit-logs
  /admin/departments/[deptId]/users        → View/deactivate/reactivate only
  /admin/approvals                         → Adviser signup approvals
  /admin/profile
```

Role checks happen **server-side** in each route group's layout — navigation is cosmetic, not the security boundary.

---

## Navigation

```
Sidebar (web) / Bottom nav (mobile) — icons, minimal:
  Treasurer → Home, Notifications, Reports, Profile
  Adviser   → Home, Approvals, Notifications, Reports, Profile
  Admin     → Departments, Approvals, Profile
```

---

## Core User Flow

### Onboarding

- User signs up at `/signup` — first/middle/last name, email, password, role (Treasurer or Adviser — Admin never self-selectable), department (required, admin-managed list).
- Email OTP verification (10 min expiry, resend after 60s, max 5/hour, 5 wrong attempts locks the OTP).
- Account enters `pending_approval` → held at `/pending-approval`.
- **Adviser applicants** → routed to Admin's queue (`/admin/approvals`).
- **Treasurer applicants** → routed to their department's Adviser's queue (`/adviser/approvals` → "Pending Users").
- No blocking at signup even if the department already has an active adviser/treasurer — applications queue up and the reviewer manually decides when to deactivate the current holder and approve a replacement. No cooldown on rejected signups; the applicant may sign up again immediately.
- Approved → `/login` → redirected by role to their home page.
- Admin accounts are never created via signup — pre-provisioned only.

### Password Reset (Forgot Password)

- User requests a reset at `/forgot-password` by entering their account email.
- A reset OTP is sent (same OTP rules as signup: 10 min expiry, resend after 60s, max 5/hour, 5 wrong attempts locks and forces resend).
- User verifies the code at `/otp?purpose=reset` → routed to `/change-password`.
- At `/change-password`, the user sets a **new password** and **confirms** it (both required, must match).
- On success → `/login`.
- Part of Phase 1: UI screens built first with mock submit handlers (no InsForge calls), real OTP-send / verify / password-update wired in Phase 1 / `03`.

### Event & Budget

- Treasurer creates an event with a name and total budget (`budget_total`).
- `budget_total` is editable only until the first entry is deducted — once any entry reaches `deducted` status, the budget is permanently locked (historical accuracy).
- Event dashboard shows Total / Spent / Remaining in real time.

### Logging Expenses — Two Methods

**Method 1 — Receipt (AI-parsed):**
- Treasurer uploads one document image per upload.
- OpenRouter extracts: verbatim document type label, normalized document type category, document number (tied to the matching label, not incidental POS metadata), issue date/time, supplier name, final amount paid, and a required itemized breakdown.
- Duplicate check: rejects if (document type + document number) already exists in the same event.
- Treasurer reviews the parse **read-only** — cannot edit. If wrong, discard and re-upload.
- Confirm → entry deducts from budget immediately.

**Method 2 — No Receipt (manual):**
- Treasurer fills a form; system computes the total.
- Entry goes to `pending_approval` for the adviser.
- Adviser can multi-select and batch-approve, or reject a single entry with a reason (treasurer edits and resubmits).
- Approved → deducted from budget.

### Overspend Handling

- Any entry that pushes Remaining below ₱0 still deducts immediately and is flagged `causes_overspend = true` with a treasurer-submitted explanation.
- No standalone adviser interrupt at flag time — all unresolved overspend entries surface together on the report-approval screen, resolved in one action alongside approving the report.

### Voiding Entries

- The **current active treasurer** of the department may void any entry in that department — not limited to whoever created it — with a required reason.
- Void is only available while the event is unlocked (no report currently pending approval or approved).
- Voided entries stay visible in the event history and are excluded from all spend totals.

### Report Generation & Signing

- Precondition: all manual entries resolved, and no existing report for the event is currently pending or approved.
- Treasurer defines/reuses signatories (position + name) → PDF generated with a unique `fs_document_number` (`FS-{DEPTCODE}-{YYYY}-{00001}`, per department, per year).
- Report enters `pending_adviser_approval`; the event **locks** (no new entries, voids, or budget edits) until the report leaves this status.
- Adviser reviews the full entry list (including voided entries) and any unresolved overspend, then:
  - **Approves** → resolves all overspend acknowledgments and marks the report `approved` (downloadable/printable); event stays locked through archiving.
  - **Rejects** (reason required, optional per-entry comments) → event unlocks; treasurer fixes issues and regenerates a **new report row** reusing the same `fs_document_number`.
- Treasurer may also **cancel** a pending report themselves before the adviser acts (no reason required) — same regeneration behavior as rejection.
- Approved reports are hash-anchored on Polygon for tamper-evidence.

### Archiving an Event

- Treasurer uploads all pages of the physically signed report.
- OpenRouter verifies: matching `fs_document_number`, signature-like marks in each signatory block, and matching page count (completeness check only — not a forgery/authenticity check).
- All checks pass → event status becomes `archived` (terminal, fully read-only forever). No further entries, voids, edits, or report regeneration.
- The approved report remains downloadable/printable indefinitely.

---

## Data Ownership Principle

All `Entry`, `Event`, `Report`, and file assets belong to `department_id`, not to the user who created them. Fields like `created_by`, `voided_by`, `approved_by`, `generated_by` are attribution metadata only — no table cascades on user deletion, since accounts only ever move to `deactivated`, never physically removed.

---

## Notifications

- Push notifications (Web Push API) for: report ready for approval (fires on every regeneration too), signup approvals, and other role-relevant events.
- `Notification` rows are disposable UI convenience — auto-deleted 1 year after creation regardless of read state. `AuditLog` is the permanent record and is never subject to cleanup.

---

## Features In Scope

- Signup/login with email OTP, role + department selection
- Forgot-password reset flow: email → OTP → set new password (Phase 1)
- Admin approval of adviser signups; adviser approval of treasurer signups
- One active adviser + one active treasurer per department, enforced at the DB level
- Event creation with immutable-after-spend budget
- Receipt entry via AI-parsed OCR (OpenRouter), with required itemized breakdown
- No-receipt manual entry with adviser approval (batchable)
- Overspend flagging with adviser acknowledgment folded into report approval
- Entry voiding by the current active treasurer, department-wide
- Financial Report generation with per-report signatories, PDF rendering, adviser approval, rejection/cancellation with regeneration
- Signed-document upload with AI completeness verification
- Event archiving (terminal, read-only)
- Polygon hash-anchoring of approved reports
- Push notifications with 1-year retention
- Full audit logging of every mutating action
- Department-scoped realtime channels and RLS

## Features Out of Scope

- Editing AI-parsed receipt fields (discard and re-upload instead)
- Automated waitlisting/auto-promotion/auto-rejection logic for adviser or treasurer succession
- Signup cooldown after rejection
- Per-entry adviser push notifications for overspend (consolidated into report approval)
- Revoking an already-approved report
- Authenticity/forgery verification of physical signatures (completeness check only)
- Per-department customizable report templates (single fixed template)
- Physical signing performed inside the app (offline step)

---

## Success Criteria

- A treasurer can create an event, log both receipt and manual entries, and see Remaining update correctly in real time
- Duplicate receipts are correctly rejected within the same event
- Adviser batch-approval of no-receipt entries works with individual audit attribution
- Overspend entries are correctly surfaced and resolved during report approval, gating archiving
- Void authority correctly transfers to a new active treasurer after succession
- Report regeneration after rejection/cancellation reuses the same `fs_document_number` and increments `revision_count` without ever overwriting the prior PDF
- Event locking correctly blocks entries/voids/budget edits while a report is pending or approved
- Archiving is correctly blocked until the signed-document AI check passes
- All role/department/state authorization checks are enforced server-side, matching the route × role × precondition matrix
- RLS policies and realtime channel scoping correctly isolate each department's data
