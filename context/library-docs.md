# Library Docs

Project-specific usage patterns for every third party library in this project. This file only covers how we use each library in this specific project — rules, patterns, and constraints specific to **Liquifi**.

Read the relevant section before implementing any feature that touches these libraries.

---

## Before Using Any Library

Before implementing any feature that uses a third party library:

1. **Check AGENTS.md** at the project root — it lists every skill installed for this project and how to use them. Skills contain up-to-date API documentation, usage patterns, and best practices specific to this codebase.

2. **Check if an MCP server is configured** for that library. Some tools have MCP servers that give the AI agent direct access to documentation, logs, and debugging tools. If an MCP server is available — use it before falling back to general knowledge.

3. **Read this file** for project-specific patterns that override general library knowledge.

The order of authority is:

```
MCP server (real-time docs) → Skills via AGENTS.md → This file (project rules) → General training knowledge
```

Never rely on general training knowledge alone for library APIs — they change frequently and training data may be outdated.

---

## InsForge

**Check first:** Check AGENTS.md for an installed InsForge skill. If an InsForge MCP server is configured — use it. The skill/MCP will have the latest API patterns.

### Client vs Server

Two separate instances — never mix them:

```typescript
// lib/insforge-client.ts — browser context only
import { createBrowserClient } from "@insforge/ssr";

export const insforge = createBrowserClient(
  process.env.NEXT_PUBLIC_INSFORGE_URL!,
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
);
```

```typescript
// lib/insforge-server.ts — server context only
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

- Browser client — Client Components, browser-side auth state, realtime subscriptions
- Server client — Server Components, API routes, Server Actions, agent functions
- Never use browser client in server context
- Never use server client in browser context

---

### Auth

```typescript
// Get current user in server context
const insforge = await createInsforgeServer();
const {
  data: { user },
  error,
} = await insforge.auth.getUser();
if (!user) redirect("/login");
```

OTP flow (defined in `architecture.md` and `build-plan.md`):
- Signup uses InsForge email/password, then OTP verification (10 min expiry, resend after 60s, max 5/hour)
- 5 wrong OTP attempts locks the code and forces resend
- Forgot password uses the same OTP-reset pattern
- Admin accounts are never created via signup — role selector excludes "Admin" in both UI and server-side validation

---

### DB Queries

```typescript
// Read — always scope to department_id
const { data, error } = await insforge
  .from("events")
  .select("*")
  .eq("department_id", session.department_id)
  .order("created_at", { ascending: false });

// Insert
const { data, error } = await insforge
  .from("events")
  .insert({ name, department_id, created_by: user.id, budget_total })
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

- Always scope queries to the current user's `department_id` (admin is unrestricted) — never query without this filter
- Always handle the `error` return — never assume success
- Use `.single()` when expecting exactly one row
- Never write a query that bypasses RLS assumptions — RLS is belt-and-suspenders, not a substitute for explicit filtering

---

### Storage

```typescript
// Upload file
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

**Storage paths** (keyed by ID, not name — stable across renames):

```
storage/
  departments/{department_id}/
    events/{event_id}/
      receipts/{entry_id}.jpg
      reports/{report_id}.pdf
      signed/{report_id}/page-{n}.jpg
```

**Rules:**

- Receipts: `upsert: false` — never overwrite a receipt entry image
- Reports: `upsert: false` — each Report row gets its own PDF path, never overwrite
- Signed pages keyed by `{report_id}`, not event — prevents collision across rejection/regeneration cycles
- Always save the public URL back to the DB after upload
- Never write files to disk — always upload buffer directly to storage

---

### Realtime Subscriptions

```typescript
// Department-scoped only — never subscribe globally
const channel = insforge.channel(`entries:${departmentId}`);

channel.on(
  "postgres_changes",
  {
    event: "INSERT",
    schema: "public",
    table: "entries",
    filter: `department_id=eq.${departmentId}`,
  },
  (payload) => {
    // handle new entry
  },
);

channel.subscribe();
```

**Rules:**

- Realtime channels are always scoped per department — never subscribe without a department filter
- Used for live budget counter updates on the Event Dashboard
- Never use realtime for auth state — that goes through InsForge's built-in `onAuthStateChange`

---

### RLS

- Every table carrying `department_id` gets a row-level policy: adviser and treasurer restricted to `department_id = current_user.department_id`; admin unrestricted
- Admin-only tables (`departments`, cross-department `audit_logs` reads) use a role check instead
- See `build-plan.md` — 00 Route × Role × Precondition Matrix — for the full RLS policy definitions

---

## OpenRouter

**Check first:** Check AGENTS.md for an installed OpenRouter skill. OpenRouter is our AI gateway for receipt OCR/parsing and signed-document verification — we never call OpenAI directly.

### Receipt Parsing (`agent/receipt-parser.ts`)

One document per upload — AI never auto-splits multiple documents from one image.

```typescript
// agent/receipt-parser.ts
// A failed/malformed parse never creates an Entry row — the image stays client-side
const response = await openrouter.chat.completions.create({
  model: "gpt-4o", // or equivalent OpenRouter model
  messages: [
    { role: "system", content: RECEIPT_EXTRACTION_PROMPT },
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  ],
});

