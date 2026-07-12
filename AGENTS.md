---
description: Instructions for building Liquifi — a full-stack liquidation management system for Mabini Colleges department councils
globs: *
alwaysApply: true
---

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Read Before Anything Else

Read in this exact order before any implementation:

1. context/project-overview.md
2. context/architecture.md
3. context/ui-tokens.md
4. context/ui-rules.md
5. context/ui-registry.md
6. context/code-standards.md
7. context/library-docs.md
8. context/build-plan.md
9. context/progress-tracker.md

## Rules That Never Change

- **Never use hardcoded hex values or raw Tailwind color classes** — always use `@theme` tokens from `ui-tokens.md` via generated utility classes (`bg-surface`, `text-text-primary`, `border-border`)
- **State machines are law** — `Event.status`, `Event.budget_locked`, `Event.is_locked`, `Entry.status`, `Report.status` each have strict transition rules. Never shortcut a precondition check, even if it seems safe in one case.
- **`budget_locked` and `is_locked` are derived** — never persist them as independent booleans. `budget_locked` = EXISTS(entry WHERE event_id = X AND status = 'deducted'). `is_locked` = EXISTS(report WHERE event_id = X AND status IN ('pending_adviser_approval','approved')).
- **A failed OpenRouter parse never creates an Entry row** — the image stays client-side as a retryable upload. Only a successful parse creates the row at `ai_parsed`.
- **Reports are never overwritten** — every regeneration after rejection/cancellation creates a new `Report` row reusing the same `fs_document_number` with `revision_count` incremented.
- **Polygon anchoring happens exactly once** — at the moment `Report.status` transitions to `approved`. Never call it from any other trigger.
- **Once `Event.status = archived`**, every mutation under that event is rejected at the guard layer, regardless of role.
- **Void authority belongs to the current active treasurer** of the department — looked up fresh at void time, never assumed from `created_by`.
- **Role checks are server-side** in route group layouts — navigation visibility is cosmetic only, never the security boundary.
- Before any third-party library — load its installed skill first, then read `context/library-docs.md` for project-specific rules.
- Update `progress-tracker.md` and `ui-registry.md` after every feature.
- If the same problem persists after one corrective prompt — stop and run `/recover`.
- The `@/` path alias maps to the project root. Always use it — never relative imports going up more than one level.

## Available Skills

- `/architect` — before any complex feature. Think before building.
- `/audit` — bootstrap AI context for a greenfield project or existing codebase.
- `/check` — verify acceptance criteria before merge, or run a senior code review.
- `/debug` — fix bugs when a test fails or behavior is unexpected.
- `/develop` — build a feature, UI, or backend from an approved spec.
- `/document` — write changelog, release notes, or postmortem from real commits.
- `/imprint` — after any new UI component. Capture patterns.
- `/recover` — when something breaks after one failed correction.
- `/remember save` — when a feature spans multiple sessions.
- `/remember restore` — when returning after a multi-session feature.
- `/review` — pre-landing PR review.
- `/scope` — turn a product idea into a living scope in `docs/scope/`.
- `/sync` — keep AGENTS.md and scope current after changes.
- `/test` — write a test suite for code you just built or changed.

---

# InsForge Backend

