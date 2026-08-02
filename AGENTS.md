---
description: Instructions building apps with MCP
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
- **A failed AI parse never creates an Entry row** — the image stays client-side as a retryable upload. Only a successful parse creates the row at `ai_parsed`.
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
import { createClient } from "@insforge/sdk";

export const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
});
```

```typescript
// lib/insforge-server.ts — Server context only (API routes, Server Actions, agent functions)
import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

export async function createInsforgeServer() {
  const cookieStore = await cookies();
  return createServerClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value ?? null,
    },
  });
}
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
const { data: { user }, error } = await insforge.auth.getCurrentUser();
if (!user) redirect("/login");
```

SDK returns `{ data, error }` for all operations. Always handle the `error` return.

---

## Session Refresh (Auto-Renewal of Expired Tokens)

Access tokens expire after a set time (~1 hour). Without automatic refresh, the user gets logged out mid-session when the token expires — even while actively using the app.

The SDK handles this with two mechanisms:

### 1. Proxy-level refresh (every request)

`proxy.ts` (Next.js 16) or `middleware.ts` (Next.js 15 and earlier) runs `updateSession()` on every non-public request. This reads the refresh token cookie, exchanges it for new tokens if the access token is expired, and sets fresh cookies on the response.

```typescript
// proxy.ts (Next.js 16)
import { updateSession } from "@insforge/sdk/ssr/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  await updateSession({
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });
  // ... redirect logic
  return response;
}
```

### 2. Client-side refresh route

The browser client calls `POST /api/auth/refresh` when the access token is missing or near expiry. The SDK provides a one-liner to create this route:

```typescript
// app/api/auth/refresh/route.ts
import { createRefreshAuthRouter } from "@insforge/sdk/ssr";
export const { POST } = createRefreshAuthRouter();
```

**Rules:**
- Always wire `updateSession` in `proxy.ts` — without it, server-side `getCurrentUser()` calls fail on expired tokens, causing redirects to `/login`
- The refresh route must exist at `POST /api/auth/refresh` for the browser client's auto-refresh mechanism to work
- `responseCookies.set` writes `Set-Cookie` headers on the HTTP response — these travel back to the browser and update the stored cookies

---

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

Three buckets: `receipts` (private), `signed-reports` (private), `avatars` (public).

Keyed by ID, not name — stable across renames:

```
receipts/{department_id}/events/{event_id}/receipts/{entry_id}.jpg
signed-reports/{department_id}/reports/{report_id}/page-{n}.jpg
avatars/{user_id}.jpg
```

**All storage access goes through `lib/storage.ts` helpers** — never call SDK storage directly. Helpers handle auth, ownership verification, and blob download.

```typescript
// Upload receipt (treasurer only, ownership verified via event)
import { uploadReceipt } from "@/lib/storage";

const { url, key } = await uploadReceipt(eventId, entryId, file);

