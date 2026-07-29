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
Last updated: 2026-07-17 (GSAP animation removed; plain server component, more whitespace + consistent card sizing)

- Public route (no auth). Server Component, no `"use client"` needed. (The earlier GSAP `LandingAnimations` wrapper was deleted 2026-07-17 — no animation library on the landing page.)
- More whitespace: hero `pt-24 md:pt-40 pb-20 md:pb-28`; feature/how sections `py-28 md:py-36`; CTA `py-16 md:py-20`; intro block `mb-16`; hero CTA `mt-12`. Exceeds `ui-rules.md` 24/32px caps (pre-approved airy deviation, same as 2026-07-12).
- Consistent card sizing: both feature + how grids use one shared `cardClass` (`flex h-full flex-col ... p-8`), grids `items-stretch` (default) so all cards match tallest in row; icon tiles `h-12 w-12`, title `mt-6`, body `leading-6` for even rhythm.
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

- [x] Departments List (folder-grid cards + visual hierarchy + mobile bottom-nav) — 2026-07-17
- [x] New Department Form
- [x] Department Detail Tabs (Events / Reports folder-grid; Users / Audit responsive tables) — 2026-07-17
- [x] Users Tab Row (deactivate/reactivate action)
- [ ] Admin Approvals List (adviser signups)

### Adviser (Phase 3)

- [x] Adviser Approvals Tabs (Pending Expenses / Pending Users)
- [x] Multi-select Batch Approve Table
- [x] Single Reject Row (with required reason)

### Treasurer — Events & Budget (Phase 4)

- [x] Events List Card (status badge + Total/Spent/Remaining preview)
- [x] New Event Form
- [x] Event Dashboard Summary Bar
- [x] Locked/Archived Banner

### Treasurer — Entries (Phase 5)

- [x] Entry Method Toggle (Receipt vs No Receipt)
- [x] Receipt Upload Dropzone
- [x] Receipt Review Panel (read-only extracted fields)
- [x] Manual Entry Form
- [x] Entry List Row (with voided/struck-through state)

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

### StatusBadge

File: components/ui/StatusBadge.tsx
Last updated: 2026-07-17

| Property         | Class |
| ---------------- | ----- |
| Background       | variant-dependent (see table below) |
| Border           | none |
| Border radius    | `rounded-full` |
| Text — primary   | variant-dependent |
| Spacing          | `px-2 py-0.5` |
| Hover state      | none |
| Shadow           | none |
| Accent usage     | none |

**Pattern notes:**
Single shared component driving every state-machine field. Variants: `default` (bg-accent-light text-accent), `success` (bg-success-lightest text-success-foreground), `warning` (bg-warning-lightest text-warning-foreground), `error` (bg-error-lightest text-error-foreground), `info` (bg-info-lightest text-info-foreground), `neutral` (bg-neutral-light text-text-muted). Also exports preset mappers: `AccountStatusBadge`, `EventStatusBadge`, `RoleBadge`. Used across departments list, department detail, and all future state-display surfaces.

### EmptyState

File: components/ui/EmptyState.tsx
Last updated: 2026-07-17

| Property         | Class |
| ---------------- | ----- |
| Background       | (none — no card chrome) |
| Border           | (none) |
| Border radius    | (n/a) |
| Text — primary   | `text-sm font-medium text-text-primary` (title) |
| Text — secondary | `text-sm text-text-muted` (description) |
| Spacing          | `py-12` vertical, `gap-2` between elements |
| Hover state      | none |
| Shadow           | none |
| Accent usage     | none |

**Pattern notes:**
Reusable empty state for any section that can be empty. Props: `icon?`, `title`, `description?`, `action?` (ReactNode for CTA button). Used in departments list (empty), department detail tabs (empty users/events/reports/audit logs). Follows `ui-rules.md` Empty States spec.

### AdminSidebar

