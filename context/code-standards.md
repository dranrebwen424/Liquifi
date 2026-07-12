# Code Standards

Implementation rules and conventions for the entire project. The AI agent must follow these in every session without exception. These rules prevent pattern drift across sessions.

---

## Engineering Mindset

The AI agent on this project operates as a senior engineer. This means:

- **Think before implementing** — understand what is being built and why before writing a single line
- **Read context files first** — never assume, always verify against `architecture.md` and `project-overview.md`, especially the state machines (Event, Entry, Report) and the route × role × precondition matrix
- **Scope is sacred** — only build what the current feature requires. Never go beyond scope even if it seems helpful
- **Every feature must be testable** — if it cannot be verified immediately after implementation, it is incomplete
- **Clean over clever** — simple readable code that a junior developer can understand is always preferred over clever abstractions
- **One thing at a time** — complete one feature fully before touching the next
- **Failures are expected** — wrap agent operations in try/catch, log failures to `audit_logs`/`agent logs` as appropriate, never let one failure crash everything
- **State is law** — this project is built on strict state machines (`Event.status`, `Event.is_locked`, `Event.budget_locked`, `Entry.status`, `Report.status`). Never write a mutation that skips a precondition check, even if it seems obviously safe in one specific case

---

## TypeScript

- Strict mode enabled in `tsconfig.json` — no exceptions
- Never use `any` — use `unknown` and narrow the type
- Never use type assertions (`as SomeType`) unless absolutely necessary and commented why
- All function parameters and return types must be explicitly typed
- Use `type` for object shapes and unions — use `interface` only for extendable component props
- All async functions must have proper error handling — never let promises float unhandled
- Use `const` by default — only use `let` when reassignment is necessary
- Status/state fields (`Event.status`, `Entry.status`, `Report.status`, `account_status`) are always typed as string literal unions, never bare `string`

---

## Next.js Conventions

- App Router only — no Pages Router
- All components are Server Components by default
- Only add `"use client"` when the component requires:
  - `useState` or `useReducer`
  - `useEffect`
  - Browser APIs (including Web Push subscription)
  - Event listeners
  - Third party client-only libraries
- Never add `"use client"` to layout files unless absolutely required
- Data fetching happens in Server Components — never fetch in Client Components directly
- Route handlers live in `app/api/` — never put business logic directly in route handlers
- Server Actions live in `actions/` — never define Server Actions inline in components
- Caching is uncached by default — all dynamic code runs at request time
- Role-based route groups (`treasurer/`, `adviser/`, `admin/`) each enforce their own layout-level server-side auth check — never rely on client-side redirects alone
- Always read Next.js documentation before implementing any Next.js specific feature — APIs may differ from training data

---

## File and Folder Naming

- Folders: kebab-case — `find-jobs`, `event-details` (n/a here — use `events`, `entries`, `reports`)
- Component files: PascalCase — `EntryList.tsx`, `SignatorySetup.tsx`
- Utility files: camelCase — `insforge-server.ts`, `web-push.ts`
- Type files: camelCase — `index.ts`
- API route files: always `route.ts`
- Server Action files: camelCase — `events.ts`, `entries.ts`, `reports.ts`
- One component per file — never export multiple components from one file
- Index files only in `components/ui/` — never barrel export from other folders

---

## Component Structure

Every component follows this exact order:

```typescript
"use client"; // only if needed

// 1. External imports
import { useState } from "react";
import { Button } from "@/components/ui/button";

// 2. Internal imports
import { EntryRow } from "@/components/entries/EntryRow";

// 3. Type definitions
type Props = {
  eventId: string;
  isLocked: boolean;
};

// 4. Component
export function ComponentName({ eventId, isLocked }: Props) {
  // state
  // derived values
  // handlers
  // return JSX
}
```

- Never use default exports for components — always named exports
- Props type defined directly above the component — not in a separate types file unless shared
- No inline styles — all styling via Tailwind classes using CSS variables from `ui-tokens.md`
- Any component that renders a mutating action (void, approve, reject, generate report, archive) must visibly disable that action when the underlying resource's state (`is_locked`, `budget_locked`, entry/report status) does not allow it — never rely on the server rejecting the request as the only guard

