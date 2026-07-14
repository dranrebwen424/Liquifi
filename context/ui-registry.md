# UI Registry

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use

1. **Consult** — check if a similar component already exists in this registry
2. **If yes** — match its exact classes and patterns
3. **If no** — build it following `ui-rules.md` (component specs) and `ui-tokens.md` (raw token values), then add it here
4. **After building** — add a new entry with file path, date, exact classes, and pattern notes

---

## Global Conventions

These are established patterns referenced by components across the app. Full behavioral specs live in `ui-rules.md`; this section tracks which patterns exist.

| Convention | Source of Truth | Status |
|---|---|---|
| Currency formatting (PHP `decimal(12,2)`) | `ui-rules.md` → Currency | Established |
| Status badge color mapping (per state machine field) | `ui-rules.md` → Status Badge Color Mapping | Established |
| Role-scoped read-only mode (`readOnly` prop) | `ui-rules.md` → Role-Scoped Read-Only Mode | Established |
| Locked / archived banner | `ui-rules.md` → Locked / Archived Banner | Established |
| Voided / struck-through entries | `ui-rules.md` → Voided / Struck-Through Entries | Established |
| Required-reason modals (void, reject) | `ui-rules.md` → Required-Reason Modals | Established |
| Button variants (Primary, Secondary, Ghost, Destructive) | `ui-rules.md` → Buttons | Established |
| Card spec | `ui-rules.md` → Cards | Established |
| Table pattern | `ui-rules.md` → Table | Established |

---

## Built Components

Populate each entry as components are built, in build order. Use the format below.

```markdown
### ComponentName

File: components/area/ComponentName.tsx
Last updated: YYYY-MM-DD

| Property         | Class |
| ---------------- | ----- |
| Background       |       |
| Border           |       |
| Border radius    |       |
| Text — primary   |       |
| Text — secondary |       |
| Spacing          |       |
| Hover state      |       |
| Shadow           |       |
| Accent usage     |       |

**Pattern notes:**
```

### LandingPage

File: app/page.tsx
Last updated: 2026-07-12 (redesigned from Figma; refined for Antigravity-style whitespace + per-section visual hierarchy)

- Public route (no auth). Server Component, no `"use client"` needed.
- Structure mirrors Figma (web `#154:23` + mobile `#156:87`): sticky header (logo + nav), centered hero (eyebrow + H1 + subcopy + dual CTAs) followed by a product-visual panel, Features (×3), How it works (×3), final CTA card, footer.
- Page max-width `max-w-[1440px]`, `px-4 md:px-8` (16px mobile / 32px desktop) per `ui-rules.md`.
- Header: `sticky top-0` `bg-surface/90 backdrop-blur` `border-b border-border`, inner `h-16` flex. Logo = inline monoline SVG mark (`--color-accent`) + 20px/700 wordmark. Desktop nav (`md:flex`): ghost links "Features"/"How it works" (anchor `#features`/`#how`) + "Sign in" (`/login`) + "Get started" primary (`/signup`). Mobile (`md:hidden`): `<details>`/`<summary>` hamburger (3-line SVG, `list-none [&::-webkit-details-marker]:hidden`) → absolute dropdown with the same links + buttons; no client JS.
- Hero: eyebrow pill (`bg-accent-light text-text-dark`), H1 "From receipt to signed report — all in one place." (`text-[34px] sm:text-[48px] md:text-[56px]` bold, `tracking-tight`), subcopy `text-text-secondary`, two CTAs — primary `bg-accent text-accent-foreground` + secondary `border border-border bg-surface`.
- Hero visual: `rounded-[24px]` `overflow-hidden` `border border-border bg-surface` card acting as an **image holder** for the product screenshot — `next/image` of `/landing/img-1.png` (722×530, `priority`), `h-auto w-full`. Asset copied from `context/Design/img-1.png` into `public/landing/`. Replaces the earlier inline budget-dashboard mock.
- Features: centered heading "Features" + `h-0.5 w-12 bg-accent` underline + intro line; 3-col grid of `bg-surface` cards, each with `bg-accent-muted text-accent` icon tile (inline monoline SVG), title, body.
- How it works: same heading+underline pattern; 3-col cards with accent `01/02/03` labels.
- Final CTA: single `bg-surface` card (`border border-border`), heading + primary button (replaces the earlier `bg-accent` band so every section is a white card per `ui-rules.md`).
- Footer: `mt-auto border-t bg-surface`, logo + muted note.
- All styling uses `@theme` tokens only — no hardcoded hex, no raw Tailwind color classes. Inline SVG icons use `currentColor` resolved to token classes.