// Download receipt blob (auth enforced by the caller via requireRole)
const blob = await getReceiptBlob(entryId);
```

**Rules:**
- `upsert: false` everywhere — never overwrite existing files
- Private bucket reads go through `GET /api/entries/{entryId}/image` — a session-authed proxy (`requireRole(["treasurer","adviser"], event.department_id)`) that streams the blob; `image_url` stores the storage **key**, never a browser-loadable URL (no signed-URL support in the SDK)
- Never use `URL.createObjectURL` server-side — it produces a server-only object URL
- Ownership verified via DB joins: `entries → event → department_id`
- `deptId` never passed as parameter — derived from authenticated user
- Never write files to disk — always upload buffer directly to storage
- `avatars` stays public — profile pics are non-sensitive

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

# AI Gateway

**Receipt OCR/parsing calls Google Gemini directly** (`lib/gemini.ts`, free tier, `gemini-3.5-flash-lite`). Signed-document verification goes through OpenRouter. We never call OpenAI directly.

**Credentials:** `GOOGLE_GENERATIVE_AI_API_KEY` (Gemini, receipt parsing) and `OPENROUTER_API_KEY` (document verification) in `.env.local` — server-side only, never exposed to the client.

## Receipt Parsing (`agent/receipt-parser.ts`)

One document per upload — AI never auto-splits multiple documents from one image.

```typescript
const content = await geminiChatCompletion({
  model: GEMINI_MODEL, // gemini-3.5-flash-lite — pinned in lib/gemini.ts
  messages: [
    { role: "system", content: RECEIPT_EXTRACTION_PROMPT },
    { role: "user", content: [{ type: "image_url", image_url: { url: imageUrl } }] },
  ],
  responseFormat: { type: "json_object" }, // mapped to responseMimeType: application/json
});
```

**Extracted fields:**

| Field | Rule |
|---|---|
| `document_type_raw` | Verbatim printed label, never forced into an enum; `""` when none exists (handwritten slips) |
| `document_type_category` | System-normalized enum — for reporting only |
| `category` | Expense category inferred from supplier + line items: one of `transportation`, `meals`, `honorarium`, `supplies`, `printing`, `rental`, `others` — normalized; falls back to `others` when unclear |
| `document_number` | Tied to `document_type_raw` label (Rule A); `""` when no label-tied number exists — never null, never made up |
| `issue_date` / `issue_time` | `issue_time` optional, never combined |
| `supplier_name` | |
| `amount` | Final Amount Due (Rule B) — never sub-total |
| `item_breakdown` | Required — description, qty, unit price, line amount |

**Classification (guided-upload outcomes):** every response self-classifies before extraction — `valid` (vendor + amount readable, printed or handwritten, any doc type, number optional), `borderline` (clearly a document but blurry/cropped/low-contrast), `invalid` (blank, illegible, or nothing traceable). Doubt → `borderline`, never `invalid`. Never guess: unreadable fields are `null` — if vendor or amount is unreadable, outcome must be `borderline`.

**Rules:**
- Verdicts short-circuit: `borderline`/`invalid` → 422 `entry.receipt_borderline` / `entry.receipt_invalid_document` with guidance + audit — no `Entry` row, no retry
- A failed/malformed parse never creates an `Entry` row — image stays client-side; 3-attempt retry applies only to zod-inconsistent responses
- After 3 failed attempts, UI surfaces manual-entry fallback
- Duplicate check: reject if `(document_type_raw + document_number)` already exists in the same event (`""` numbers skip the check)
- Always wrap in try/catch; always validate parsed JSON with zod before using
- Log every failure/verdict to `audit_logs` with enough context to trace back

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
| `GOOGLE_GENERATIVE_AI_API_KEY` | `lib/gemini.ts` (receipt parsing) |
| `WEB_PUSH_PUBLIC_KEY` | `lib/web-push.ts`, client subscription |
| `WEB_PUSH_PRIVATE_KEY` | `lib/web-push.ts` |
| `WEB_PUSH_SUBJECT` | `lib/web-push.ts` |
| `POLYGON_RPC_URL` | `agent/report-anchor.ts` |
| `POLYGON_PRIVATE_KEY` | `agent/report-anchor.ts` |

`NEXT_PUBLIC_` prefix means the variable is exposed to the browser. Never add `NEXT_PUBLIC_` to secret keys.



# InsForge SDK Documentation - Overview

## What is InsForge?

Backend-as-a-service (BaaS) platform providing:

- **Database**: PostgreSQL with PostgREST API
- **Authentication**: Email/password + OAuth (Google, GitHub)
- **Storage**: File upload/download
- **AI**: OpenRouter key provisioning and model catalog for direct OpenAI-compatible integrations
- **Functions**: Serverless function deployment
- **Realtime**: WebSocket pub/sub (database + client events)

## Installation

The following is a step-by-step guide to installing and using the InsForge TypeScript SDK for Web applications. If you are building other types of applications, please refer to:
- [Swift SDK documentation](/sdks/swift/overview) for iOS, macOS, tvOS, and watchOS applications.
- [Kotlin SDK documentation](/sdks/kotlin/overview) for Android applications.
- [REST API documentation](/sdks/rest/overview) for direct HTTP API access.

### 🚨 CRITICAL: Follow these steps in order

### Step 1: Download Template

Use the `download-template` MCP tool to create a new project with your backend URL and anon key pre-configured.

### Step 2: Install SDK

```bash
npm install @insforge/sdk@latest
```

### Step 3: Create SDK Client

You must create a client instance using `createClient()` with your base URL and anon key:

```javascript
import { createClient } from '@insforge/sdk';

const client = createClient({
  baseUrl: 'https://your-app.region.insforge.app',  // Your InsForge backend URL
  anonKey: 'your-anon-key-here'       // Get this from backend metadata
});

```

**API BASE URL**: Your API base URL is `https://your-app.region.insforge.app`.

## Getting Detailed Documentation

### 🚨 CRITICAL: Always Fetch Documentation Before Writing Code