File: components/admin/AdminSidebar.tsx
Last updated: 2026-07-17

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-surface` |
| Border           | `border-r border-border` |
| Border radius    | (none) |
| Text — primary   | `text-sm font-medium` nav items |
| Text — secondary | `text-text-secondary` inactive items |
| Spacing          | `px-3 py-4` nav, `gap-1` items |
| Hover state      | `hover:bg-surface-secondary hover:text-text-primary` |
| Shadow           | none |
| Accent usage     | active item: `bg-accent-light text-accent`; profile avatar: `bg-accent-light text-accent` |

**Pattern notes:**
Admin-only sidebar. Hidden on mobile (`hidden lg:flex`), fixed left 240px (`lg:w-60`). Visual hierarchy: **Logo** (`h-16`, mark `text-accent` + 20px/700 wordmark) → **Nav** (`flex-1 px-4 py-6`) with a small uppercase `Menu` section label (`text-xs font-medium uppercase tracking-[0.08em] text-text-muted`, `mb-3 px-3`) above the items, items spaced `gap-1.5` with `py-2.5` → **user profile block** at bottom (`relative border-t border-border p-3`). The profile row is a `button` (`aria-haspopup="menu"`) with a circular avatar tile (`h-9 w-9 rounded-full bg-accent-light text-accent`, monoline user SVG), name (`text-sm font-medium text-text-primary`, truncate) + role (`text-xs text-text-muted`), and a `ChevronUp` that rotates 180° when open. Clicking toggles a popover (`absolute bottom-16 left-3 right-3 rounded-lg border border-border bg-surface shadow-card`) with two `role="menuitem"` rows: "Profile" (`Link` to `/admin/profile`, `User` icon) and "Log out" (`text-error`, `LogOut` icon, `router.push("/login")` mock). Popover closes on outside `mousedown` or `Escape`. Balances the left side visually. Nav items: **Departments, Approvals only** — Profile was removed from the nav list (it lives in the bottom profile popover for visual balance, per 2026-07-17). Active detection via `usePathname()`. Mobile gets a top bar with logo + "Admin" pill instead. Server Component wrapped in layout; sidebar itself is `"use client"` for active-state detection. The "+ New Department" action lives on the departments page next to the search bar, not in the sidebar.

### DepartmentsPage

File: app/admin/departments/page.tsx
Last updated: 2026-07-17 (visual hierarchy + mobile bottom-nav session)

**Layout:** Centered column `mx-auto max-w-7xl flex flex-col gap-8 pb-28 md:pb-0`. Compact header (no eyebrow/rule): `text-xl font-semibold md:text-2xl` name + `text-xs text-text-muted` subline "Manage department accounts". Search row `flex items-center gap-3` (desktop: `hidden md:flex`; mobile: `flex md:hidden`) **outside the grid** so it stays visible behind modals/sheets. "New Department" primary button only on desktop; mobile uses a FAB → bottom sheet. **New Department** desktop modal (`fixed inset-0` + `bg-overlay-alpha`, centered `max-w-md p-8 shadow-card`) and mobile bottom sheet (`fixed inset-0 md:hidden`, `absolute inset-x-0 bottom-0 rounded-t-2xl`). Driven by `createView` (`null | "modal" | "sheet"`). Mobile bottom nav (`fixed inset-x-0 bottom-0 z-40 md:hidden`, 3 items: Departments active `text-accent` / Approvals / Profile→`/login`, each `flex-col items-center gap-1 py-2.5` icon+`text-[11px]`). FAB `fixed bottom-24 right-5 h-14 w-14 rounded-full bg-accent shadow-lg md:hidden`.

| Property           | Class |
| ------------------ | ----- |
| Page container     | `mx-auto flex max-w-7xl flex-col gap-8 pb-28 md:pb-0` |
| Header            | `text-xl font-semibold text-text-primary md:text-2xl` + `text-xs text-text-muted` subline |
| Search input       | `rounded-full border border-accent bg-surface py-3 pl-11 pr-4` + focus `border-accent ring-1 ring-accent`; paired with "New Department" primary (`rounded-full bg-accent px-4 py-3`) in `flex items-center gap-3` |
| Folder card (web)  | `h-[200px] w-full max-w-[280px] mx-auto rounded-xl border border-border-strong bg-surface p-6` — name `text-lg font-semibold line-clamp-2` primary, code `text-xs uppercase tracking-wide text-text-muted` secondary, roles `text-[11px] text-text-muted` tertiary, `StatusBadge` supporting; folder tile `h-9 w-9 rounded-lg bg-accent-light text-accent` top-right |
| Folder grid (web)  | `hidden grid-cols-1 gap-x-5 gap-y-8 sm:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5` |
| Card stack (mobile) | `flex flex-col gap-4 md:hidden` each `flex items-start justify-between gap-3 rounded-xl border border-border-strong bg-surface p-4` — name primary, code secondary, roles tertiary; `MoreVertical` menu + `StatusBadge` on right |
| Mobile bottom nav  | `fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface md:hidden` |
| Mobile FAB         | `fixed bottom-24 right-5 h-14 w-14 rounded-full bg-accent text-accent-foreground shadow-lg md:hidden` |

**Animation:** Cards stagger-entry on mount/filter change via framer-motion `motion.div` stagger container (see `ui-rules.md` → Animation Standards). Each card is a `motion.div` with `fadeUpItem` variants (`opacity: 0, y: 12` → `opacity: 1, y: 0`, spring easing, 200ms). Container uses `staggerChildren: 0.04, delayChildren: 0.05`. Applied to both web grid and mobile stack render branches. Re-triggers on `filtered` dependency change via `key` on the container. **Migrated from GSAP 2026-07-18.**

**Pattern notes:**
Folder cards establish clear visual hierarchy (primary name → secondary code → tertiary adviser/treasurer → supporting status) so nothing shouts. Name leads, folder tile shrunk to quiet 9×9 top-right corner. Web grid `gap-x-5 gap-y-8`; mobile stack `gap-4`. Search + tabs row render unconditionally (behind modals). Mobile drops the top-tab bar in favour of a bottom nav that mirrors the sidebar (Departments/Approvals/Profile). `pb-28` clears the bottom nav on mobile. Mock data only; `tsc --noEmit` passes.

### DepartmentDetailPage

File: app/admin/departments/[departmentId]/page.tsx (Server Component)
File: components/admin/DepartmentDetailClient.tsx (Client wrapper)
Last updated: 2026-07-18 (extracted client wrapper, real data + Server Actions)

**Layout:** `mx-auto flex flex-col gap-8 pb-24 md:pb-0`. Compact header (flat, no card chrome): `text-xl font-semibold md:text-2xl` name + `text-xs uppercase tracking-wide text-text-muted` code, `StatusBadge` quiet on right. Tabs: bottom-border bar `border-b border-border`, nav `overflow-x-auto`, active `border-b-2 border-accent text-accent` / inactive `border-transparent text-text-secondary hover:text-text-primary` (scrollable on mobile). Two content styles by data type:
- **Events & Reports** → folder-grid cards (same language as DepartmentsPage): web `hidden grid-cols-1 gap-x-5 gap-y-8 sm:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4`, cards `h-[180px] max-w-[280px] mx-auto rounded-xl border border-border-strong bg-surface p-6`. Event folder tile color-coded: **open** `bg-success-light text-success` + `text-success` status + `border-success/40`; **archived** `bg-accent-light text-accent` + `text-text-muted` + `border-border-strong`. Mobile stack `flex flex-col gap-4 md:hidden`.
- **Users & Audit Logs** → real `<table>` (desktop only, `hidden md:block`) with `rounded-xl border border-border-strong bg-surface`, header row `border-b border-border text-xs uppercase tracking-wide text-text-muted`, rows `border-b border-border last:border-0`, cells `px-6 py-3`; **mobile** renders a `flex flex-col gap-4 md:hidden` card stack instead (no horizontal scroll).

| Property         | Class |
| ---------------- | ----- |
| Header           | flat: `text-xl font-semibold md:text-2xl` name + `text-xs uppercase tracking-wide text-text-muted` code |
| Tabs             | `border-b border-border`; active `border-b-2 border-accent text-accent`; `overflow-x-auto` |
| Folder card      | `h-[180px] max-w-[280px] mx-auto rounded-xl border border-border-strong bg-surface p-6` |
| Folder grid      | `hidden grid-cols-1 gap-x-5 gap-y-8 sm:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4` |
| Table (desktop)  | `hidden md:block rounded-xl border border-border-strong bg-surface`; `px-6 py-3` cells |
| Mobile cards     | `flex flex-col gap-4 md:hidden` |

**Animation:** Tab content staggers on switch via framer-motion `AnimatePresence mode="wait"` + `motion.div` stagger container (see `ui-rules.md` → Animation Standards). Tab panel `key={activeTab}` drives the remount. Uses same `fadeUpItem` variants as DepartmentsPage (spring, 200ms, y: 12). Exit animation: `opacity: 0, y: -4, duration: 0.1`. **Migrated from GSAP 2026-07-18.**

**Pattern notes:**
Mirrors the departments list visual language — calm, scannable, nothing shouts. Events/reports use folder cards (events color-coded by open/archived); users/audit use tables on desktop, stacked cards on mobile. Users tab: name primary, email/role/status secondary, right-aligned Deactivate (destructive outline) / Reactivate (secondary outline). `formatPHP()` for currency. Mock data only; `tsc --noEmit` passes.

### AdminLayout

File: app/admin/layout.tsx
Last updated: 2026-07-17

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-background` |
| Border           | sidebar: `border-r border-border` |
| Border radius    | (none) |
| Text — primary   | logo: `text-lg font-bold` |
| Spacing          | main: `px-4 py-6 md:px-8 md:py-8` |
| Hover state      | (n/a) |
| Shadow           | (none) |
| Accent usage     | logo mark: `text-accent`, "Admin" pill: `bg-accent-light text-accent` |

