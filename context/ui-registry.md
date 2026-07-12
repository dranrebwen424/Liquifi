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
- Hero visual: `rounded-[24px]` surface card (`border border-border` + soft shadow) mocking an event budget dashboard — status badge ("Open", `bg-success-lightest`), three stat numbers (Total/Spent/Remaining, `text-[28px]/600`), budget bar (`bg-border-light` track + `bg-success` fill, 64.8%), and two entry rows with source/status badges (`info` = AI-parsed, `warning` = Pending). Demonstrates the product in the Figma "hero image" slot.
- Features: centered heading "Features" + `h-0.5 w-12 bg-accent` underline + intro line; 3-col grid of `bg-surface` cards, each with `bg-accent-muted text-accent` icon tile (inline monoline SVG), title, body.
- How it works: same heading+underline pattern; 3-col cards with accent `01/02/03` labels.
- Final CTA: single `bg-surface` card (`border border-border`), heading + primary button (replaces the earlier `bg-accent` band so every section is a white card per `ui-rules.md`).
- Footer: `mt-auto border-t bg-surface`, logo + muted note.
- All styling uses `@theme` tokens only — no hardcoded hex, no raw Tailwind color classes. Inline SVG icons use `currentColor` resolved to token classes.

**Note:** Figma copy ("Automate Student Council Liquidation…") and gray placeholder rectangles are treated as layout/structure only — real copy and token styling come from `ui-tokens.md`/`ui-rules.md`; font stays Poppins (Figma used Montserrat, but our system mandates Poppins). The earlier `RoleCard` component was deleted 2026-07-12.

**Hierarchy/whitespace (2026-07-12 refinement):** Every section uses a consistent 3-tier visual hierarchy — small uppercase `text-text-muted` eyebrow (`tracking-[0.08em]`) → `text-base font-semibold text-text-primary` heading → `text-sm text-text-secondary` intro → content. Generous whitespace: sections `py-20 md:py-28`, hero `pt-20 md:pt-32 pb-16 md:pb-24`, feature/how grids `gap-8`. This is Antigravity-inspired (structural pattern + whitespace + hierarchy) but rendered in the light, monochrome token system — no dark bands, no card-color changes. Whitespace intentionally exceeds the `ui-rules.md` 24/32px spacing caps (pre-approved deviation for the airy feel). Still token-only; `tsc --noEmit` passes; page renders with 0 console errors.

---

### Auth & Landing (Phase 1)

- [x] Landing Navbar
- [x] Landing Hero / How-It-Works / Footer
- [ ] Login Card
- [ ] Signup Form (role selector, department picker)
- [ ] OTP Verification Screen (6-digit input, resend countdown)
- [ ] Pending Approval Screen
- [ ] Forgot Password Flow

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
