# Memory — Phase 5 Entry Logging UI (Step 13)

Last updated: 2026-07-18

## What was built

### Entry Logging UI (Receipt Upload)
- **`components/entries/ReceiptUpload.tsx`** — Drag/drop zone + file picker, file validation (type/size), image preview, mock 1s "AI parse" that returns `MockParsedReceipt`
- **`components/entries/ReceiptReview.tsx`** — AnimatePresence centered modal (sm+) / bottom sheet (<sm), read-only AI-parsed fields + itemized breakdown table, Confirm & Deduct / Discard & Re-upload buttons

### Entry Logging page → modal/sheet refactor
- **`components/entries/LogEntryModal.tsx`** — Single-modal shell (no nested modals). Contains method toggle + ReceiptUpload or ManualEntryForm, swaps to inline review content on receipt parse confirm/submit closes modal instead of navigating
- **`components/events/EventDashboardActions.tsx`** — Client component owning the "Log Entry" button + modal state, keeps dashboard page as Server Component
- **`app/treasurer/events/[eventId]/page.tsx`** — Replaced `<Link to="/entries/new">` with `<EventDashboardActions>`, removed unused imports

### Revamped Manual Entry Form (No Receipt)
- **`components/entries/ManualEntryForm.tsx`** — Full rewrite:
  - **Basic Info section**: Activity/Event Name (required), Date Incurred (date picker, required), Brief Description (optional textarea)
  - **Expense type selector**: 3-col (mobile) / 4-col (desktop) grid of icon cards (lucide-react). 7 types: Transportation (Bus), Meals (UtensilsCrossed), Supplies (Package), Printing (Printer), Rental (CalendarDays), Honorarium (Award), Others (Ellipsis). Active card: `border-accent bg-accent-muted ring-1 ring-accent`
  - **Conditional compute fields**: Each type renders only its relevant fields. Transportation = rate × persons × trips, Meals = amount/head × persons × days, Supplies = unitPrice × qty, Printing = rate × pages × copies, Rental = rate × days, Honorarium = flat amount, Others = flat total
  - **Live formula breakdown**: Shows e.g. `₱35.00 × 4 persons × 2 trips = ₱280.00` below the compute fields, updates in real time
- **Standalone page retained** at `app/treasurer/events/[eventId]/entries/new/page.tsx` as fallback

## Decisions made (locked)

- **Entry logging in a modal/sheet, not a page** — User confirmed this UX preference. The modal opens from the dashboard, contains all 3 states (choose method → upload/form → review), and closes on submit. No navigation away from dashboard.
- **No nested modals** — ReceiptReview's modal/sheet shell is NOT used inside LogEntryModal. The review content renders inline (replaces the upload content) to avoid overlay stacking.
- **Expense type as icon card grid** — 7 types with individual compute formulas. Single-field types (honorarium, others) skip the formula breakdown.
- **`Others` (not `Miscellaneous`)** — User confirmed the rename.

## Current state

- Build passes clean (`tsc --noEmit`)
- Dashboard "Log Entry" button opens modal (web centered / mobile bottom sheet)
- Modal: method toggle → Receipt Upload or No Receipt
- Receipt flow: upload → mock parse → review inline → Confirm closes modal / Discard resets to upload
- Manual flow: fill basic info → pick expense type → fill compute fields → live formula → submit closes modal
- All components use mock data — no real API wiring yet
- The standalone `/entries/new` page still exists as a fallback route

## Next session starts with

Step 14 — Receipt Parsing: OpenRouter integration. Replace the mock 1s parse in `ReceiptUpload.tsx` with a real call to OpenRouter via `agent/receipt-parser.ts`, create `POST /api/entries/parse` route, and wire the zod-validated response back to `ReceiptReview`.

## Open questions

- None currently.
