# Architecture

## Stack

| Layer                        | Tool                                       | Purpose                                              |
| ----------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Framework                    | Next.js (latest, App Router)               | Full stack framework                                 |
| Auth + DB + Storage + Realtime + OTP | InsForge                             | Entire backend                                       |
| Push notifications           | Web Push API + `web-push` + Service Worker  | Adviser/treasurer alerts                             |
| AI                           | OpenRouter                                  | Receipt OCR/parsing, signed-document completeness check |
| PDF generation               | @react-pdf/renderer                         | Financial Report PDF rendering                       |
| Immutability                 | Polygon (hash-anchoring only)               | Tamper-evidence for approved reports                 |
| Styling                      | Tailwind CSS + shadcn/ui                    | UI components and styling                            |
| Icons                        | lucide-react                               | All iconography                                    |
| Animation (micro)            | framer-motion                              | Mount/unmount, stagger, spring, layout transitions |
| Animation (heavy/timeline)   | GSAP                                       | ScrollTrigger, SVG animation, complex sequences    |
| Animation (loading)          | lottie-web                                 | Lottie JSON rendering (loading states only)        |
| Language                     | TypeScript (strict)                         | Throughout                                           |

---

## Folder Structure

```
/
├── AGENTS.md
├── context/
│   ├── project-overview.md
│   ├── architecture.md
│   ├── ui-tokens.md
│   ├── ui-rules.md
│   ├── code-standards.md
│   ├── build-plan.md
│   ├── ui-registry.md
│   └── progress-tracker.md
├── app/
│   ├── layout.tsx                                  → Root layout
│   ├── page.tsx                                     → Landing page
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── otp/page.tsx                              → OTP verify (shared: signup + password reset)
│   │   ├── pending-approval/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── change-password/page.tsx                  → Set new password (password reset only)
│   ├── treasurer/
│   │   ├── home/page.tsx                            → Events list
│   │   ├── events/
│   │   │   ├── new/page.tsx                         → Event creation form
│   │   │   └── [eventId]/
│   │   │       ├── page.tsx                         → Event dashboard
│   │   │       └── entries/new/page.tsx             → Receipt upload or manual form
│   │   ├── reports/
│   │   │   ├── page.tsx
│   │   │   └── [eventId]/page.tsx
│   │   ├── notifications/page.tsx
│   │   └── profile/page.tsx
│   ├── adviser/
│   │   ├── home/page.tsx
│   │   ├── events/[eventId]/page.tsx                → View-only
│   │   ├── approvals/page.tsx                       → Tabs: Pending Expenses | Pending Users
│   │   ├── reports/
│   │   │   ├── page.tsx
│   │   │   └── [eventId]/page.tsx
│   │   ├── notifications/page.tsx
│   │   └── profile/page.tsx
│   ├── admin/
│   │   ├── departments/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [deptId]/
│   │   │       ├── page.tsx
│   │   │       ├── events/page.tsx
│   │   │       ├── events/[eventId]/page.tsx
│   │   │       ├── reports/page.tsx
│   │   │       ├── reports/[eventId]/page.tsx
│   │   │       ├── audit-logs/page.tsx
│   │   │       └── users/page.tsx
│   │   ├── approvals/page.tsx
│   │   └── profile/page.tsx
│   └── api/
│       ├── entries/
│       │   ├── receipt/route.ts                     → OpenRouter receipt parse + Entry creation
│       │   ├── manual/route.ts                       → Manual entry creation
│       │   ├── [entryId]/void/route.ts
│       │   └── [entryId]/approve/route.ts             → Batchable no-receipt approval
│       ├── reports/
│       │   ├── generate/route.ts                      → PDF generation + fs_document_number assignment
│       │   ├── [reportId]/approve/route.ts             → Overspend resolution + approval + Polygon anchor
│       │   ├── [reportId]/reject/route.ts
│       │   └── [reportId]/cancel/route.ts
│       ├── events/
│       │   ├── [eventId]/archive/route.ts             → Signed-document upload + AI completeness check
│   ├── auth/
│   │   ├── otp/send/route.ts                          → OTP send (signup + password-reset intents)
│   │   ├── otp/verify/route.ts                         → OTP verify (signup + password-reset intents)
│   │   └── change-password/route.ts                    → Password update after reset OTP verify
│       ├── approvals/
│       │   ├── adviser/route.ts                        → Admin approves/rejects adviser signups
│       │   └── treasurer/route.ts                      → Adviser approves/rejects treasurer signups
│       └── notifications/
│           └── subscribe/route.ts                      → Web Push subscription
├── agent/
│   ├── receipt-parser.ts                             → OpenRouter OCR + field extraction
│   ├── document-verifier.ts                          → Signed-document completeness check
│   ├── report-anchor.ts                              → Polygon hash-anchoring
│   └── types.ts
├── actions/
│   ├── events.ts                                     → Create event, edit budget (while unlocked)
│   ├── entries.ts                                     → Confirm/discard receipt entry, submit manual entry
│   ├── reports.ts                                     → Signatory setup, cancel report
│   └── departments.ts                                 → Admin department CRUD
├── hooks/
│   └── usePeopleReuse.ts                              → localStorage witness name persistence
├── components/
│   ├── ui/                                            → shadcn/ui components only
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── BottomNav.tsx
│   ├── auth/
│   │   ├── SignupForm.tsx
│   │   ├── OtpInput.tsx
│   │   └── LoginForm.tsx
│   ├── events/
│   │   ├── EventCard.tsx
│   │   ├── EventForm.tsx
│   │   └── BudgetSummary.tsx
│   ├── entries/
│   │   ├── ReceiptUpload.tsx
│   │   ├── ReceiptReview.tsx
│   │   ├── FloatingInput.tsx
│   │   ├── manual-categories.ts
│   │   ├── ManualCategoryPicker.tsx
│   │   ├── ManualQuickForm.tsx
│   │   ├── EntryList.tsx
│   │   ├── EntryRow.tsx
│   │   └── VoidEntryModal.tsx
│   ├── reports/
│   │   ├── SignatorySetup.tsx
│   │   ├── ReportPdf.tsx                               → @react-pdf/renderer template
│   │   ├── ReportReview.tsx
│   │   ├── OverspendPanel.tsx
│   │   └── SignedUploadModal.tsx
│   ├── approvals/
│   │   ├── PendingExpensesTab.tsx
│   │   └── PendingUsersTab.tsx
│   └── admin/
│       ├── DepartmentForm.tsx
│       └── AuditLogTable.tsx
├── lib/
│   ├── insforge-client.ts                            → InsForge browser client
│   ├── insforge-server.ts                            → InsForge server client
│   ├── openrouter.ts                                  → OpenRouter API client
│   ├── web-push.ts                                    → Push notification sending
│   ├── polygon.ts                                     → Hash-anchoring transaction submission
│   ├── auth-guard.ts                                  → Server-side role × department × state checks
│   └── utils.ts                                       → MATCH-style shared constants, formatters
└── types/
    └── index.ts                                        → Global TypeScript types
```

