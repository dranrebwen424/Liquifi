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
    // implementation — Gemini call (lib/gemini.ts)
    return { success: true, entry };
  } catch (error) {
    console.error("[agent/receipt-parser]", error);
    return { success: false, error: String(error) };
  }
}
```

- Every agent function returns `{ success: boolean, error?: string }`
- Every agent function has a try/catch — never let one failure crash the flow
- A failed AI parse never creates an `Entry` row — this must be enforced in the calling API route, not assumed
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
- Agent errors (Gemini/OpenRouter, Polygon) are always logged with enough context to trace back to the entry/report/event — never surface raw agent errors to the UI
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
| `report_approved`           | Adviser approves a report                 | Treasurer        |
| `report_rejected`           | Adviser rejects a report                  | Treasurer         |
| `adviser_signup_pending`    | New adviser signup submitted               | Admin             |
| `treasurer_signup_pending`  | New treasurer signup submitted             | Department Adviser |
| `signup_approved`           | Signup approved                            | Applicant         |
| `signup_rejected`           | Signup rejected                            | Applicant         |
| `manual_entry_pending`      | Manual entry submitted for approval       | Department Adviser |
| `entry_rejected`            | Adviser rejects an entry                  | Entry creator     |

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
- Agent functions may have a brief comment explaining the AI prompt strategy or Polygon anchoring approach
- Never leave TODO comments in committed code

---

## UI Primitive Order

When you need a UI component (dialog, select, dropdown, table, tabs, etc.):

1. **shadcn/ui first** — if it has the primitive, use it. shadcn wraps Radix (headless) with our Tailwind tokens baked in.
2. **`@base-ui/react` second** — if shadcn doesn't have the primitive and you'd otherwise hand-roll complex keyboard/ARIA logic.
3. **Custom CSS + tokens** — only if neither library matches the design (e.g. auth floating-label inputs). Style using `@theme` tokens only.

This rule keeps the codebase consistent — avoid having three different implementations of the same component.

---

## Animation Library Selection

Which animation tool to use depends on complexity. Follow this 3-tier hierarchy — never reach for a library when the tier above suffices.

### Tier 1 — CSS Transitions (preferred, zero cost)

Use for single-property reactions to state changes: color, opacity, simple transforms. These require no import, no bundle cost, no re-render overhead.

```css
/* Examples already in the codebase */
transition-colors duration-150   /* button hover, focus ring */
transition-all duration-200      /* card hover scale + shadow */
```

### Tier 2 — Framer Motion (default for interactive animations)

Use for any animation that CSS can't handle: mount/unmount, spring physics, staggered lists, layout transitions, page transitions.

```tsx
"use client";
import { motion, AnimatePresence } from "framer-motion";
```

Concrete use cases:
- **Mount/unmount** — modals, sheets, dropdowns, banners (use `AnimatePresence`)
- **Staggered entrances** — card grids, table rows, notification lists
- **Tab content transitions** — switch between tab panels with crossfade
- **Layout animations** — sidebar collapse, list reorder (use `layoutId`)
- **Hover/tap feedback** — spring-based micro-interactions

### Tier 3 — GSAP (reserved for heavy/timeline animation)

Use only when framer-motion's declarative model is insufficient. Requires justification in PR review.

```tsx
"use client";
import gsap from "gsap";
// Only import plugins when used:
// import { ScrollTrigger } from "gsap/ScrollTrigger";
```

Concrete use cases:
- **Scroll-triggered reveals** — parallax, progress-based timelines (`ScrollTrigger` plugin)
- **Complex multi-step timelines** — sequenced choreography that can't be expressed as variants
- **SVG path drawing / morphing** — `DrawSVGPlugin`, `MorphSVGPlugin`
- **Canvas/WebGL integrations** — animated backgrounds, data visualizations

### Apple-Style Animation Rules

Every animation in this project follows these 5 rules:

**1. Animate only when meaning changes**

| Animate | Don't animate |
|---------|--------------|
| Modal appearing / sidebar opening / card expanding / tab switching | Every icon on page load / every paragraph / every button |
| Communicates: "something just happened that you need to notice" | Communicates: noise |

**2. Keep durations short**

| Element | Duration |
|---------|----------|
| Hover / focus | 120–180 ms |
| Buttons | 150–200 ms |
| Cards | 180–250 ms |
| Dialogs / modals | 250–350 ms |
| Page transitions | 250–400 ms |

Long animations make the app feel sluggish — prefer the lower end of these ranges.

**3. Prefer spring motion**

Apple rarely uses linear easing. Spring curves feel natural for interactive elements.

```tsx
// framer-motion spring (preferred)
transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.2 }}

// GSAP spring equivalent
ease: "back.out(1.7)"
```

Reserve fixed-duration eases (like `power2.out`) for non-interactive presentation animations only.

**4. Use subtle movement**

| Parameter | Range |
|-----------|-------|
| Slide distance | 8–24 px (never 100+ px slides) |
| Scale changes | 0.98 ↔ 1.02 (never large bounces) |
| Opacity fades | Gentle, never jarring |

**5. Every animation must have a purpose**

Ask: *"What information does this animation communicate?"*

If the answer is "none" — remove it. Do not animate components users interact with repeatedly (tables, forms, dialogs, menus) unless it improves clarity. **Responsiveness over spectacle.**

---

## Dependencies

Never install a new package without a clear reason. Before installing anything check:

1. Does shadcn/ui already have this component?
2. Does Next.js already provide this functionality?
3. Is there a simpler native solution?
4. Could CSS or a few lines of TypeScript replace the dependency?

Approved dependencies for this project:

| Dependency | Purpose | Notes |
|---|---|---|
| `@insforge/sdk` | InsForge client (auth, DB, storage, realtime) | SSR subpath `@insforge/sdk/ssr` |
| none (plain fetch) | Gemini receipt OCR | Direct via `lib/gemini.ts`, free tier — no SDK |
| `web-push` | Web Push notification sending | Server-side only |
| `@react-pdf/renderer` | Financial Report PDF generation | Server-side only, `renderToBuffer` |
| `ethers` | Polygon hash-anchoring | v6 API, `JsonRpcProvider` |
| `zod` | Schema validation | Use `safeParse`, never `parse` |
| `framer-motion` | Micro-interactions — spring, stagger, layout animations | Tier 2 in animation selection |
| `gsap` | Heavy/timeline animation — ScrollTrigger, SVG, complex sequences | Tier 3, reserved for advanced use |
| `lottie-web` | Lottie JSON animation rendering | Loading states only |
| `lucide-react` | Icons | Direct imports, never barrel-exported |
| `@base-ui/react` | Headless UI primitives (fallback when shadcn doesn't cover it) | Last resort after shadcn/ui |
| `tailwindcss` | Styling utility framework | v4 `@theme` directive |
| `shadcn/ui` | UI primitives (first choice) | Added via `npx shadcn@latest add` |
| `class-variance-authority` | Component variant helpers | Used by shadcn/ui + custom components |
| `clsx` + `tailwind-merge` | Class merging utility | Via `cn()` helper in `lib/utils.ts` |

Do not install any other packages without updating this list first.