**Note:** Figma copy ("Automate Student Council Liquidation…") and gray placeholder rectangles are treated as layout/structure only — real copy and token styling come from `ui-tokens.md`/`ui-rules.md`; font stays Poppins (Figma used Montserrat, but our system mandates Poppins). The earlier `RoleCard` component was deleted 2026-07-12.

**Hierarchy/whitespace (2026-07-12 refinement):** Every section uses a consistent 3-tier visual hierarchy — small uppercase `text-text-muted` eyebrow (`tracking-[0.08em]`) → `text-base font-semibold text-text-primary` heading → `text-sm text-text-secondary` intro → content. Generous whitespace: sections `py-20 md:py-28`, hero `pt-20 md:pt-32 pb-16 md:pb-24`, feature/how grids `gap-8`. This is Antigravity-inspired (structural pattern + whitespace + hierarchy) but rendered in the light, monochrome token system — no dark bands, no card-color changes. Whitespace intentionally exceeds the `ui-rules.md` 24/32px spacing caps (pre-approved deviation for the airy feel). Still token-only; `tsc --noEmit` passes; page renders with 0 console errors.

---

### AuthShell

File: components/auth/AuthShell.tsx
Last updated: 2026-07-14 (Figma-matched restyle)

- Shared layout for all `app/(auth)/*` pages. Server Component (no `"use client"`).
- **Centered single-column** — no dark split brand panel (matches Figma `login-web` `#191:18`, which is a centered form on white with no side panel). `main` = `flex min-h-full items-center justify-center bg-background px-4 py-12`; inner `max-w-sm`.
- Centered logo (mark `text-accent` + 20px/700 wordmark) at top, `mb-8`.
- `subtitle` prop renders a centered `text-sm text-text-muted` line above the children. Children = the page form/card.

### AuthCard

File: components/auth/AuthCard.tsx
Last updated: 2026-07-14 (Figma-matched restyle)

| Property         | Class |
| ---------------- | ----- |
| Background       | (none — no card chrome; Figma has no bordered card) |
| Border           | (none) |
| Border radius    | (n/a) |
| Text — primary   | `text-[28px] font-bold leading-9 text-text-primary` (title; Figma WELCOME is Poppins 700) |
| Text — secondary | `text-sm font-normal text-text-secondary` (subtitle) |
| Spacing          | `flex flex-col gap-6` |

**Pattern notes:** Wraps each auth form. `title` + optional `subtitle` + `children`. No border/shadow/bg — the Figma login frame sits directly on white. Optional `center?: boolean` adds `text-center` to the root (used by `pending-approval` for a centered status layout; title + children all center).

### LottiePlayer
File: components/LottiePlayer.tsx
Last updated: 2026-07-14 (Lottie animation renderer)

- `"use client"`. Renders a Lottie JSON via `lottie-web` (dynamic `import()` inside `useEffect` so it stays out of the SSR bundle; `lottie-web` chosen over `lottie-react` to avoid React-19 peer-dep conflicts). Container `<div aria-hidden="true">` holds the injected SVG.
- Props: `src` (URL to the `.json`, spaces encoded e.g. `/Auth%20pages/loading-time.json`), `className?` (sizing, e.g. `h-48 w-48`), `loop?` (default true), `autoplay?` (default true).
- Cleanup destroys the animation on unmount / `src` change.
- Used by `pending-approval` for the `loading-time.json` loading animation (big, centered).

### AuthInput

File: components/auth/AuthInput.tsx
Last updated: 2026-07-14 (Figma-matched restyle)