---

## System Boundaries

| Folder        | Owns                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `app/`        | Pages and API routes only. No business logic.                                                    |
| `agent/`      | AI/blockchain operations — receipt parsing, document verification, Polygon anchoring. Nothing here touches React. |
| `actions/`    | Server Actions for UI-triggered mutations only (events, entries, reports, departments).           |
| `components/` | UI only. No data fetching logic. No direct DB calls.                                              |
| `lib/`        | Third party client initialisation, auth-guard checks, and shared utilities only.                  |
| `types/`      | TypeScript types shared across the project.                                                       |

---

## Data Flow

### UI Mutations (Server Actions)

```
User interaction in component
        ↓
Server Action in actions/
        ↓
lib/auth-guard.ts — role × department × state check
        ↓
InsForge DB write
        ↓
revalidatePath
```

### Receipt Entry (API Route + Agent)

```
Treasurer uploads receipt image
        ↓
API route app/api/entries/receipt
        ↓
Calls agent/receipt-parser.ts (OpenRouter)
        ↓
Duplicate check (document_type_raw + document_number within event)
        ↓
Entry row created directly at ai_parsed (only on parse success)
        ↓
Treasurer confirms (view-only) → status → deducted
```

### Report Generation & Approval (API Routes + Agent)

```
Treasurer initiates generation
        ↓
API route app/api/reports/generate
        ↓
Preconditions checked (entries resolved, no pending/approved report exists)
        ↓
fs_document_number assigned (DepartmentReportCounter, read-then-increment)
        ↓
@react-pdf/renderer builds PDF with ReportSignatory rows
        ↓
Report.status = pending_adviser_approval → Event.is_locked = true (derived)
        ↓
Push notification to adviser
        ↓
Adviser approves → API route app/api/reports/[reportId]/approve
        ↓
Overspend entries resolved + Report.status = approved
        ↓
agent/report-anchor.ts — SHA-256 hash of (fs_document_number + PDF bytes + entry IDs/amounts) → Polygon
```