---

## API Route Handlers

```typescript
// app/api/entries/receipt/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // validate body
    // requireRole(...) — role × department × resource state check
    // call agent function if AI/blockchain work is involved
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[entries/receipt]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- Every route handler has a try/catch
- Every route handler validates the request body before processing
- Every mutating route handler calls the shared `lib/auth-guard.ts` check before touching the database — role, department match, and resource state, never trusted from the client
- Errors are logged with the route path as prefix: `[entries/receipt]`
- Always return `{ success: boolean, data?: T, error?: string }`
- Never return raw data without the success wrapper

---

## Server Actions

```typescript
// actions/entries.ts

"use server";

import { revalidatePath } from "next/cache";
import { createInsforgeServer } from "@/lib/insforge-server";
import { requireRole } from "@/lib/auth-guard";

export async function confirmEntry(entryId: string) {
  try {
    const insforge = await createInsforgeServer();
    // requireRole(...) — check event.is_locked, entry.status, department match
    // write to DB
    revalidatePath("/treasurer/events/[eventId]");
    return { success: true };
  } catch (error) {
    console.error("[actions/entries]", error);
    return { success: false, error: "Failed to confirm entry" };
  }
}
```

- Every Server Action has a try/catch
- Every Server Action returns `{ success: boolean, error?: string }`
- Every Server Action that mutates event/entry/report state re-validates the current state server-side before writing — never assume the client-rendered state is still accurate
- Always call `revalidatePath` after mutations that affect page data
- Never throw from Server Actions — always return the error

---

## Agent Code

```typescript
// agent/receipt-parser.ts

export async function parseReceipt(
  imageUrl: string,
  eventId: string,
): Promise<{ success: boolean; entry?: ParsedEntry; error?: string }> {
  try {
    // implementation — OpenRouter call
    return { success: true, entry };
  } catch (error) {
    console.error("[agent/receipt-parser]", error);
    return { success: false, error: String(error) };
  }
}
```

- Every agent function returns `{ success: boolean, error?: string }`
- Every agent function has a try/catch — never let one failure crash the flow
- A failed OpenRouter parse never creates an `Entry` row — this must be enforced in the calling API route, not assumed
- Agent functions never import from `components/` or `actions/`
- Agent functions never use React hooks or browser APIs
- Polygon anchoring logic (`agent/report-anchor.ts`) only ever runs at the single point defined in `architecture.md` — a `Report` transitioning to `approved` — never call it from any other trigger

---

## InsForge Client Usage

```typescript
// Browser context — Client Components only
import { insforge } from "@/lib/insforge-client";

