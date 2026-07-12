# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 0 — Authorization Foundation
**Last completed:** —  (build not yet started)
**Next:** 00 Route × Role × Precondition Matrix

---

## Progress

### Phase 0 — Authorization Foundation

- [ ] 00 Route × Role × Precondition Matrix

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

**Total: 0 / 30 features complete**

---

## Decisions Made During Build

- **2026-07-12 — Landing page UI (`app/page.tsx` + `components/landing/RoleCard.tsx`):** Built the public landing page per Phase 1 / `01` (Landing Navbar + Hero/How-It-Works/Footer). Narrow job = confirm the right visitor is in the right place, done via a role-identification grid (Treasurer / Adviser / Admin) using `<RoleCard>` (reused 3×, role-badge color map keyed off `--role-*` tokens). All styling uses `@theme` tokens only — no hardcoded hex, no raw Tailwind color classes. `tsc --noEmit` passes; page renders 200 with correct a11y tree. Note: the reference `context/Design/landing-page.png` could NOT be viewed (this model has no image input) — built from `ui-tokens.md`/`ui-rules.md` instead. `/login` and `/signup` links point to pages not yet built (Phase 1 auth shell remains). Did not check `01` fully since Login/Signup/OTP/Pending/Forgot are still pending.

---

## Notes

*(Environment quirks, sandbox limitations, verification commands that passed/failed, and anything a future agent needs to know before touching this codebase again. Append, don't overwrite.)*

---

## How to Update This File

After finishing a feature:

1. Check its box under **Progress**.
2. Update **Current Status** — `Last completed` becomes what you just finished, `Next` becomes the next unchecked item in build order, `Phase` updates if you crossed a phase boundary.
3. Add one bullet to **Decisions Made During Build** describing what was actually built (file paths, exact function/table names, any deviation from `build-plan.md` or `architecture.md` and why).
4. Add to **Notes** only if something environment/verification-related happened (build failures, sandbox network issues, lint warnings carried forward).
5. Never delete history from this file — it is append-only except for the **Current Status** and checkbox sections.
6. If a decision here ever contradicts `architecture.md`, the architecture doc wins — flag the conflict in **Notes** rather than silently resolving it.