**Pattern notes:**
Server Component with `requireLayoutRole("admin")` guard. Renders `AdminSidebar` + main content area (`lg:pl-60` to offset sidebar). Mobile gets a top bar (logo + "Admin" badge) instead of sidebar. Content wrapped in `max-w-[1440px]` centered container per `ui-rules.md`.

### TreasurerSidebar

File: components/treasurer/TreasurerSidebar.tsx
Last updated: 2026-07-18

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-surface` |
| Border           | `border-r border-border` |
| Nav spacing      | `px-3 py-4`, `gap-1.5` items |
| Active item      | `bg-accent-light text-accent` |
| Inactive item    | `text-text-secondary hover:bg-surface-secondary hover:text-text-primary` |
| Profile avatar   | `h-9 w-9 rounded-full bg-accent-light text-accent` |

**Pattern notes:** Mirrors AdminSidebar pattern exactly; 4 nav items (Home, Reports, Notifications, Profile). Same fixed 240px sidebar, mobile hidden, same bottom profile popover. Nav detection via `usePathname()`. Label order different from admin: Home is first (not Departments).

### TreasurerMobileBottomNav

File: components/treasurer/TreasurerMobileBottomNav.tsx
Last updated: 2026-07-18

| Property     | Class |
| ------------ | ----- |
| Background   | `bg-surface border-t border-border` |
| Position     | `fixed inset-x-0 bottom-0 z-40 md:hidden` |
| Item spacing | `flex-1 flex flex-col items-center gap-1 py-2` |
| Active item  | `text-accent` (icon + `text-[11px]` label) |
| Inactive     | `text-text-muted` |

**Pattern notes:** 4 items, matches sidebar. Same visual language as admin mobile bottom nav.

### EventCard

File: components/events/EventCard.tsx
Last updated: 2026-07-26 (larger name + shadow depth)

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-surface` |
| Border           | `border border-border` |
| Border radius    | `rounded-xl` |
| Spacing          | `p-5`, `gap-3` inner |
| Shadow           | `shadow-sm` at rest → `hover:shadow-md` on hover |
| Hover            | `hover:border-accent hover:scale-[1.02]` |
| Name             | `text-lg font-semibold` (was `text-base`) |

