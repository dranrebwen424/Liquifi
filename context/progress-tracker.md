# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 0 — Authorization Foundation
**Last completed:** 00 Route × Role × Precondition Matrix
**Next:** 01 Landing + Auth Shell

---

## Progress

### Phase 0 — Authorization Foundation

- [x] 00 Route × Role × Precondition Matrix

### Phase 1 — Foundation

- [ ] 01 Landing + Auth Shell
- [ ] 02 Database Schema
- [ ] 03 Auth — Signup, OTP, Approval Routing
- [ ] 04 Login, Session, Role-Based Redirect

### Phase 2 — Admin: Departments & Approvals

- [ ] 05 Admin Departments Page — Full UI
- [ ] 06 Admin Departments — Real Data + Mutations
- [ ] 07 Admin Approvals — Adviser Signups

### Phase 3 — Adviser: Approvals

- [ ] 08 Adviser Approvals Page — Full UI
- [ ] 09 Adviser Approvals — Real Data + Mutations

### Phase 4 — Treasurer: Events & Budget

- [ ] 10 Treasurer Home + Event Creation — Full UI
- [ ] 11 Event Creation + Budget Lock — Real Data
- [ ] 12 Event Dashboard — Full UI

### Phase 5 — Treasurer: Logging Entries

- [ ] 13 Entry Logging — Full UI
- [ ] 14 Receipt Parsing — OpenRouter Integration
- [ ] 15 Receipt Confirm / Discard + Budget Deduction
- [ ] 16 Manual (No-Receipt) Entry Submission

### Phase 6 — Voiding & Overspend

- [ ] 17 Void Entry — Full UI + Logic
- [ ] 18 Overspend Explanation Flow

### Phase 7 — Reports: Generation

- [ ] 19 Report Generation — Full UI
- [ ] 20 Report Generation — Real Logic
- [ ] 21 Cancel Pending Report

### Phase 8 — Reports: Adviser Review

- [ ] 22 Adviser Report Review — Full UI
- [ ] 23 Report Approve / Reject — Real Logic

### Phase 9 — Archiving

- [ ] 24 Archive Event — Full UI
- [ ] 25 Archive Event — Real Logic

### Phase 10 — Notifications

- [ ] 26 Push Notifications — Full Setup
- [ ] 27 Notification Retention Job

### Phase 11 — Audit & Read-Only Views

- [ ] 28 Audit Log — Admin View
- [ ] 29 Adviser & Admin Read-Only Event/Report Views

**Total: 1 / 30 features complete**

---

## Decisions Made During Build

