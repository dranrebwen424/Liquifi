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
Last updated: 2026-07-12

- Public route (no auth). Server Component, no `"use client"` needed.
- Page max-width `max-w-[1440px]`, `px-6` (16px) mobile padding per `ui-rules.md`.
- Header: full-width `bg-surface` white, `border-b border-border`, inner `h-16` flex with logo (inline monoline SVG mark in `--color-accent` + 20px/700 wordmark) and two links: "Sign in" (ghost → `/login`), "Get started" (primary → `/signup`).
- Hero: centered eyebrow pill (`bg-accent-light text-text-dark`), `text-[32px]`/`sm:text-[40px]` H1, subcopy `text-text-secondary`, two CTAs (primary + secondary) linking to `/signup` + `/login`.
- Roles section: `grid md:grid-cols-3` of `<RoleCard>` so a visitor self-identifies their role (the page's narrow job: confirm the right person is in the right place).
- How-it-works: single `bg-surface` card, 3-col grid, accent `01/02/03` labels.
- Footer: `mt-auto border-t` so it pins to bottom; brand + muted internal note.

### RoleCard

File: components/landing/RoleCard.tsx
Last updated: 2026-07-12

| Property         | Class |
| ---------------- | ----- |
| Background       | `bg-surface` |
| Border           | `border border-border` → hover `border-border-strong` |
| Border radius    | `rounded-lg` |
| Text — primary   | `text-text-primary` (title, 16px/600) |
| Text — secondary | `text-text-secondary` (description, 14px/400) |
| Spacing          | `p-6`, `gap-4` grid, `mb-4` header row |
| Hover state      | `transition-colors hover:border-border-strong` |
| Shadow           | `shadow-[0px_1px_2px_rgba(17,17,20,0.04),0px_1px_3px_rgba(17,17,20,0.06)]` |
| Accent usage     | icon chip `bg-surface-secondary`; role badge uses `--role-*` tokens |

**Pattern notes:**
- Reused 3× (Treasurer / Adviser / Admin). `role` prop drives the fixed role-badge color map (`ROLE_BADGE`) — never inline role colors.
- Icon passed as `ReactNode` prop (inline stroke SVGs, `currentColor` inheriting `text-text-primary`).
- Badge pill: `inline-flex rounded-full px-2 py-0.5 text-xs font-medium` per `ui-rules.md` Badges.

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