### Event Archiving (API Route + Agent)

```
Treasurer uploads signed document pages
        ↓
API route app/api/events/[eventId]/archive
        ↓
Calls agent/document-verifier.ts (OpenRouter)
        ↓
Checks: fs_document_number match, signature marks per signatory, page count match
        ↓
All pass → signed_document_urls saved → Event.status = archived (terminal)
```

### Password Reset (Forgot Password)

```
User enters email at /forgot-password
        ↓
app/api/auth/otp/send (intent = "reset") → InsForge sends reset OTP to email
        ↓
User enters 6-digit code at /otp?purpose=reset
        ↓
app/api/auth/otp/verify (intent = "reset") → same OTP rules as signup
        ↓
On success → /change-password
        ↓
User sets new password + confirm → app/api/auth/change-password
        ↓
InsForge updates the password → /login
```

- OTP rules identical to signup: 10 min expiry, resend after 60s (max 5/hour), 5 wrong attempts locks and forces resend.
- The `/otp` screen is shared between signup verification and password reset — distinguished by `intent` / `purpose`.
- UI screens are mock-first in Phase 1 (`01`); real OTP-send / verify / password-update wiring lands in Phase 1 (`03`).

---

## InsForge Database Schema

### `departments`

| Column               | Type    | Notes                                             |
| --------------------- | ------- | -------------------------------------------------- |
| id                    | uuid    |                                                    |
| name                  | text    |                                                    |
| code                  | text    | Short dept code (e.g. "CCS") — used in `fs_document_number` |
| is_active             | boolean |                                                    |
| has_active_adviser    | boolean | Derived, informational only                       |
| has_active_treasurer  | boolean | Derived, informational only                       |

### `users`

| Column           | Type        | Notes                                                        |
| ----------------- | ----------- | -------------------------------------------------------------- |
| id                | uuid        | References auth.users                                        |
| first_name        | text        |                                                                |
| middle_name       | text        | Optional                                                      |
| last_name         | text        |                                                                |
| email             | text        |                                                                |
| role              | text        | admin / adviser / treasurer                                  |
| department_id     | uuid        | Null for admin                                                |
| account_status    | text        | pending_approval / active / deactivated / rejected           |
| approved_by       | uuid        |                                                                |
| approved_at       | timestamptz |                                                                |
| otp_verified_at   | timestamptz |                                                                |

Partial unique indexes:
```sql
UNIQUE(department_id) WHERE role = 'adviser'   AND account_status = 'active'
UNIQUE(department_id) WHERE role = 'treasurer' AND account_status = 'active'
```

### `events`