- `"use client"` (controlled `value`/`onChange`). Used by every auth form.
- `label` is **required** and is the **floating label**: sits centered *inside* the input at rest (`top-1/2 -translate-y-1/2`), then scales down (`scale-90 text-xs`) and slides to the top-left on focus or when filled (`peer-focus:` / `peer-[:not(:placeholder-shown)]:` → `top-2`). Facebook/Material style. No label is rendered above the box anymore.
- Input padding `pt-6 pb-2 pl-4 pr-10` (room for the floated label + right-side badge); `rounded-lg border-border-strong bg-surface`, focus `border-accent ring-1 ring-accent`, ~52px tall.
- Props: `id`, `label` (required, floating text), `name?` (notice display name, defaults to `label`), `type`, `value`, `onChange`, `autoComplete`, `inputMode` (numeric/text/email/tel — OTP), `required`, `error?`. (No `placeholder` — the floating label replaces it; input uses `placeholder=" "` for the `:placeholder-shown` trick.)
- `type="password"` renders a **persistent eye toggle** at `right-3` (inline SVG, `text-text-muted` → `hover:text-text-primary`). Reveal/hide uses an internal `show` state that **survives blur** — this replaces the browser's native, focus-dependent reveal (which vanished on blur). When errored, the red `!` badge sits at `right-10` (left of the eye) and the input gets `pr-16`; otherwise password uses `pr-10`. Non-password fields use `pr-4` (or `pr-10` on error).
- `error?: boolean` → input `border-error` + `focus:ring-error` + `aria-invalid`; the floating label turns red; a red circular `!` badge (white `!`, `rounded-full bg-error`) renders **inside the input at the far right** (`right-3`, `pr-10` makes room); plus a `Please enter your <name>.` notice below. Each auth form sets `noValidate` + a `submitted` flag, so pressing Enter on an empty field triggers this (instead of native validation bubbles). Red clears as soon as the field is filled.
- Gap to next field: `gap-2` (8px).

### AuthOtpInput

File: components/auth/AuthOtpInput.tsx
Last updated: 2026-07-14 (6-digit OTP boxes)

- `"use client"`. Six separate single-digit boxes for the OTP page (`h-14 w-12`, centered `text-xl font-semibold`, `rounded-lg`). Row uses `justify-between` so the first box's left edge and the last box's right edge line up with the full-width button below (both sides aligned).
- Props: `value` (combined code string), `onChange(code)`, `length?` (default 6), `name?` (notice text, default "verification code"), `autoComplete?`, `error?`.
- Behavior: typing a digit auto-advances focus to the next box; `Backspace` on an empty box moves back and clears the previous; arrow keys navigate; pasting/autofilling a multi-digit string distributes across boxes (all non-digits stripped).
- `error?` → every box gets `border-error` + focus ring and a `Please enter your <name>.` notice shows below (no `!` badge — it threw the row off; boxes are `items-end` bottom-aligned).

### AuthSelect
File: components/auth/AuthSelect.tsx
Last updated: 2026-07-14 (custom dropdown, replaces native `<select>`)

- `"use client"`. Custom dropdown — **not** a native `<select>` (native arrow + popup look template-y). Renders a `<button>` control + token-themed popover `<ul role="listbox">`.
- Control matches `AuthInput` exactly: `rounded-lg border bg-surface pb-2 pl-4 pr-10 pt-6`, floating `label` at `top-2` (always floated — selects always carry a value), custom chevron (ChevronDown SVG) at `right-3` that rotates `rotate-180` when open, `focus:border-accent focus:ring-1`. `error?` → `border-error` + red label + `Please enter your <name>.` notice.
- Popover: `absolute z-30 mt-1 w-full rounded-lg border border-border-strong bg-surface py-1 shadow-card`. Option rows `px-4 py-2 text-sm`; selected → `bg-accent-muted font-medium text-accent`; keyboard/hovers `active` row → `bg-surface-secondary`. Closes on outside `mousedown`, `Escape`, or selection.
- Keyboard: button opens on `ArrowDown`/`Enter`/`Space`; `Arrow` moves `active`; `Enter`/`Space` selects; `Escape` closes.
- Props: `id`, `label` (required floating label), `value`, `onChange(value)`, `options: {value,label}[]`, `name?`, `required?`, `error?`.
- Used by `signup` for Role + Department. Neither `AuthShell` nor `AuthCard` clips (no `overflow-hidden`), so the popover overlays fields below safely.

### AuthButton

File: components/auth/AuthButton.tsx
Last updated: 2026-07-14 (Figma-matched restyle)

- `"use client"`. Four variants: `primary`, `secondary`, `outline`, `ghost`.
- **Variant classes mirror the landing page CTAs (`app/page.tsx`) exactly** so auth and marketing share one button language:
  - Primary: `bg-accent text-accent-foreground rounded-full px-6 py-3 hover:bg-accent-hover` (matches landing "Get started").
  - Secondary: `bg-surface border border-border text-text-primary rounded-full px-6 py-3 hover:bg-surface-secondary hover:border-border-strong` (matches landing hero "Sign in").
  - Outline (Figma "Create an account"): `bg-surface border border-accent text-accent rounded-full px-6 py-3 hover:bg-accent-muted` — ink-outline pill, added to match Figma's outlined CTA; same padding/radius as the others.
  - Ghost: `bg-transparent text-text-secondary rounded-md px-4 py-2 hover:bg-surface-secondary hover:text-text-primary` (matches landing nav links).