This project uses **[InsForge](https://insforge.dev)** — an all-in-one, open-source Postgres-based backend (BaaS) providing database, authentication, file storage, realtime pub/sub, serverless functions, AI model gateway (OpenRouter), and payments.

**Skills:** If an InsForge skill is installed (`insforge`, `insforge-cli`, `insforge-debug`), load it before writing any InsForge integration code instead of guessing the API.

**Credentials:** App code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

---

## Installation & Client Setup

```bash
npm install @insforge/sdk@latest
```

### Two Clients — Never Mix

```typescript
// lib/insforge-client.ts — Browser context only (Client Components, auth state, realtime subs)
import { createBrowserClient } from "@insforge/ssr";

export const insforge = createBrowserClient(
  process.env.NEXT_PUBLIC_INSFORGE_URL!,
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
);
```

```typescript
// lib/insforge-server.ts — Server context only (API routes, Server Actions, agent functions)
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

**Rules:**
- Browser client → Client Components only (auth state, realtime subscriptions)
- Server client → Server Components, API routes, Server Actions, agent functions
- Never use browser client in server context
- Never use server client in browser context
- Always await `createInsforgeServer()` — it reads cookies asynchronously

---

## Authentication (Email + OTP)

- Signup: email/password → writes `users` row with `account_status = pending_approval`
- OTP: 10 min expiry, resend after 60s, max 5/hour, 5 wrong attempts locks the OTP and forces resend
- On verified OTP → account stays `pending_approval`, redirect to `/pending-approval`
- Adviser signups → notification to Admin approval queue
- Treasurer signups → notification to department's Adviser approval queue
- Admin accounts are never created via `/signup` — role selector excludes "Admin" in UI and server-side
- Forgot password: same OTP-reset pattern as signup

```typescript
// Server context — get current user
const insforge = await createInsforgeServer();
const { data: { user }, error } = await insforge.auth.getUser();
if (!user) redirect("/login");
```

SDK returns `{ data, error }` for all operations. Always handle the `error` return.

---

## Database Queries

Always scope to the current user's `department_id` (admin is unrestricted) — never query without this filter.

```typescript
// Read
const { data, error } = await insforge
  .from("events")
  .select("*")
  .eq("department_id", session.department_id)
  .order("created_at", { ascending: false });

// Insert — takes an array
const { data, error } = await insforge
  .from("events")
  .insert([{ name, department_id, created_by: user.id, budget_total }])
  .select()
  .single();

// Update — always filter by department_id
const { error } = await insforge
  .from("events")
  .update({ budget_total: newTotal })
  .eq("id", eventId)
  .eq("department_id", session.department_id);
```

**Rules:**
- Database inserts take array format: `insert([{ ... }])`
- Use `.single()` when expecting exactly one row
- Always handle `error` — never assume success without checking
- RLS is belt-and-suspenders, not a substitute for explicit filtering in app code

---

## Database Schema

### `departments`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| name | text | |
| code | text | Short dept code (e.g. "CCS") — used in `fs_document_number` |
| is_active | boolean | |
| has_active_adviser | boolean | Derived, informational |
| has_active_treasurer | boolean | Derived, informational |

### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid | References auth.users |
| first_name / middle_name / last_name | text | |
| email | text | |
| role | text | admin / adviser / treasurer |
| department_id | uuid | Null for admin |
| account_status | text | pending_approval / active / deactivated / rejected |
| approved_by / approved_at | uuid / timestamptz | |

Partial unique indexes:
```sql
UNIQUE(department_id) WHERE role = 'adviser'   AND account_status = 'active'
UNIQUE(department_id) WHERE role = 'treasurer' AND account_status = 'active'
```

### `events`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| name | text | |
| department_id | uuid | |
| created_by | uuid | Attribution only |
| budget_total | decimal(12,2) | Editable only while `budget_locked = false` |
| budget_locked | boolean | **Derived** — true once any entry reaches `deducted` |
| status | text | open / archived |
| is_locked | boolean | **Derived** — true while Report is pending/approved |
| has_unresolved_overspend | boolean | Blocks archiving |

### `entries`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| event_id | uuid | |
| type | text | receipt / manual |
| status | text | draft / ai_parsed / deducted / pending_approval / approved / rejected / voided / discarded |
| amount | decimal(12,2) | |
| document_type_raw | text | Verbatim printed label |
| document_number | text | Tied to `document_type_raw` label |
| issuer / supplier_name / item_breakdown | text / text / jsonb | |
| causes_overspend / overspend_explanation | boolean / text | |

Entry status transitions: see `project-overview.md` → Logging Expenses and Voiding Entries.

### `reports`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| event_id | uuid | |
| fs_document_number | text | `FS-{DEPTCODE}-{YYYY}-{00001}` — assigned once, persists across regeneration |
| status | text | pending_adviser_approval / approved / rejected / cancelled |
| pdf_url | text | |
| revision_count | integer | Audit-only, never printed on PDF |
| polygon_tx_hash | text | Set on approval |

See `architecture.md` for full schema: `report_signatories`, `entry_comments`, `department_report_counters`, `notifications`, `push_subscriptions`, `audit_logs`.

---

## Storage

Keyed by ID, not name — stable across renames:

```
storage/
  departments/{department_id}/
    events/{event_id}/
      receipts/{entry_id}.jpg
      reports/{report_id}.pdf
      signed/{report_id}/page-{n}.jpg
```

```typescript
// Upload
const { data, error } = await insforge.storage
  .from("departments")
  .upload(`${departmentId}/events/${eventId}/receipts/${entryId}.jpg`, fileBuffer, {
    contentType: "image/jpeg",
    upsert: false,
  });

// Get public URL
const { data } = insforge.storage
  .from("departments")
  .getPublicUrl(`${departmentId}/events/${eventId}/receipts/${entryId}.jpg`);
```

**Rules:**
- `upsert: false` everywhere — never overwrite existing files
- Always save the public URL back to the DB after upload
- Signed pages keyed by `{report_id}`, not event — prevents collision across rejection/regeneration cycles
- Never write files to disk — always upload buffer directly to storage

---

## Realtime Subscriptions

Department-scoped only — never subscribe globally.

```typescript
const channel = insforge.channel(`entries:${departmentId}`);

channel.on(
  "postgres_changes",
  {
    event: "INSERT",
    schema: "public",
    table: "entries",
    filter: `department_id=eq.${departmentId}`,
  },
  (payload) => { /* handle */ },
);

channel.subscribe();
```

**Rules:**
- Channels always scoped per department — never without a department filter
- Used for live budget counter updates on the Event Dashboard
- Never use realtime for auth state — use InsForge's built-in `onAuthStateChange`

---

## RLS Policies

- Every table carrying `department_id`: adviser and treasurer restricted to `department_id = current_user.department_id`; admin unrestricted
- Admin-only tables (`departments`, cross-department `audit_logs` reads) use a role check instead
- Build the full Route × Role × Precondition Matrix (Phase 0) before implementing routes — it drives both RLS policies and `lib/auth-guard.ts`

---

# OpenRouter (AI Gateway)

OpenRouter is our AI gateway for receipt OCR/parsing and signed-document verification. We never call OpenAI directly.

**Credentials:** `OPENROUTER_API_KEY` in `.env.local` — server-side only, never exposed to the client.

## Receipt Parsing (`agent/receipt-parser.ts`)

One document per upload — AI never auto-splits multiple documents from one image.

```typescript
const response = await openrouter.chat.completions.create({
  model: "gpt-4o", // via OpenRouter
  messages: [
    { role: "system", content: RECEIPT_EXTRACTION_PROMPT },
    { role: "user", content: [{ type: "image_url", image_url: { url: imageUrl } }] },
  ],
});
```

**Extracted fields:**

| Field | Rule |
|---|---|
| `document_type_raw` | Verbatim printed label, never forced into an enum |
| `document_type_category` | System-normalized enum — for reporting only |
| `document_number` | Tied to `document_type_raw` label (Rule A) |
| `issue_date` / `issue_time` | `issue_time` optional, never combined |
| `supplier_name` | |
| `amount` | Final Amount Due (Rule B) — never sub-total |
| `item_breakdown` | Required — description, qty, unit price, line amount |

**Rules:**
- A failed/malformed parse never creates an `Entry` row — image stays client-side
- After 3 failed attempts, UI surfaces manual-entry fallback
- Duplicate check: reject if `(document_type_raw + document_number)` already exists in the same event
- Always wrap in try/catch; always validate parsed JSON with zod before using
- Log every failure to `audit_logs` with enough context to trace back

## Document Verification (`agent/document-verifier.ts`)

Signed-document completeness check — **not** a forgery/authenticity check.

**Checks:**
1. `fs_document_number` on the signed document matches the stored value
2. Signature-like marks present for each signatory
3. Page count matches `signed_page_count`

**Rules:**
- 3-attempt retry with the same image, then fail gracefully
- Always use `response_format: { type: "json_object" }` for structured output
- Always wrap in try/catch — agent failures must never crash the API route
- Model is always `gpt-4o` via OpenRouter

---

# Other Libraries

## @react-pdf/renderer

- Server-side only — never import in client components
- Always use `renderToBuffer` — never `renderToStream` or `PDFDownloadLink`
- PDF generation only in `app/api/reports/generate`
- Generated buffer uploaded directly to InsForge Storage — never written to disk
- `revision_count` is audit-only — never render it on the PDF
- Supported CSS: `padding`, `margin`, `fontSize`, `color`, `fontFamily`, `flexDirection`, `alignItems`, `justifyContent`, `borderRadius`, `width`, `height`, `fontWeight`, `textAlign`, `lineHeight`, `borderTopWidth`, `paddingTop`, `position`, `absolute`, `top`, `right`

## web-push (`lib/web-push.ts`)

- All push notifications go through `lib/web-push.ts` — never call the Web Push API directly
- On 410 Gone response, delete the subscription from `push_subscriptions` immediately
- Report-ready-for-approval notifications fire on **every** regeneration, not just the first
- Service Worker: `public/sw.js`

| Type | When | Recipient |
|---|---|---|
| `report_ready_for_approval` | Report → `pending_adviser_approval` | Adviser |
| `adviser_signup_pending` | New adviser signup | Admin |
| `treasurer_signup_pending` | New treasurer signup | Dept Adviser |
| `signup_approved` / `signup_rejected` | Signup resolved | Applicant |
| `report_rejected` | Adviser rejects report | Treasurer |

## ethers (Polygon Hash-Anchoring)

- Only used in `agent/report-anchor.ts` — one specific transaction per approved report
- SHA-256 hash of `(fs_document_number + PDF bytes + entry IDs/amounts)` → submitted as self-transaction
- Always use `ethers.JsonRpcProvider` (not `ethers.providers` — v5 API removed in v6)
- Keys: `POLYGON_RPC_URL` + `POLYGON_PRIVATE_KEY` in `.env.local`, server-side only

## zod

- Use `safeParse` over `parse` — never throw on validation failure, handle gracefully
- Validate every OpenRouter response and API route input body
- Schemas for agent responses in `agent/types.ts`; for API routes inline

## shadcn/ui

- Components added via `npx shadcn@latest add <component>`
- Use `@theme` CSS variables from `app/globals.css` — never `tailwind.config.ts` for colors
- All components live in `components/ui/` — never nested in feature directories
- Components are Server Components unless interactive — add `"use client"` only when required
- See `ui-registry.md` before adding new components — check if the equivalent primitive already exists

## Poppins (Font)

```typescript
import { Poppins } from "next/font/google";
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans" });
```

- Load once in root layout only — never in individual page layouts
- Token wired in `@theme`: `--font-sans: "Poppins", sans-serif;`
- Use via `font-sans` utility class

---

# Environment Variables

| Variable | Used In |
|---|---|
| `NEXT_PUBLIC_INSFORGE_URL` | `lib/insforge-client.ts`, `lib/insforge-server.ts` |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | `lib/insforge-client.ts`, `lib/insforge-server.ts` |
| `OPENROUTER_API_KEY` | `agent/` functions |
| `WEB_PUSH_PUBLIC_KEY` | `lib/web-push.ts`, client subscription |
| `WEB_PUSH_PRIVATE_KEY` | `lib/web-push.ts` |
| `WEB_PUSH_SUBJECT` | `lib/web-push.ts` |
| `POLYGON_RPC_URL` | `agent/report-anchor.ts` |
| `POLYGON_PRIVATE_KEY` | `agent/report-anchor.ts` |

`NEXT_PUBLIC_` prefix means the variable is exposed to the browser. Never add `NEXT_PUBLIC_` to secret keys.