// Server context — Server Components, Route Handlers, Server Actions, Agent
import { createInsforgeServer } from "@/lib/insforge-server";
const insforge = await createInsforgeServer();
```

- Never use the browser client in server context
- Never use the server client in browser context
- Always await `createInsforgeServer()` — it reads cookies asynchronously
- Always scope every query to the current user's `department_id` (admin is unrestricted) — never query without this filter
- Never write a query that bypasses RLS assumptions — RLS is belt-and-suspenders, not a substitute for explicit filtering in application code

---

## State & Authorization Rules

These are project-specific and non-negotiable:

- Every mutating action checks, server-side: **(a)** actor's role, **(b)** actor's `department_id` match, **(c)** target resource's current state. Never trust any of these from the client.
- `Event.budget_total` is only writable while `budget_locked = false`. `budget_locked` is derived (`true` once any entry for the event reaches `deducted`) — never store it as a persisted boolean that could drift from the derivation.
- `Event.is_locked` is derived from whether a `Report` row for the event is `pending_adviser_approval` or `approved` — never persist it as an independent field that could go stale.
- Void actions must check `Event.is_locked = false` and must attribute to the **current active treasurer**, looked up fresh at void time — never assume the entry's `created_by` has void rights.
- Report regeneration after rejection or cancellation always creates a **new** `Report` row. Never update an existing `Report` row's `pdf_url` in place.
- `fs_document_number` is assigned exactly once per event, at first report generation, and reused verbatim on every subsequent row for that event.
- `revision_count` is system/audit-only — never render it on the generated PDF.
- Only one `Report` per event may be `pending_adviser_approval` or `approved` at a time — enforce this check before allowing generation.
- Once `Event.status = archived`, reject every mutation under that event at the route/action layer, regardless of role.

---

## Error Handling

- Never use empty catch blocks — always log or handle
- Console errors always include context prefix: `[component/function name]`
- User-facing errors must be human readable — never expose raw error messages
- Agent errors (OpenRouter, Polygon) are always logged with enough context to trace back to the entry/report/event — never surface raw agent errors to the UI
- API route errors return `status: 500` with a generic message — never expose internals

---

## Notifications

- All push notifications go through `lib/web-push.ts` — never call the Web Push API directly from a component or route handler
- Notification payloads use a defined `type` — never invent a new notification type without documenting it here first
- Report-ready-for-approval notifications fire on **every** regeneration, not just the first generation
- The 1-year `Notification` retention job is a scheduled function — never delete `AuditLog` rows on any schedule

| Type                     | When                                         | Recipient        |
| -------------------------- | ------------------------------------------- | ------------------ |
| `report_ready_for_approval` | Report enters `pending_adviser_approval`  | Adviser           |
| `adviser_signup_pending`    | New adviser signup submitted               | Admin             |
| `treasurer_signup_pending`  | New treasurer signup submitted             | Department Adviser |
| `signup_approved`           | Signup approved                            | Applicant         |
| `signup_rejected`           | Signup rejected                            | Applicant         |
| `report_rejected`           | Adviser rejects a report                   | Treasurer         |

Do not add more notification types without updating this table first.

---

## Environment Variables

All environment variables defined in `.env.local` for development. Never hardcode any key, URL, or secret anywhere in the codebase.

| Variable                          | Used In                |
| ------------------------------------ | ------------------------ |
| `NEXT_PUBLIC_INSFORGE_URL`           | `lib/insforge-client.ts` |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY`      | `lib/insforge-client.ts` |
| `OPENROUTER_API_KEY`                  | `agent/` functions       |
| `WEB_PUSH_PUBLIC_KEY`                  | `lib/web-push.ts`, client subscription |
| `WEB_PUSH_PRIVATE_KEY`                 | `lib/web-push.ts`        |
| `WEB_PUSH_SUBJECT`                     | `lib/web-push.ts`        |
| `POLYGON_RPC_URL`                      | `agent/report-anchor.ts` |
| `POLYGON_PRIVATE_KEY`                  | `agent/report-anchor.ts` |

`NEXT_PUBLIC_` prefix means the variable is exposed to the browser. Never add `NEXT_PUBLIC_` to secret keys.

---

## Import Aliases

Always use the `@/` alias — never use relative imports that go up more than one level.

```typescript
// Correct
import { Button } from "@/components/ui/button";
import { insforge } from "@/lib/insforge-client";
import { requireRole } from "@/lib/auth-guard";

// Never
import { Button } from "../../../components/ui/button";
```

---

## Comments

- No comments explaining what the code does — code must be self-explanatory
- Comments only for why — explaining a non-obvious decision (e.g. why `budget_locked` is derived rather than stored, why void authority is department-wide rather than creator-scoped)
- Agent functions may have a brief comment explaining the OpenRouter prompt strategy or Polygon anchoring approach
- Never leave TODO comments in committed code

---

## Dependencies

Never install a new package without a clear reason. Before installing anything check:

1. Does shadcn/ui already have this component?
2. Does Next.js already provide this functionality?
3. Is there a simpler native solution?

Approved dependencies for this project:

- `@insforge/ssr` — InsForge client
- `openai` or equivalent OpenRouter-compatible SDK — receipt OCR and document verification
- `web-push` — Web Push notification sending
- `@react-pdf/renderer` — Financial Report PDF generation
- `ethers` (or equivalent) — Polygon hash-anchoring transaction submission
- `zod` — Schema validation
- `lucide-react` — Icons
- `tailwindcss` — Styling
- `shadcn/ui` components — UI primitives

Do not install any other packages without updating this list first.