**Pattern notes:** Card showing event name (truncate), `EventStatusBadge`, `BudgetProgressBar` (h-2.5 rounded-full bg-neutral-light with blue fill). Bottom row: line items showing Total / Spent / Remaining in `text-xs text-text-muted` with `formatPHP()`. Colored remaining: green when within budget, red when overspent. Shadow depth creates visual hierarchy on the grid.

### EventListItem

File: components/events/EventListItem.tsx
Last updated: 2026-07-26 (hover shadow + accent bar)

| Property         | Class |
| ---------------- | ----- |
| Container        | `relative overflow-hidden rounded-xl border border-border bg-surface px-4 py-3 md:px-5` |
| Hover            | `hover:border-border-strong hover:bg-surface-secondary hover:shadow-md` |
| Left accent bar  | `absolute left-0 top-0 h-full w-[3px] -translate-x-full bg-success group-hover:translate-x-0` |
| Transition       | `transition-all duration-200` |

**Pattern notes:** List row with folder icon, name + date, amount/budget, progress bar, entry count, status badge, chevron. Left green accent bar slides in on hover via `translate-x` transform for modern interaction feedback. Chevron shifts right on hover (`group-hover:translate-x-0.5`).

### EventDashboardActions

File: components/events/EventDashboardActions.tsx
Last updated: 2026-07-26 (mobile-only, lg:hidden)

| Property         | Class |
| ---------------- | ----- |
| Container        | `grid grid-cols-2 gap-3 lg:hidden` |
| Primary button   | `flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-medium` + `hover:shadow-md hover:scale-[1.02] active:scale-[0.98]` |
| Secondary button | `flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium` + `hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]` |

**Pattern notes:** Mobile-only action buttons (`lg:hidden`). Desktop buttons are now inside `BudgetSummary`. Grid layout on mobile, full-width buttons with hover micro-popup.