- **2026-07-12 — Landing page UI (`app/page.tsx` + `components/landing/RoleCard.tsx`):** Built the public landing page per Phase 1 / `01` (Landing Navbar + Hero/How-It-Works/Footer). Narrow job = confirm the right visitor is in the right place, done via a role-identification grid (Treasurer / Adviser / Admin) using `<RoleCard>` (reused 3×, role-badge color map keyed off `--role-*` tokens). All styling uses `@theme` tokens only — no hardcoded hex, no raw Tailwind color classes. `tsc --noEmit` passes; page renders 200 with correct a11y tree. Note: the reference `context/Design/landing-page.png` could NOT be viewed (this model has no image input) — built from `ui-tokens.md`/`ui-rules.md` instead. `/login` and `/signup` links point to pages not yet built (Phase 1 auth shell remains). Did not check `01` fully since Login/Signup/OTP/Pending/Forgot are still pending.
- **2026-07-12 (revision) — Landing page reshaped:** Per user direction, removed the Treasurer/Adviser/Admin role grid (`components/landing/RoleCard.tsx` deleted — now dead code) and replaced it with a **Problem** section ("The paper trail ends here." + 3 pain points from `project-overview.md`) as the identity-confirmation device. Hero H1 changed to "From receipt to signed report — all in one place." Added a high-contrast **final bottom CTA** band (`bg-accent`). CTA placement = Navbar + Hero + bottom. Section order: Navbar → Hero → Problem → How it works → Final CTA → Footer. Still token-only; `RoleCard` entry removed from `ui-registry.md`.
- **2026-07-12 (redesign) — Landing page rebuilt from Figma:** Pulled Figma web (`#154:23`) + mobile (`#156:87`) via `figma_get_figma_data`; used as **structure/layout only** (not copy or exact styling). New section order: Navbar → Hero(+ product-visual dashboard mock) → Features(×3) → How it works(×3) → Final CTA → Footer. Mobile nav = native `<details>`/`<summary>` hamburger (no client JS). Replaced the `bg-accent` final CTA band with a white `bg-surface` card so every section is a white card per `ui-rules.md`. Hero visual = token-styled mock of an event budget dashboard (status/stat/budget-bar/entries). Figma used Montserrat → overridden to Poppins (system mandate). `tsc --noEmit` passes. `app/page.tsx` is the single landing source (RoleCard still dead code, confirmed no references).
- **2026-07-12 (hierarchy/whitespace refinement) — Antigravity pattern, token-only:** Per user, adopted Antigravity's *structural pattern, whitespace, and visual hierarchy* — **not** its dark theme (stayed light/monochrome per `ui-tokens`). Every section now has a 3-tier hierarchy: uppercase `text-text-muted` eyebrow → `text-base` heading → `text-sm text-text-secondary` intro → content. Whitespace increased (sections `py-20 md:py-28`, hero `pt-20 md:pt-32`, grids `gap-8`); the hero product mock is the focal "product shot". No new sections, no dark bands, no card-color changes. **Deviation:** whitespace exceeds `ui-rules.md` 24/32px spacing caps (pre-approved for the airy Antigravity feel). Verified: `tsc --noEmit` passes, page renders 200, **0 console errors**, a11y tree shows eyebrow→heading→intro on every section.
- **2026-07-12 (image holder) — hero visual now shows `img-1.png`:** The hero product-visual card (the former budget-dashboard mock) became a pure **image holder**: `rounded-[24px] overflow-hidden border border-border bg-surface` frame containing `next/image` of `/landing/img-1.png` (722×530, `priority`, `h-auto w-full`). Asset copied from `context/Design/img-1.png` → `public/landing/img-1.png`. Verified: `tsc --noEmit` passes, page + `/landing/img-1.png` both return 200 (212,634 bytes), **0 console errors**.
- **2026-07-13 — Phase 0 complete (`00` Route × Role × Precondition Matrix):** Built `docs/auth-matrix.md` (spec artifact) enumerating every route from `project-overview.md` Pages + `architecture.md` `app/api` routes + `actions/` Server Actions, with columns Route / Method / Role / Dept match? / State preconditions / RLS policy. Built `lib/auth-guard.ts` directly from the matrix: `requireRole(requiredRole, departmentId?, preconditionCheck?)` — resolves current `AuthUser` via `createInsforgeServer()` + `auth.getCurrentUser()` + `users`-table lookup, throws `AuthError` (401 unauthenticated / 403 forbidden_role / 403 forbidden_department), runs the caller-supplied `preconditionCheck`. Overloads give `AuthUser` for protected calls and `AuthUser | null` for `public`. Also created `lib/insforge-server.ts` (server client) and `types/index.ts` (Role / AuthUser / GuardContext / PreconditionCheck) as hard dependencies of the guard. `tsc --noEmit` passes. `requireRole` accepts `Role | Role[]` so dual-role surfaces (`/api/notifications/subscribe` = treasurer|adviser) work without a second call.

---

## Notes

*(Environment quirks, sandbox limitations, verification commands that passed/failed, and anything a future agent needs to know before touching this codebase again. Append, don't overwrite.)*

- **SDK import correction (flagged):** `architecture.md` imports the server client as `from "@insforge/ssr"`. The installed package is `@insforge/sdk@1.4.4` (per AGENTS.md), which exposes the server client at the subpath `@insforge/sdk/ssr` (`createServerClient`). There is no standalone `@insforge/ssr` package installed. `lib/insforge-server.ts` uses `@insforge/sdk/ssr`. Corrected import path only — API matches the architecture's intent. If a future session adds `@insforge/ssr` separately, this should be reconciled.
- `users`-table lookup in `getCurrentUser()` (auth-guard) requires the `users` table from Phase 1 / `02` to exist before runtime auth works. The guard compiles now and is structurally correct; it becomes live once schema + signup land.

---

## How to Update This File

After finishing a feature:

1. Check its box under **Progress**.
2. Update **Current Status** — `Last completed` becomes what you just finished, `Next` becomes the next unchecked item in build order, `Phase` updates if you crossed a phase boundary.
3. Add one bullet to **Decisions Made During Build** describing what was actually built (file paths, exact function/table names, any deviation from `build-plan.md` or `architecture.md` and why).
4. Add to **Notes** only if something environment/verification-related happened (build failures, sandbox network issues, lint warnings carried forward).
5. Never delete history from this file — it is append-only except for the **Current Status** and checkbox sections.
6. If a decision here ever contradicts `architecture.md`, the architecture doc wins — flag the conflict in **Notes** rather than silently resolving it.
