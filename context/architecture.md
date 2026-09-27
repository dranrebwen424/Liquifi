# Architecture

## Stack

| Layer                        | Tool                                       | Purpose                                              |
| ----------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Framework                    | Next.js (latest, App Router)               | Full stack framework                                 |
| Auth + DB + Storage + Realtime + OTP | InsForge                             | Entire backend                                       |
| Push notifications           | Web Push API + `web-push` + Service Worker  | Adviser/treasurer alerts                             |
| AI                           | Google Gemini (receipt parsing + document verification) | Receipt OCR/parsing, signed-document completeness check |
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
├── proxy.ts                                       → Session refresh + protected-route redirects
├── context/                                       → This documentation set
│   └── Design/                                    → Reference mockups, PDF sample transcription, ERD
├── app/
│   ├── layout.tsx                                  → Root layout (Poppins, no auth guard)
│   ├── page.tsx                                    → Landing page
│   ├── (auth)/                                    → Public: login, signup, otp, pending-approval,
│   │                                                forgot-password, change-password (reset only)
│   ├── treasurer/
│   │   ├── layout.tsx                              → requireLayoutRole("treasurer")
│   │   ├── home/page.tsx                           → Events list
│   │   ├── events/page.tsx                         → All Events browser
│   │   ├── events/[eventId]/page.tsx               → Event dashboard (Log Entry = LogEntryModal)
│   │   ├── events/[eventId]/budget-history/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── reports/[eventId]/page.tsx              → Guided report workspace
│   │   ├── reports/[eventId]/{budget-history,spending-summary,previous-revisions}/page.tsx
│   │   ├── notifications/page.tsx
│   │   └── profile/page.tsx
│   ├── adviser/
│   │   ├── layout.tsx                              → requireLayoutRole("adviser")
│   │   ├── home/page.tsx
│   │   ├── events/page.tsx                         → View-all destination
│   │   ├── events/[eventId]/page.tsx               → View-only
│   │   ├── approvals/page.tsx                      → Tabs: Pending Expenses | Pending Users
│   │   ├── reports/page.tsx
│   │   ├── reports/[eventId]/page.tsx
│   │   ├── notifications/page.tsx
│   │   └── profile/page.tsx
│   ├── admin/
│   │   ├── layout.tsx                              → requireLayoutRole("admin")
│   │   ├── departments/page.tsx                    → NO guard of its own — relies on this layout
│   │   ├── departments/new/page.tsx
│   │   ├── departments/[departmentId]/page.tsx      → Workspace (?tab=events|reports|users|audit)
│   │   ├── departments/[departmentId]/events/page.tsx
│   │   ├── departments/[departmentId]/events/[eventId]/page.tsx
│   │   ├── departments/[departmentId]/reports/page.tsx
│   │   ├── departments/[departmentId]/reports/[eventId]/page.tsx
│   │   ├── departments/[departmentId]/audit-logs/page.tsx
│   │   ├── departments/[departmentId]/users/page.tsx
│   │   ├── departments/[departmentId]/users/{treasurers,advisers}/page.tsx
│   │   ├── departments/[departmentId]/users/[userId]/page.tsx  → Member profile
│   │   ├── approvals/page.tsx
│   │   └── profile/page.tsx
│   ├── profile/change-password/                   → layout = active-role guard + in-memory password state
│   │   ├── page.tsx / otp/page.tsx / success/page.tsx
│   └── api/
│       ├── entries/
│       │   ├── receipt/route.ts                   → Gemini parse + Entry creation
│       │   ├── receipt/[entryId]/route.ts         → Retry parse of an existing pending_ai_parse row
│       │   ├── manual/photo/route.ts               → Manual-entry photo upload (server action cannot carry a File)
│       │   └── [entryId]/image/route.ts           → Session-authed receipt blob proxy (?i=N)
│       ├── reports/
│       │   ├── generate/route.tsx                  → PDF generation + fs_document_number assignment
│       │   ├── [reportId]/approve/route.ts         → Overspend resolution + approval + Polygon anchor
│       │   ├── [reportId]/reject/route.ts
│       │   ├── [reportId]/cancel/route.ts
│       │   └── [reportId]/pdf/route.ts             → Private PDF proxy (?dl=1 → attachment)
│       ├── events/[eventId]/archive/route.ts       → Signed-document upload + AI completeness check
│       ├── proofs/
│       │   ├── route.ts                            → Initial budget + verified increase
│       │   └── [proofId]/image/route.ts            → Proof blob proxy (?i=N)
│       ├── profile/avatar/route.ts                 → Authenticated avatar upload/remove
│       ├── departments/route.ts                    → Department list (public read for signup picker)
│       ├── notifications/subscribe/route.ts        → Web Push subscription
│       └── auth/
│           ├── signup/route.ts                     → Validation-only gate (no account, no email)
│           ├── signup/complete/route.ts            → Sole account-creation point + OTP email
│           ├── create-profile/route.ts             → users row + approver notification (post-OTP)
│           ├── login/route.ts / logout/route.ts
│           ├── status/route.ts                     → Account-status polling for pending-approval
│           ├── refresh/route.ts                    → createRefreshAuthRouter
│           ├── otp/send/route.ts                   → OTP send (signup / reset / change intents)
│           ├── otp/verify/route.ts
│           └── change-password/
│               ├── route.ts                        → Public reset-token mutation
│               └── verify/route.ts                 → Session + current-password check + change OTP
├── agent/
│   ├── receipt-parser.ts                          → Gemini OCR + field extraction
│   ├── budget-proof-parser.ts                     → Budget proof amount extraction
│   ├── document-verifier.ts                       → Signed-document completeness check
│   ├── report-anchor.ts                           → Polygon hash-anchoring (the ONLY tx in the app)
│   └── types.ts
├── actions/
│   ├── events.ts / entries.ts / departments.ts
│   ├── approvals.ts                               → Batch approve, reject, withdraw, user signup decisions
│   └── notifications.ts                           → Mark read / mark all read
├── hooks/usePeopleReuse.ts                        → localStorage witness name persistence
├── components/
│   ├── ui/          → Primitives only (StatusBadge, EmptyState, FadeIn, ImageViewer, CssBottomSheet, …)
│   ├── layout/      → Sidebar, NavItem, MobileBottomNav, MobileTopBar family, SidebarShell
│   ├── auth/ events/ entries/ reports/            → Feature components
│   ├── admin/ adviser/ treasurer/                  → Role-scoped components
│   ├── landing/ notifications/ profile/
│   └── (no nested ui/ — all primitives live in components/ui/)
├── lib/
│   ├── insforge-client.ts / insforge-server.ts    → The two clients
│   ├── auth-guard.ts / layout-guard.ts            → requireRole / requireLayoutRole — the security boundary
│   ├── gemini.ts / web-push.ts / push-client.ts / email.ts / storage.ts / session.ts
│   ├── queries/{events,reports,budget-proofs}.ts  → React-cached department-scoped reads
│   ├── format.ts / limits.ts / rate-limit.ts / password-change.ts
│   ├── budget-lock.ts / overspend.ts / spending-breakdown.ts / report-number.ts
│   ├── bottom-sheet-drag.ts / motion-variants.ts / image.ts / image-keys.ts
│   ├── audit-log-view.ts / notifications.ts / event-route.ts / *-routes.ts
│   └── (no polygon.ts — anchoring lives in agent/report-anchor.ts)
├── scripts/                                        → sql/ migrations + assert-based check scripts
└── types/index.ts                                 → Global TypeScript types
```

**Role-guard rule:** every role route group's `layout.tsx` calls `requireLayoutRole`. Pages are **not** individually guarded — never import a role page from outside its route group, or it renders without the layout guard.

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
Calls agent/receipt-parser.ts (Gemini direct)
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
Calls agent/document-verifier.ts (Gemini)
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

### Authenticated Password Change (Profile)

```
Profile → /profile/change-password
        ↓