const parsed = JSON.parse(response.choices[0].message.content!);
```

**Extracted fields:**

| Field | Rule | Notes |
|---|---|---|
| `document_type_raw` | Verbatim printed label, never forced into an enum | "Official Receipt", "Sales Invoice", "Cash Invoice", etc. |
| `document_type_category` | System-normalized enum | "official_receipt" / "sales_invoice" / "cash_invoice" / "other" — for reporting only |
| `document_number` | Tied to the `document_type_raw` label — Rule A | Never detached from its source label |
| `issue_date` / `issue_time` | `issue_time` optional, never date+time combined | |
| `supplier_name` | | |
| `amount` | Final Amount Due — Rule B — never sub-total | |
| `item_breakdown` | Required — description, qty, unit price, line amount | |

**Error handling:**

- After **3 failed attempts**, the UI surfaces the manual-entry fallback — the treasurer fills the fields by hand
- Log every failure to `audit_logs` with enough context to trace back to the upload attempt
- Never create an `Entry` row on failure — the image stays client-side as a retryable upload

### Document Verification (`agent/document-verifier.ts`)

```typescript
// agent/document-verifier.ts
// Signed-document completeness check — not a forgery/authenticity check
const response = await openrouter.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: SIGNED_DOCUMENT_PROMPT },
    {
      role: "user",
      content: signedPageImages.map((url) => ({
        type: "image_url",
        image_url: { url },
      })),
    },
  ],
});
```

**Checks performed:**

1. `fs_document_number` on the signed document matches the stored value
2. Signature marks present for each signatory (per `report_signatories`)
3. Page count matches `signed_page_count`

**Rules:**

- Always use **3-attempt fallback**: if OpenRouter returns malformed JSON or fails to extract, retry up to 3 times with the same image
- After 3 failures, the upload fails gracefully and the treasurer re-uploads
- Always wrap every OpenRouter call in try/catch — agent failures must never crash the API route
- Model is always `gpt-4o` (via OpenRouter) — never other models
- Use `response_format: { type: "json_object" }` for structured output
- Always parse `response.choices[0].message.content` as string and JSON.parse — even with json_object it returns a string
- Always validate parsed JSON with zod before using

---

## @react-pdf/renderer

**Check first:** Check AGENTS.md for an installed react-pdf skill. PDF generation APIs can differ from general training knowledge.

### Financial Report PDF (`components/reports/ReportPdf.tsx`)

Single fixed template — not per-department customizable.

```typescript
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica" },
  header: { marginBottom: 20 },
  table: { marginBottom: 10 },
  row: { flexDirection: "row", marginBottom: 4 },
  cell: { fontSize: 10, flex: 1 },
  totals: { marginTop: 10, borderTopWidth: 1, paddingTop: 6 },
  signatory: { marginTop: 20 },
});

const ReportPDF = ({
  departmentName,
  eventName,
  fsDocumentNumber,
  dateRange,
  entries,
  budgetTotal,
  totalSpent,
  signatories,
}: ReportPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Mabini Colleges letterhead */}
      <View style={styles.header}>
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>
          Mabini Colleges
        </Text>
        <Text style={{ fontSize: 10 }}>
          {departmentName} - {eventName}
        </Text>
      </View>

      {/* fs_document_number top-right */}
      <Text style={{ position: "absolute", top: 40, right: 40, fontSize: 8 }}>
        {fsDocumentNumber}
      </Text>

      {/* Itemized entry table */}
      {/* Date | Description/Category | Document Type | Document # | Amount */}

      {/* Totals block */}
      <View style={styles.totals}>
        <Text>Budget: ₱{budgetTotal.toLocaleString()}</Text>
        <Text>Total Spent: ₱{totalSpent.toLocaleString()}</Text>
        <Text>Remaining: ₱{(budgetTotal - totalSpent).toLocaleString()}</Text>
      </View>

      {/* Signatory block — ordered by sort_order */}
      {signatories.map((s) => (
        <View key={s.id} style={styles.signatory}>
          <Text style={{ fontSize: 10 }}>{s.position}</Text>
          <Text style={{ fontSize: 12, fontWeight: "bold" }}>{s.fullName}</Text>
        </View>
      ))}
    </Page>
  </Document>
);