| Column                    | Type        | Notes                                                                 |
| -------------------------- | ----------- | ------------------------------------------------------------------------ |
| id                         | uuid        |                                                                          |
| name                       | text        |                                                                          |
| department_id              | uuid        |                                                                          |
| created_by                 | uuid        | Attribution only                                                       |
| created_at                 | timestamptz |                                                                          |
| budget_total                | decimal(12,2) | Editable only while `budget_locked = false`                          |
| budget_locked               | boolean     | Derived — true once any entry reaches `deducted`                        |
| status                     | text        | open / archived                                                        |
| is_locked                   | boolean     | Derived — true while a Report is `pending_adviser_approval` or `approved` |
| has_unresolved_overspend   | boolean     | Blocks archiving                                                        |
| archived_at / archived_by  | timestamptz / uuid |                                                                    |

### `entries`

| Column                         | Type        | Notes                                                             |
| -------------------------------- | ----------- | -------------------------------------------------------------------- |
| id                                | uuid        |                                                                      |
| event_id                          | uuid        |                                                                      |
| created_by                        | uuid        | Attribution only                                                    |
| created_at                        | timestamptz |                                                                      |
| type                              | text        | receipt / manual                                                    |
| status                            | text        | draft / ai_parsed / treasurer_reviewed / pending_approval / approved / rejected / resubmitted / discarded / voided / deducted |
| amount                            | decimal(12,2) |                                                                     |
| category                          | text        |                                                                      |
| image_url                         | text        | Receipt entries only                                                |
| ocr_raw_json                      | jsonb       | Non-mandatory extracted fields                                       |
| document_type_raw                 | text        | Verbatim printed label                                               |
| document_type_category            | text        | System-normalized enum, for reporting/filtering only                 |
| document_number                    | text        | Tied to the label matching `document_type_raw`                       |
| issue_date / issue_time            | date / time | `issue_time` optional                                                |
| supplier_name                      | text        |                                                                      |
| item_breakdown                     | jsonb       | Required — description, qty, unit price, line amount                |
| form_payload_json                  | jsonb       | Manual entries only                                                  |
| computed_breakdown_json            | jsonb       | Manual entries only                                                  |
| approved_by / approved_at          | uuid / timestamptz |                                                                |
| rejection_reason                   | text        |                                                                      |
| voided_by / voided_at / void_reason | uuid / timestamptz / text | Void allowed by current active treasurer, not restricted to creator |
| causes_overspend                   | boolean     |                                                                      |
| overspend_explanation               | text        |                                                                      |
| overspend_resolved_by / at          | uuid / timestamptz | Set during report approval                                    |

### `reports`

| Column                              | Type        | Notes                                                            |
| -------------------------------------- | ----------- | -------------------------------------------------------------------- |
| id                                     | uuid        |                                                                      |
| event_id                                | uuid        |                                                                      |
| generated_by / generated_at             | uuid / timestamptz |                                                               |
| fs_document_number                      | text        | `FS-{DEPTCODE}-{YYYY}-{00001}` — assigned once, persists across regeneration |
| status                                  | text        | pending_adviser_approval / approved / rejected / cancelled           |
| rejection_reason                         | text        |                                                                      |
| revision_count                           | integer     | System/audit-only — never printed on the PDF                        |
| pdf_url                                  | text        |                                                                      |
| signed_document_urls                     | text[]      | All pages                                                            |
| signed_page_count                        | integer     | Used by AI page-count check                                          |
| signing_confirmed_by / at                | uuid / timestamptz |                                                                |
| acknowledged_by_adviser / acknowledged_at | boolean / timestamptz |                                                          |
| polygon_tx_hash                          | text        | Set on approval — hash of `fs_document_number` + PDF bytes + entry IDs/amounts |

### `report_signatories`

| Column      | Type | Notes                                       |
| ------------ | ---- | -------------------------------------------- |
| id           | uuid |                                              |
| report_id    | uuid | FK                                           |
| position     | text | e.g. "Auditor", "President/Governor", "Adviser", "Dean" |
| full_name    | text |                                              |
| sort_order   | integer |                                            |