Collect current + new + confirm in client memory
        ↓
POST /api/auth/change-password/verify
  session guard + current-password check + rate limit
        ↓
InsForge sends a reset OTP to the signed-in user's email
        ↓
/profile/change-password/otp
        ↓
POST /api/auth/otp/verify (intent = "change")
  session-bound email + verified current-password marker
        ↓
One-time reset token stored in a short-lived httpOnly cookie
        ↓
POST /api/auth/change-password with in-memory new password + cookie token
        ↓
/profile/change-password/success
        ↓
Return to role home immediately or automatically after 10 seconds
```

- This flow is separate from `/forgot-password`; both use InsForge's token-based reset mutation, but the profile flow first requires an active session and the current password.
- A client provider in `app/profile/change-password/layout.tsx` keeps the new password in React memory across the page navigation, then clears it. It is never written to cookies, the URL, or browser storage.
- A short-lived httpOnly marker cookie gates OTP send and verify. The one-time reset token is held in a separate short-lived httpOnly cookie.
- A hard refresh on the OTP page loses the in-memory new password and restarts the flow at step one.
- `/profile/*` is protected by `proxy.ts` and the nested active-role layout.

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
| otp_verified_at   | timestamptz | Optional                                                      |
| avatar_key        | text        | Versioned public `avatars` storage key; NULL uses initials      |

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
| budget_total                | decimal(12,2) | Never edited directly — increases via verified proof upload (POST /api/proofs), gated by `is_locked` |
| budget_locked               | boolean     | Derived — true once any entry row exists for the event (statuses irrelevant)  |
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

### `budget_proofs`

Every budget figure is backed by an uploaded document. `events.budget_total` is
never edited directly — it starts from a `type = initial` proof and grows only
through a `matched` `type = increase` proof. Applied from
`scripts/sql/budget-proofs.sql`.

| Column                   | Type          | Notes                                                        |
| ------------------------ | ------------- | ------------------------------------------------------------ |
| id                       | uuid          |                                                              |
| event_id                 | uuid          | FK, CASCADE                                                   |
| department_id            | uuid          |                                                              |
| uploaded_by              | uuid          | → `auth.users`                                                |
| uploaded_at              | timestamptz   |                                                              |
| type                     | text          | CHECK `initial` / `increase`                                  |
| claimed_amount           | decimal(12,2) | What the treasurer claims                                     |
| proof_url                | jsonb         | Array of storage keys (nullable)                              |
| ai_extracted_amount      | decimal(12,2) | What Gemini read off the document                             |
| verification_status      | text          | CHECK `pending` / `matched` / `mismatch`                      |
| resulting_budget_total   | decimal(12,2) | CHECK — non-null whenever `matched`                           |

A `mismatch` proof is still recorded (auditable) but does not move
`budget_total`. An `initial` mismatch rejects the event outright — the row and
its blobs are rolled back. Increases are gated on `is_locked = false`.

---

## InsForge Storage

Keyed by ID, not name, so paths stay stable across department/event renames:

```
storage/
  receipts/{department_id}/events/{event_id}/receipts/{entry_id}.jpg
  signed-reports/{department_id}/reports/{report_id}/page-{n}.jpg
  budget-proofs/{department_id}/events/{event_id}/proofs/{proof_id}-{index}.jpg
  avatars/{user_id}/{version}.jpg
```

Avatar uploads use a fresh versioned key, then delete the previous blob after the `users.avatar_key` update succeeds. The public avatar bucket is intentionally non-sensitive; every mutation is still session-scoped to the current user.

`getAvatarUrl(key, insforge)` is a pure, synchronous wrapper over `storage.from("avatars").getPublicUrl(key)` — no network call, no auth. Server components reuse their own `createInsforgeServer()` client to resolve public avatar URLs for read surfaces (own Profile, admin department Users tab, role user lists, admin member profile, admin top bars); a `null` key yields `null` and each surface falls back to initials.

`AuthUser.avatarKey` (from `getCurrentUser`) carries the signed-in user's own avatar key to route-group layouts, so chrome can render it without a second query. `AvatarUploader` is the only interactive avatar control and is mounted solely on the caller's own Profile; every other avatar surface is a read-only image.

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
import { createClient } from "@insforge/sdk";
export const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
});

// lib/insforge-server.ts
// Server-side — used in API routes, Server Actions, agent code
import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

export const createInsforgeServer = async () => {
  const cookieStore = await cookies();
  return createServerClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value ?? null,
      // The SDK's CreateServerClientOptions only declares `cookies.get`, but
      // set/remove work at runtime — hence the `as any` cast in the real file.
      set: (name, value, options) => cookieStore.set(name, value, options),
      remove: (name) => cookieStore.delete(name),
    } as never,
  });
};
```

**Verified against `@insforge/sdk@1.4.4`:**

- There is no `@insforge/ssr` package. The only published subpaths are `.`, `./ssr`, and `./ssr/middleware`.
- `InsForgeClient` exposes `auth`, `database`, `storage`, `ai`, `functions`, `realtime`, `emails`, `payments` — **no top-level `from()`**. Every query goes through `insforge.database.from(...)`.
- Auth reads use `insforge.auth.getCurrentUser()` → `{ data: { user }, error }`. `getUser()` is a *different*, synchronous in-memory session getter returning a bare `UserSchema | null` — not a drop-in replacement.
- The browser client is the full `createClient`, not `createBrowserClient`. Token refresh is handled by the explicit `POST /api/auth/refresh` route plus `updateSession` in `proxy.ts`, not by the SDK's `refreshUrl` cookie flow.

---

## Receipt Parsing Pattern

```typescript
// agent/receipt-parser.ts
// One document per upload — AI never auto-splits multiple documents from one image
const { text } = await geminiChatCompletion({
  model: GEMINI_MODEL, // gemini-3.5-flash-lite — pinned in lib/gemini.ts
  messages: [
    { role: "system", content: RECEIPT_EXTRACTION_PROMPT },
    { role: "user", content: [{ type: "image_url", image_url: { url: imageUrl } }] },
  ],
  responseFormat: { type: "json_object" }, // mapped to responseMimeType: application/json
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
// components/reports/FinancialReportPDF.tsx
// Single fixed template — not per-department customizable. Transcribed from
// public/FS-TEMPLATE/Financial_Report.docx; that DOCX is the ground truth.
// `fixed` header View (letterhead + title + event + SY line + fs_document_number) repeats on every page →
// expense table, 6 columns: DATE | ITEM | QUANTITY | UNIT PRICE | TOTAL AMOUNT | OR NUMBER
//   (one row per deducted entry; ITEM stacks line items; DATE blanked on same-date
//    continuation rows by the route; OR = document_number → witness → "---") →
// TOTAL EXPENSES row → balance lines: Beginning Balance / Total Collection / Cash On-hand
//   (Beginning Balance = first matched initial proof, legacy fallback event.budget_total;
//    Total Collection = event.budget_total; Cash On-hand = collection − spent) →
// "Prepared and certified correct by:" + 4 signatory columns ordered by sort_order
// Overspend entries get a muted-blue row tint as a disclosure marker
// revision_count is audit-only and is never rendered
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
- `Event.budget_locked`, `Event.is_locked`, `budget_total` increase flow (proof uploads only, never direct DB updates), and `Entry.status` transitions must always match the state machines in `project-overview.md` — never shortcut a transition.
- Receipt entries never receive manual field edits after AI parsing — discard and re-upload only.
- A failed/malformed AI parse never creates an `Entry` row.
- Void is only permitted while `Event.is_locked = false`, and is always attributed to the **current active treasurer**, regardless of who created the entry.
- Reports are never overwritten — every regeneration creates a new `Report` row reusing the same `fs_document_number`, with `revision_count` incremented (audit-only, never printed on the PDF).
- No more than one `Report` per event may be `pending_adviser_approval` or `approved` at a time.
- Polygon anchoring happens exactly once per report, at the moment it becomes `approved`.
- Signed-document verification is a completeness check only — never claim to verify signature authenticity.
- Once `Event.status = archived`, no route may mutate anything under that event, ever.
- `Notification` rows are cleaned up on a 1-year retention job; `AuditLog` rows are never deleted.
- Always scope InsForge queries to the current user's `department_id` (or unrestricted for admin) — never query without this filter.
- Partial unique indexes on `users` are the source of truth for the one-active-adviser/one-active-treasurer rule — application logic must not assume it alone enforces this.
- `budget_total` is never written by a direct `events.update({ budget_total })`. It only ever moves through a `budget_proofs` row that verifies as `matched`.