### EventForm

File: components/events/EventForm.tsx
Last updated: 2026-07-25 (stripped page chrome — now embeddable in modals)

| Property         | Class |
| ---------------- | ----- |
| Input field      | `rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent` |
| Submit button    | `rounded-full bg-accent px-6 py-3 text-accent-foreground hover:bg-accent-hover disabled:opacity-50` |

**Pattern notes:** Pure form component (no card wrapper, no back link). Accepts optional `onSubmit` prop — when absent, mock-simulates success. Error display inline. Used by `NewEventModal` with `createEvent` Server Action wired as `onSubmit`. Also used standalone as fallback. Changed from page-wrapped to embeddable — the modal provides its own chrome (overlay, card, close button).

### NewEventModal

File: components/events/NewEventModal.tsx
Last updated: 2026-07-25

| Property       | Class |
| -------------- | ----- |
| Overlay        | `fixed inset-0 z-50 bg-overlay-alpha` |
| Modal (web)    | `relative w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-card` centered via flex |
| Sheet (mobile) | `max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-6 pb-8 shadow-card` + `mx-auto mb-5 h-1 w-10 rounded-full bg-border-strong` drag handle |
| Close button   | `absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:bg-surface-secondary hover:text-text-primary` |
| Cancel (mobile)| `w-full rounded-full border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary` |

**Pattern notes:** AnimatePresence modal/sheet shell wrapping `EventForm`. Props: `open`, `onClose`. Calls `createEvent` Server Action on submit → `router.refresh()` to revalidate list. Escape key and overlay click close. Body scroll locked when open. State resets on open. Follows `LogEntryModal` pattern exactly.

### BudgetSummary

File: components/events/BudgetSummary.tsx
Last updated: 2026-07-26 (rewritten — two-column with embedded buttons)

| Property       | Class |
| -------------- | ----- |
| Card           | `rounded-xl bg-surface-inverse p-5 shadow-card sm:p-6` |
| Hero label     | `text-xs font-medium uppercase tracking-wide text-text-inverse/60` |
| Hero value     | `text-[32px] font-semibold leading-9 tabular-nums sm:text-[40px] sm:leading-12 text-text-inverse` |
| Supporting label | `text-xs font-medium uppercase tracking-wide text-text-inverse/60` |
| Supporting value | `text-sm font-semibold tabular-nums text-text-inverse` |
| Status text    | `text-xs text-text-inverse/60` right-aligned at bottom |
| Primary button | `bg-surface text-text-inverse rounded-lg px-5 py-2.5 text-sm font-medium` + `hover:bg-surface-secondary hover:shadow-md active:scale-[0.98]` (desktop only) |
| Secondary button | `border border-white/30 text-text-inverse rounded-lg px-5 py-2.5 text-sm font-medium` + `hover:bg-white/10 hover:shadow-sm active:scale-[0.98]` (desktop only) |

**Pattern notes:** Dark hero card with two-column flex layout. Left: EXPENSES label + remaining value + TOTAL/PAID row. Right: action buttons stacked vertically (desktop only, `hidden lg:flex`). Bottom-right: budget status text ("Budget Fully Utilized" / "Over Budget" / "{pct}% Budget Utilized"). No progress bar. Contains `LogEntryModal` for the "+ New Entry" button. Uses `bg-surface-inverse` for dark background, `text-text-inverse` for white text.

### ExpenseFilters

File: components/entries/ExpenseFilters.tsx
Last updated: 2026-07-26 (new component)

| Property       | Class |
| -------------- | ----- |
| Container      | `flex items-center gap-2` |
| Chip (default) | via `FilterDropdown`: `rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium` |
| Chip (active)  | via `FilterDropdown`: `border-accent bg-accent-muted text-accent` |

**Pattern notes:** 4 filter chips using existing `FilterDropdown` component. Filters: Type (All/With Receipt/Manual), Sort (Newest/Oldest/Amount High-Low/Amount Low-High), Budget (All/₱0–100/₱100–500/₱500–1000/₱1000+), Category (All + dynamic from data). State managed in `ExpensesSection` parent component.

### ExpensesSection

File: components/entries/ExpensesSection.tsx
Last updated: 2026-07-26 (new component)

| Property       | Class |
| -------------- | ----- |
| (wraps EntryList with filter logic) | |