// Generate buffer
const buffer = await renderToBuffer(
  <ReportPDF
    departmentName="..."
    eventName="..."
    fsDocumentNumber={report.fs_document_number}
    dateRange={dateRange}
    entries={entries}
    budgetTotal={budgetTotal}
    totalSpent={totalSpent}
    signatories={signatories}
  />,
);

// Upload directly to InsForge Storage
await insforge.storage
  .from("departments")
  .upload(`${departmentId}/events/${eventId}/reports/${reportId}.pdf`, buffer, {
    contentType: "application/pdf",
    upsert: false,
  });
```

**Supported CSS properties** (only these — others are silently ignored):
`padding, margin, fontSize, color, fontFamily, flexDirection, alignItems, justifyContent, borderRadius, width, height, fontWeight, textAlign, lineHeight, borderTopWidth, paddingTop, position, absolute, top, right`

**Rules:**

- Server-side only — never import in client components
- Always use `renderToBuffer` — not `renderToStream` or `PDFDownloadLink`
- PDF generation only in `app/api/reports/generate`
- Generated buffer uploaded directly to InsForge Storage — never written to disk
- Always save public URL to `Report.pdf_url` after upload
- `revision_count` is system/audit-only — never render it on the PDF
- Overspend entries get a row tint as a disclosure marker

---

## web-push

**Check first:** Check AGENTS.md for an installed web-push skill.

### Send Wrapper (`lib/web-push.ts`)

```typescript
// lib/web-push.ts
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.WEB_PUSH_SUBJECT!,
  process.env.WEB_PUSH_PUBLIC_KEY!,
  process.env.WEB_PUSH_PRIVATE_KEY!,
);

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: { title: string; body: string; url: string },
) {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
    );
  } catch (error: unknown) {
    // 410 Gone — subscription is expired, delete from push_subscriptions
    if (
      error instanceof Error &&
      "statusCode" in error &&
      (error as { statusCode: number }).statusCode === 410
    ) {
      const insforge = await createInsforgeServer();
      await insforge
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", subscription.endpoint);
    }
  }
}
```

**Notification types** (defined in `code-standards.md`):

| Type | When | Recipient |
|---|---|---|
| `report_ready_for_approval` | Report enters `pending_adviser_approval` | Adviser |
| `adviser_signup_pending` | New adviser signup submitted | Admin |
| `treasurer_signup_pending` | New treasurer signup submitted | Department Adviser |
| `signup_approved` | Signup approved | Applicant |
| `signup_rejected` | Signup rejected | Applicant |
| `report_rejected` | Adviser rejects a report | Treasurer |

Do not add more notification types without updating the table in `code-standards.md` first.

**Rules:**

- All push notifications go through `lib/web-push.ts` — never call the Web Push API directly
- Report-ready-for-approval notifications fire on **every** regeneration, not just the first
- On 410 Gone response, delete the subscription from `push_subscriptions` immediately
- Service Worker file lives at `public/sw.js` — see `build-plan.md` for setup
- Subscribe endpoint: `app/api/notifications/subscribe`
- Public key is `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` for client-side subscription

---
## lucide-react

**Check first:** Check AGENTS.md for an installed lucide-react skill.

### Import Pattern

```typescript
// Always import directly — never re-export
import { FileText, Upload, Download, Check, X, AlertCircle } from "lucide-react";
```

**Rules:**

- Only used via shadcn/ui components — never import lucide directly in page or feature components unless the icon is not available through the shadcn/ui wrapper
- Import directly from `lucide-react` — never create a barrel re-export
- Always use the exact icon name — never use aliases
- See `ui-rules.md` for nav item icon assignments (e.g., sidebar navigation uses specific icons per route group)

---

## ethers

**Check first:** Check AGENTS.md for an installed ethers skill. ethers is used only for Polygon hash-anchoring — one specific transaction per approved report.

### Hash-Anchoring (`agent/report-anchor.ts`)

```typescript
// agent/report-anchor.ts
// Anchoring happens at exactly one point: Report.status → approved
import { createHash } from "crypto";
import { ethers } from "ethers";

// SHA-256 hash of the report's immutable content
const hash = createHash("sha256")
  .update(fsDocumentNumber + pdfBytes + JSON.stringify(entryIdsAndAmounts))
  .digest("hex");

// Submit hash to Polygon
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL!);
const wallet = new ethers.Wallet(process.env.POLYGON_PRIVATE_KEY!, provider);

const tx = await wallet.sendTransaction({
  to: wallet.address, // self-transaction — hash stored in tx data
  data: "0x" + hash,
  // No value — zero-amount transaction
});