InsForge provides official SDKs and REST APIs, use them to interact with InsForge services from your application code.

- [TypeScript SDK](/sdks/typescript/overview) - JavaScript/TypeScript
- [Swift SDK](/sdks/swift/overview) - iOS, macOS, tvOS, and watchOS
- [Kotlin SDK](/sdks/kotlin/overview) - Android and Kotlin Multiplatform
- [REST API](/sdks/rest/overview) - Direct HTTP API access

Before writing or editing any InsForge integration code, you **MUST** call the `fetch-docs` or `fetch-sdk-docs` MCP tool to get the latest SDK documentation. This ensures you have accurate, up-to-date implementation patterns.

### Use the InsForge `fetch-docs` MCP tool to get specific SDK documentation:

Available documentation types:

- `"instructions"` - Essential backend setup (START HERE)
- `"real-time"` - Real-time pub/sub (database + client events) via WebSockets
- `"db-sdk-typescript"` - Database operations with TypeScript SDK
- **Authentication** - Choose based on implementation:
  - `"auth-sdk-typescript"` - TypeScript SDK methods for custom auth flows
  - `"auth-components-react"` - Pre-built auth UI for React+Vite (single-page app)
  - `"auth-components-react-router"` - Pre-built auth UI for React(Vite+React Router) (multi-page app)
  - `"auth-components-nextjs"` - Pre-built auth UI for Next.js (SSR app)
- `"storage-sdk"` - File storage operations
- `"functions-sdk"` - Serverless functions invocation
- `"ai-integration-sdk"` - AI integration with the provisioned OpenRouter key and OpenAI SDK
- `"deployment"` - Deploy frontend applications via MCP tool
- `"payments"` - Stripe Checkout, Billing Portal, webhook projections, and fulfillment patterns

These docs are mostly for the TypeScript SDK. For other languages, you can also use the `fetch-sdk-docs` MCP tool to get specific documentation.

### Use the InsForge `fetch-sdk-docs` MCP tool to get specific SDK documentation

You can fetch SDK documentation using the `fetch-sdk-docs` MCP tool with a specific feature type and language.

Available feature types:
- `db` - Database operations
- `storage` - File storage operations
- `functions` - Serverless functions invocation
- `auth` - User authentication
- `ai` - AI integration with the provisioned OpenRouter key and OpenAI SDK
- `realtime` - Real-time pub/sub (database + client events) via WebSockets
- `payments` - Stripe Checkout and Billing Portal with webhook-based fulfillment

Available languages:
- `typescript` - JavaScript/TypeScript SDK
- `swift` - Swift SDK (for iOS, macOS, tvOS, and watchOS)
- `kotlin` - Kotlin SDK (for Android and JVM applications)
- `rest-api` - REST API

Payments currently has TypeScript SDK docs only. Use the Payments API reference for non-TypeScript clients.

## When to Use SDK vs MCP Tools

### Always SDK for Application Logic:

- Authentication (register, login, logout, profiles)
- Database CRUD (select, insert, update, delete)
- Storage operations (upload, download files)
- AI integration via the provisioned OpenRouter key with the OpenAI SDK or OpenRouter HTTP API
- Serverless function invocation
- Payments checkout and customer portal session creation

### Use MCP Tools for Infrastructure:

- Project scaffolding (`download-template`) - Download starter templates with InsForge integration
- Backend setup and metadata (`get-backend-metadata`)
- Database schema management (`run-raw-sql`, `get-table-schema`)
- Storage bucket creation (`create-bucket`, `list-buckets`, `delete-bucket`)
- Serverless function deployment (`create-function`, `update-function`, `delete-function`)
- Frontend deployment (`create-deployment`) - Deploy frontend apps to InsForge hosting

## Important Notes

- For auth: use `auth-sdk` for custom UI, or framework-specific components for pre-built UI
- SDK returns `{data, error}` structure for all operations
- Database inserts require array format: `[{...}]`
- Serverless functions have one endpoint and do not support nested route paths
- Storage: Upload files to buckets, store URLs in database
- AI integrations should call OpenRouter directly with `baseURL: "https://openrouter.ai/api/v1"` and a server-side `OPENROUTER_API_KEY`
- **EXTRA IMPORTANT**: Use Tailwind CSS v4. Design tokens live in `app/globals.css` via the `@theme` directive — no `tailwind.config.ts` for colors. Lock these dependencies in `package.json`.