**Pattern notes:** Client component that manages filter state and passes filtered entries to `EntryList`. Filters by type, budget range, category, and sorts by newest/oldest/amount. Renders `ExpenseFilters` as a slot in the `EntryList` header. Replaces the direct `EntryList` usage on the event dashboard.

### EventProgress

File: components/events/EventProgress.tsx
Last updated: 2026-07-26 (new component — horizontal step bar)

| Property       | Class |
| -------------- | ----- |
| Card           | `rounded-xl border border-border bg-surface p-4 shadow-card` |
| Step dot (active) | `h-7 w-7 rounded-full bg-accent text-accent-foreground` |
| Step dot (completed) | `h-7 w-7 rounded-full bg-success text-white` |
| Step dot (pending) | `h-7 w-7 rounded-full border-2 border-border bg-surface text-text-muted` |
| Connector (completed) | `h-0.5 flex-1 bg-success` |
| Connector (pending) | `h-0.5 flex-1 bg-border` |
| Label | `text-[11px] font-medium` — active/completed: `text-text-primary`, pending: `text-text-muted` |

**Pattern notes:** Horizontal 3-step progress bar showing event lifecycle: Open → Report Pending → Approved. Completed steps show `Check` icon, active shows step number, pending shows empty ring. Steps connected by thin lines. Logic: `status === "open"` → step 1 active; `isLocked` → step 2 active; `status === "archived"` → all completed.

### LockedBanner

File: components/events/LockedBanner.tsx
Last updated: 2026-07-26 (icon + left border accent)

| Property          | Class |
| ----------------- | ----- |
| Container (locked) | `flex items-center gap-3 rounded-xl border border-border border-l-[3px] border-l-info bg-info-lightest px-4 py-3` |
| Container (archived) | `flex items-center gap-3 rounded-xl border border-border border-l-[3px] border-l-neutral bg-neutral-light px-4 py-3` |
| Icon              | `h-4 w-4 shrink-0` — Lock / Archive from lucide-react |
| Title             | `text-sm font-medium` — `text-info-foreground` (locked) / `text-neutral-foreground` (archived) |
| Description       | `text-xs text-text-muted` |

**Pattern notes:** Two variants: info-blue left border + Lock icon for locked (report pending/approved), neutral left border + Archive icon for archived. Left border accent (`border-l-[3px]`) adds visual weight. Icon + title + description layout for clear hierarchy. Only renders when `isLocked` or `isArchived` is true.

### EntryRow

File: components/entries/EntryRow.tsx
Last updated: 2026-07-26 (hover state added)

| Property      | Class |
| ------------- | ----- |
| Container     | `border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-surface-secondary` |
| Type badge    | `rounded-full px-2 py-0.5 text-[11px] font-medium` — receipt: `bg-info-lightest text-info-foreground`; manual: `bg-surface-secondary text-text-secondary` |
| Status badge  | Uses `StatusBadge` preset mapper (ai_parsed→info, deducted→success, voided→error, etc.) |
| Void state    | `opacity-60` container + `line-through` on amount + inline void reason |

**Pattern notes:** Single entry row with type indicator, description/supplier, amount, and status badge. Hover: `bg-surface-secondary` with `transition-colors`. Voided entries: dimmed, struck-through amount, always-visible void reason attribution line (not hover-revealed).

### EntryCard

File: components/entries/EntryCard.tsx
Last updated: 2026-07-26 (hover animation, click-to-detail, reference design match)

| Property       | Class |
| -------------- | ----- |
| Card           | `rounded-xl border border-border bg-surface shadow-sm cursor-pointer` + `transition-[shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]` |
| Preview area   | `h-32 w-full relative` — receipt: styled receipt placeholder; manual: centered `Pencil` icon on `bg-surface-secondary` |
| Status badge   | `absolute right-2 top-2` — overlaid on preview area |
| Content area   | `flex-1 flex-col justify-between p-3` — fills remaining space, pushes amount to bottom |
| Supplier name  | `text-sm font-medium text-text-primary line-clamp-1` |
| Category       | `text-xs text-text-muted line-clamp-1` (or `\u00A0` placeholder for consistent height) |
| Amount         | `text-xl font-bold tabular-nums text-text-primary` (most prominent) |
| Void state     | `opacity-60` card + `line-through` on amount + void attribution below |

**Pattern notes:** Grid card matching reference design (`entrycard.png`). Large preview area (~60% of card) with status badge overlay. Supplier name and amount are visual highlights. Card is clickable — opens `EntryDetailModal` showing all parsed content. Hover: 2px lift + shadow deepening. Press: scale 0.98 feedback.