### `entry_comments`

| Column      | Type        | Notes                                                        |
| ------------ | ----------- | ---------------------------------------------------------------- |
| id           | uuid        |                                                                  |
| entry_id     | uuid        | FK                                                                |
| report_id    | uuid        | FK — tied to the report revision the comment was left on         |
| comment      | text        |                                                                  |
| created_by   | uuid        | Adviser only                                                      |
| created_at   | timestamptz |                                                                  |

### `department_report_counters`

| Column               | Type    | Notes                                                             |
| ---------------------- | ------- | --------------------------------------------------------------------- |
| department_id          | uuid    |                                                                       |
| year                   | integer |                                                                       |
| last_sequence_number   | integer | Read-then-increment — safe since only one active treasurer per department can generate a report at a time |

### `notifications`

| Column       | Type        | Notes                                              |
| ------------- | ----------- | ----------------------------------------------------- |
| id            | uuid        |                                                      |
| user_id       | uuid        |                                                      |
| type          | text        |                                                      |
| payload_json  | jsonb       |                                                      |
| read          | boolean     |                                                      |
| created_at    | timestamptz | Auto-deleted 1 year after creation, regardless of `read` |

### `push_subscriptions`

| Column     | Type | Notes |
| ----------- | ---- | ----- |
| id          | uuid |       |
| user_id     | uuid |       |
| endpoint    | text |       |
| keys_json   | jsonb |      |

### `audit_logs`

| Column         | Type        | Notes |
| --------------- | ----------- | ----- |
| id              | uuid        |       |
| actor_id        | uuid        |       |
| department_id   | uuid        |       |
| action          | text        |       |
| target_type     | text        |       |
| target_id       | uuid        |       |
| metadata_json   | jsonb       |       |
| created_at      | timestamptz |       |

---

## InsForge Storage

Keyed by ID, not name, so paths stay stable across department/event renames:

```
storage/
  departments/{department_id}/
    events/{event_id}/
      receipts/{entry_id}.jpg
      reports/{report_id}.pdf
      signed/{report_id}/page-{n}.jpg
```

Signed pages are keyed by `{report_id}`, not a flat per-event folder — a rejected-then-regenerated report is a new `Report` row, so this prevents an upload attempt against one revision from colliding with another. Bucket access policy matches the department-scoped RLS policy below.

---

## Authentication & Authorization

- Provider: InsForge Auth (email + OTP)
- Every mutating action is governed by three server-side checks, never trusted from the client:
  1. Actor's **role**
  2. Actor's `department_id` match against the target resource
  3. Target resource's **current state** (`Event.is_locked`, `Event.budget_locked`, `Entry.status`, `Report.status`, per the state machines in `project-overview.md` — Core User Flow: Event & Budget, Logging Expenses, Voiding Entries, Report Generation & Signing, Archiving an Event)
- A route × role × precondition matrix (maintained in `build-plan.md`) drives both the InsForge RLS policies below and the `lib/auth-guard.ts` middleware layer — build this matrix before implementing routes.
- Sidebar/bottom-nav visibility is cosmetic only, never the security boundary.

### RLS / Realtime Scoping

- Every table carrying `department_id` gets a row-level policy: adviser and treasurer restricted to `department_id = current_user.department_id`; admin unrestricted.
- Admin-only tables (`departments`, cross-department `audit_logs` reads) use a role check instead.
- Realtime channels are scoped per department (e.g. `entries:department_id=X`) — belt-and-suspenders on top of RLS, not a replacement for it.

---

## InsForge Client Pattern

Two separate InsForge instances — never mix them:

```typescript
// lib/insforge-client.ts
// Browser-side — used in client components for auth state
import { createBrowserClient } from "@insforge/ssr";
export const insforge = createBrowserClient(
  process.env.NEXT_PUBLIC_INSFORGE_URL!,
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
);

// lib/insforge-server.ts
// Server-side — used in API routes, Server Actions, agent code
import { createServerClient } from "@insforge/ssr";
import { cookies } from "next/headers";

export const createInsforgeServer = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_INSFORGE_URL!,
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
};
```