await tx.wait();

// Store resulting tx hash on Report.polygon_tx_hash
await createInsforgeServer()
  .from("reports")
  .update({ polygon_tx_hash: tx.hash })
  .eq("id", reportId);
```

**Rules:**

- No anchoring per-entry (too expensive) or at archive time (redundant — content already frozen at approval)
- Always use `ethers.JsonRpcProvider` — never `ethers.providers` (v5 API removed in v6)
- Hash inputs: `fs_document_number` + PDF bytes + entry IDs/amounts — must match exact fields the report content depends on
- Self-transaction pattern: send to `wallet.address` with hash in `data` — no ETH value needed
- Store the transaction hash on `Report.polygon_tx_hash` — never the content hash
- Polygon keys are server-only environment variables — never exposed to the client
- Run in `agent/` module via API route `app/api/reports/[reportId]/approve` — never call from Server Actions directly

---

## zod

**Check first:** zod is a general-purpose validation library. No specialized skill needed.

### Validation Pattern

```typescript
import { z } from "zod";

// OpenRouter response validation
const ReceiptParseSchema = z.object({
  document_type_raw: z.string(),
  document_type_category: z.enum([
    "official_receipt",
    "sales_invoice",
    "cash_invoice",
    "other",
  ]),
  document_number: z.string(),
  issue_date: z.string(),
  issue_time: z.string().optional(),
  supplier_name: z.string(),
  amount: z.number().positive(),
  item_breakdown: z.array(
    z.object({
      description: z.string(),
      qty: z.number().positive(),
      unit_price: z.number().positive(),
      line_amount: z.number().positive(),
    }),
  ),
});

// Parse and validate in one step
const result = ReceiptParseSchema.safeParse(parsedJson);
if (!result.success) {
  // Log validation error, retry or fall back to manual entry
  throw new Error(`Receipt parse validation failed: ${result.error.message}`);
}
```

**Rules:**

- Use `safeParse` over `parse` — never throw on validation failure, always handle gracefully
- Validate every OpenRouter response before using the data — agent output is not guaranteed to match the schema
- Validate API route input bodies with zod schemas — never trust raw request data
- Schemas for agent responses live in `agent/types.ts`
- Schemas for API routes live in the route handler file
- Never use zod for runtime DB query validation — use TypeScript types for that

---

## shadcn/ui

**Check first:** Check AGENTS.md for an installed shadcn/ui skill. Also read `ui-tokens.md` before creating any new component — the `@theme` tokens drive component styling.

### Initialization

Components are added via the shadcn/ui CLI:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

### Theming

All shadcn/ui components use CSS variables defined in `app/globals.css` under `@theme`. Never modify `tailwind.config.ts` for component colors — Tailwind v4 uses the `@theme` directive:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-background: #fafafa;
  --color-surface: #ffffff;
  --color-text-primary: #111827;
  /* ... all tokens from ui-tokens.md */
}
```

Components use these tokens via generated utility classes:

```tsx
className="bg-surface text-text-primary border-border"
```

### Component List

The full registered component list is in `ui-registry.md`. Before adding a new shadcn/ui component, check if the equivalent primitive is already registered there.

### Component Location

All shadcn/ui components live in `components/ui/` — never nest them in feature directories.

### Rules

- Components are always Server Components unless interactive (dropdown, dialog, sheet) — add `"use client"` only when required
- Never modify the generated component file's base styles — override via props or wrapped custom components
- When a shadcn/ui component accepts `asChild`, prefer it over wrapping with additional `<div>` elements
- See `ui-rules.md` for the complete button/badge/input styling guide that shadcn/ui components implement

---

## Poppins (next/font/google)

**Check first:** No specialized skill needed. Font loading is a Next.js built-in.

### Setup

```typescript
// app/layout.tsx
import { Poppins } from "next/font/google";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

**Token wiring (in `app/globals.css` `@theme`):**

```css
@theme {
  --font-sans: "Poppins", sans-serif;
}
```

After wiring, use via Tailwind utility class `font-sans` — which resolves to `--font-sans`, which maps to the Poppins CSS variable loaded in the root layout.

**Rules:**

- Only Poppins weights 400, 500, 600, 700 — never add extra weights
- The CSS variable on `<html>` is `--font-poppins`; the `@theme` token references `"Poppins", sans-serif` as a fallback stack — never tie `--font-sans` directly to the CSS variable (Tailwind v4 generates the font-face from next/font)
- Do not load Poppins in individual page layouts — load once in the root layout only
- See `ui-tokens.md` for the font token definition
- See `ui-rules.md` for font usage rules (headings, body, etc.)