### EntryDetailModal

File: components/entries/EntryDetailModal.tsx
Last updated: 2026-07-26 (new component)

| Property       | Class |
| -------------- | ----- |
| Overlay        | `fixed inset-0 z-50 bg-overlay-alpha` |
| Modal (desktop)| `hidden sm:flex` — `max-h-[85vh] max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-card` centered |
| Sheet (mobile) | `sm:hidden` — `max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-6 pb-8 shadow-card` slides up |
| Close button   | `absolute right-4 top-4 h-7 w-7 rounded-full text-text-muted hover:bg-surface-secondary` |
| Detail rows    | `divide-y divide-border rounded-lg border border-border bg-surface-secondary/50 px-4` |
| Item breakdown | `overflow-hidden rounded-lg border border-border` table |

**Pattern notes:** Shows all parsed entry content: receipt image (placeholder for now), supplier name, category, amount, status badge, document type/number, date/time, item breakdown table (receipt only), void info (if voided). Desktop: centered modal with `dialogContent` animation. Mobile: bottom sheet with `sheetSlideUp` animation. Image viewer: full-screen overlay with dark backdrop (click receipt to view). Reuses `dialogOverlay`, `dialogContent`, `sheetSlideUp` from `lib/motion-variants.ts`.

### EntryList

File: components/entries/EntryList.tsx
Last updated: 2026-07-26 (click-to-detail modal, expanded entry type)

| Property   | Class |
| ---------- | ----- |
| Header     | `flex flex-wrap items-center gap-3` — "EXPENSES (count)" + filter slot + view toggle |
| Grid       | `grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6 xl:grid-cols-5` |
| Animation  | framer-motion `staggerContainer` + `fadeUpItem` from `lib/motion-variants` |

**Pattern notes:** Card grid layout — 5 columns on desktop (`xl:`), 4 on large (`lg:`), 3 on tablet (`md:`), 2 on mobile. Header shows "EXPENSES (count)" title with filter chips (desktop) or filter icon (mobile) + ViewToggle on far right. Each card is clickable — opens `EntryDetailModal` with full entry details. Manages `selectedEntry` state. Exported `EntryListItem` type includes all parsed fields for the modal.

### ReceiptUpload

File: components/entries/ReceiptUpload.tsx
Last updated: 2026-07-18

| Property        | Class |
| --------------- | ----- |
| Upload zone     | `rounded-xl border-2 border-dashed p-12` — drag: `border-accent bg-accent-muted`; idle: `border-border-strong bg-surface hover:border-accent hover:bg-accent-muted` |
| Icon circle     | `flex h-12 w-12 items-center justify-center rounded-full bg-accent-light text-accent` |
| File row        | `flex items-center gap-3 text-sm` with `FileImage` icon |
| Remove button   | `absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-secondary shadow` |
| Upload button   | `rounded-full bg-accent px-6 py-3 text-accent-foreground hover:bg-accent-hover disabled:opacity-50` |
| Progress bar    | `h-1.5 w-full overflow-hidden rounded-full bg-border-light` with `animate-pulse rounded-full bg-accent` fill |

**Pattern notes:** Drag/drop zone with click-to-browse fallback. Validates file type (JPEG/PNG/WebP) and size (10MB). Shows image preview after selection. Mock 1s parse delay via `setTimeout(1000)`. Calls `onParsed(mock)` with `MockParsedReceipt` shape. `resetFile` clears selection for re-upload.

### ReceiptReview

File: components/entries/ReceiptReview.tsx
Last updated: 2026-07-18

| Property          | Class |
| ----------------- | ----- |
| Overlay           | `fixed inset-0 z-50 bg-overlay-alpha` |
| Modal (desktop)   | `relative w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-card` centered via flex |
| Sheet (mobile)    | `max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-6 pb-8 shadow-card` with `mx-auto mb-5 h-1 w-10 rounded-full bg-border-strong` drag handle |
| Read field        | `rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm text-text-primary` |
| Highlighted field | `rounded-lg bg-info-lightest px-3 py-2 text-sm font-semibold text-info-foreground` (amount) |
| Item table        | `rounded-lg border border-border` with thead `bg-surface-secondary`, tbody rows `border-b border-border last:border-0`, tfoot `border-t border-border-strong bg-surface-secondary font-medium` |
| Confirm button    | `rounded-full bg-accent px-6 py-3 text-accent-foreground hover:bg-accent-hover` with `Check` icon |
| Discard button    | `rounded-full border border-error px-6 py-3 text-error hover:bg-error-lightest` with `X` icon |