---

## Receipt Parsing Pattern

```typescript
// agent/receipt-parser.ts
// One document per upload — AI never auto-splits multiple documents from one image
const response = await openrouter.chat.completions.create({
  model: "...",
  messages: [
    { role: "system", content: RECEIPT_EXTRACTION_PROMPT },
    { role: "user", content: [{ type: "image_url", image_url: { url: imageUrl } }] },
  ],
});
// Extracted fields: document_type_raw (verbatim, never forced into an enum),
// document_type_category (normalization, falls to "other"),
// document_number (Rule A — tied to document_type_raw label),
// issue_date, issue_time (optional, never combined),
// supplier_name, amount (Rule B — final Amount Due, never sub-total),
// item_breakdown (required)
```

A failed or malformed parse **never creates an Entry row** — the image stays client-side as a retryable upload. Only a successful parse creates the row, directly at `ai_parsed`. After 3 failed attempts, the UI surfaces the manual-entry fallback.

---

## Report PDF Pattern

```typescript
// components/reports/ReportPdf.tsx
// Single fixed template — not per-department customizable
// Mabini Colleges letterhead → Department + Event name + fs_document_number (top-right) →
// date range → itemized entry table (Date, Description/Category, Document Type, Document #, Amount) →
// totals block (Budget / Total Spent / Remaining) →
// signatory block rendered dynamically from ReportSignatory, ordered by sort_order
// Overspend entries get a row tint as a disclosure marker
```

---

## Polygon Hash-Anchoring Pattern

```typescript
// agent/report-anchor.ts
// Anchoring happens at exactly one point: Report.status → approved
import { createHash } from "crypto";

const hash = createHash("sha256")
  .update(fsDocumentNumber + pdfBytes + JSON.stringify(entryIdsAndAmounts))
  .digest("hex");

// Submit hash to Polygon, store resulting tx hash on Report.polygon_tx_hash
// No anchoring per-entry (too expensive) or at archive time (redundant — content already frozen at approval)
```

---

## Invariants

Rules the AI agent must never violate:

- API routes contain no UI logic. Components contain no DB logic.
- Agent code in `/agent` never imports from `/components` or `/actions`.
- Server Actions never call agent functions directly for AI/blockchain work — those go through API routes.
- All InsForge server-side writes use `createInsforgeServer()` — never the browser client.
- Every mutating action re-checks role × department × resource state server-side — never trust client-provided state.
- `Event.budget_locked`, `Event.is_locked`, `budget_total` editability, and `Entry.status` transitions must always match the state machines in `project-overview.md` — never shortcut a transition.
- Receipt entries never receive manual field edits after AI parsing — discard and re-upload only.
- A failed/malformed OpenRouter parse never creates an `Entry` row.
- Void is only permitted while `Event.is_locked = false`, and is always attributed to the **current active treasurer**, regardless of who created the entry.
- Reports are never overwritten — every regeneration creates a new `Report` row reusing the same `fs_document_number`, with `revision_count` incremented (audit-only, never printed on the PDF).
- No more than one `Report` per event may be `pending_adviser_approval` or `approved` at a time.
- Polygon anchoring happens exactly once per report, at the moment it becomes `approved`.
- Signed-document verification is a completeness check only — never claim to verify signature authenticity.
- Once `Event.status = archived`, no route may mutate anything under that event, ever.
- `Notification` rows are cleaned up on a 1-year retention job; `AuditLog` rows are never deleted.
- Always scope InsForge queries to the current user's `department_id` (or unrestricted for admin) — never query without this filter.
- Partial unique indexes on `users` are the source of truth for the one-active-adviser/one-active-treasurer rule — application logic must not assume it alone enforces this.