- Shared: `w-full text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50`. `loading` swaps label for "Please wait…" and forces disabled.
- **Auth pages render their primary buttons always-enabled** (no `disabled` prop) so they are always the ink-black CTA — matching the landing page's "Get started" CTA, which is never greyed/disabled. The `disabled`/`loading` API still exists in the component for future real-validation use; it is simply not passed from the mock auth pages.
- Padding `px-6 py-3` (not the `px-4 py-2` in `ui-rules.md` Buttons) to match the landing CTAs, which use the larger size; `w-full` spans the form width (landing buttons are auto-width).

### AuthLink

File: components/auth/AuthLink.tsx
Last updated: 2026-07-14 (Figma-matched restyle)

- Thin wrapper over `next/link`. `muted` prop (default false): `muted` → `text-text-muted hover:text-text-secondary` (Figma "Forget Password?" is gray); default → `text-accent hover:underline`. `className` appendable.
- Used for "Forget Password?" (muted), "Create one" / "Sign in" toggles, "Back to sign in", and resend-style inline links.

**Note (mock phase):** All five `app/(auth)/*` pages use `useState` mock submit handlers that `router.push` to the next step (signup→/otp→/pending-approval; forgot→inline success). No InsForge calls yet — real auth wiring lands in a later Phase 1 step. Signup role select is intentionally limited to `treasurer`/`adviser` (Admin excluded per `AGENTS.md`); department list is a hardcoded mock constant pending the `departments` table.

---

### Auth & Landing (Phase 1)

- [x] Landing Navbar
- [x] Landing Hero / How-It-Works / Footer
- [x] Login Card
- [x] Signup Form (role selector, department picker)
- [x] OTP Verification Screen (6-digit input, resend countdown)
- [x] Pending Approval Screen
- [x] Forgot Password Flow

### Admin (Phase 2)

- [ ] Departments List (with active adviser/treasurer indicators)
- [ ] New Department Form
- [ ] Department Detail Tabs (Events / Reports / Audit Logs / Users)
- [ ] Users Tab Row (deactivate/reactivate action)
- [ ] Admin Approvals List (adviser signups)

### Adviser (Phase 3)

- [ ] Adviser Approvals Tabs (Pending Expenses / Pending Users)
- [ ] Multi-select Batch Approve Table
- [ ] Single Reject Row (with required reason)

### Treasurer — Events & Budget (Phase 4)

- [ ] Events List Card (status badge + Total/Spent/Remaining preview)
- [ ] New Event Form
- [ ] Event Dashboard Summary Bar
- [ ] Locked/Archived Banner

### Treasurer — Entries (Phase 5)

- [ ] Entry Method Toggle (Receipt vs No Receipt)
- [ ] Receipt Upload Dropzone
- [ ] Receipt Review Panel (read-only extracted fields)
- [ ] Manual Entry Form
- [ ] Entry List Row (with voided/struck-through state)

### Voiding & Overspend (Phase 6)

- [ ] Void Reason Modal
- [ ] Overspend Explanation Modal

### Reports (Phase 7–8)

- [ ] Signatory Setup Step (add/remove rows, reuse last list)
- [ ] Report Preview (PDF preview + fs_document_number + status badge)
- [ ] Adviser Report Review Screen (entry list + overspend surfacing)
- [ ] Reject Modal (reason + optional per-entry comments)

### Archiving (Phase 9)

- [ ] Signed-Document Upload Modal
- [ ] Post-Check Result Screen (pass/fail per check)

### Notifications (Phase 10)

- [ ] Notification List Item (read/unread state)

### Audit (Phase 11)

- [ ] Audit Log Table (expandable metadata)

---

## Cross-Reference

| File | Purpose |
|---|---|
| `ui-tokens.md` | Raw token values — colors, spacing, radius, typography scale |
| `ui-rules.md` | Component specs — how to compose tokens into cards, buttons, inputs, badges, etc. |
| `ui-registry.md` (this file) | Living inventory of what was built, with exact classes used |