**Pattern notes:** AnimatePresence overlay + two render branches (`hidden sm:flex` modal / `sm:hidden` bottom sheet). Closes on Escape or overlay click (only when not confirming). Uses `dialogOverlay` / `dialogContent` from framer-motion variants. Exported `ReadOnlyField` atom for reuse. Props: `open`, `data: MockParsedReceipt`, `onConfirm`, `onDiscard`, `onClose`, `confirming?`.

### ManualEntryForm

File: components/entries/ManualEntryForm.tsx
Last updated: 2026-07-18

| Property        | Class |
| --------------- | ----- |
| Header icon     | `flex h-10 w-10 items-center justify-center rounded-lg bg-surface-secondary text-text-secondary` |
| Input field     | `rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent` |
| Item card       | `rounded-lg border border-border bg-surface p-3` with delete button `rounded-md p-1 text-text-muted hover:bg-error-lightest hover:text-error` |
| Qty/price input | `rounded-lg border border-border bg-surface px-2 py-1.5 text-sm tabular-nums focus:border-accent focus:ring-1 focus:ring-accent` |
| Amount display  | `flex h-9 items-center rounded-lg border border-border bg-surface-secondary px-2 text-sm tabular-nums text-text-primary` |
| Total row       | `rounded-lg border border-border-strong bg-surface-secondary p-4` with `text-lg font-semibold tabular-nums` |
| Submit button   | `rounded-full bg-accent px-6 py-3 text-accent-foreground hover:bg-accent-hover disabled:opacity-50` |
| Add item button | `rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary` |

**Pattern notes:** Inline form (not a modal). Dynamic item rows with auto-computed `lineAmount = qty * unitPrice` and `totalAmount = sum(lineAmounts)`. Username-style `FormField` wrapper component. `itemBreakdown` type used but not exported (local `ManualLineItem` type). Mock 600ms submit delay. Calls `onSubmit(data: ManualEntryData)`.

### LogEntryModal

File: components/entries/LogEntryModal.tsx
Last updated: 2026-07-18

| Property       | Class |
| -------------- | ----- |
| Overlay        | `fixed inset-0 z-50 bg-overlay-alpha` |
| Modal (web)    | `relative w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-card` centered via flex |
| Sheet (mobile) | `max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-6 pb-8 shadow-card` + `mx-auto mb-5 h-1 w-10 rounded-full bg-border-strong` drag handle |
| Toggle         | `rounded-xl border border-border bg-surface p-1` — active: `bg-accent text-accent-foreground shadow-sm`; inactive: `text-text-secondary hover:text-text-primary` |

**Pattern notes:** AnimatePresence modal/sheet shell that wraps the same entry-logging flow previously on the standalone page. Method toggle hidden during receipt review. On confirm/submit → calls `onClose()` instead of navigating. State resets on open via `useEffect`. Uses `dialogOverlay`/`dialogContent` framer-motion variants.

### NewEntryPage (standalone fallback)

File: app/treasurer/events/[eventId]/entries/new/page.tsx
Last updated: 2026-07-18

**Layout:** Centered `mx-auto max-w-2xl flex flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10`. Back link `ArrowLeft` → event dashboard. Page heading "Log Entry" with subtitle. Method toggle `rounded-xl border border-border bg-surface p-1` segmented control with `Camera` / `Pencil` icons. Content card `rounded-xl border border-border-strong bg-surface p-5 sm:p-6`. Renders `ReceiptUpload` or `ManualEntryForm` based on toggle state. When receipt parsed → renders `ReceiptReview` modal/sheet. Confirm navigates back to event dashboard after 800ms mock. Discard closes review and resets to upload state.

| Property        | Class |
| --------------- | ----- |
| Method toggle   | `rounded-xl border border-border bg-surface p-1` with `flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium` — active: `bg-accent text-accent-foreground shadow-sm`; inactive: `text-text-secondary hover:text-text-primary` |
| Content card    | `rounded-xl border border-border-strong bg-surface p-5 sm:p-6` |

---

## Cross-Reference

| File | Purpose |
|---|---|
| `ui-tokens.md` | Raw token values — colors, spacing, radius, typography scale |
| `ui-rules.md` | Component specs — how to compose tokens into cards, buttons, inputs, badges, etc. |
| `ui-registry.md` (this file) | Living inventory of what was built, with exact classes used |
