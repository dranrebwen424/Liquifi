# Memory — Liquifi Status Review

Last updated: 2026-07-14

## What was built

**This session was a read-only status review** — we read `AGENTS.md` and all `context/*.md` files and reported what's done. No new code was written this session.

**Cumulative project state (2 of 30 build-plan features complete):**

- **Phase 0 — Authorization Foundation (DONE)**
  - `docs/auth-matrix.md` — full Route × Role × Precondition Matrix (spec artifact driving RLS + auth-guard)
  - `lib/auth-guard.ts` — `requireRole(requiredRole, departmentId?, preconditionCheck?)`; throws `AuthError` (401/403 variants); accepts `Role | Role[]` for dual-role surfaces
  - `lib/insforge-server.ts` — InsForge server client (`createServerClient`, reads cookies async)
  - `types/index.ts` — Role, AuthUser, GuardContext, PreconditionCheck

- **Phase 1 / 01 Landing + Auth Shell (DONE — UI only, no InsForge wiring)**
  - `app/page.tsx` — landing page (navbar/hero+product-screenshot/features×3/how-it-works×3/final CTA/footer; Antigravity-style whitespace `py-20 md:py-28`; token-only styling)
  - `public/landing/img-1.png` — product screenshot asset
  - `components/auth/AuthShell.tsx`, `AuthCard.tsx`, `AuthInput.tsx`, `AuthButton.tsx`, `AuthLink.tsx`
  - `app/(auth)/login/page.tsx`, `signup/page.tsx`, `otp/page.tsx`, `pending-approval/page.tsx`, `forgot-password/page.tsx` — all use `useState` mock submit handlers, no real backend calls
  - `app/globals.css` — full `@theme` token set + `--shadow-card` token added

## Decisions made (locked)

- Landing page went through 4 redesigns; final form: Figma structure only (Montserrat→Poppins override), `RoleCard` component deleted, every section is a white card (no colored bands)
- InsForge SDK import path corrected: `architecture.md` references `@insforge/ssr`, but installed package is `@insforge/sdk@1.4.4` exposing the server client at `@insforge/sdk/ssr`. `lib/insforge-server.ts` uses `@insforge/sdk/ssr` (matches architecture intent, corrected path)
- Auth guard compiles now but needs the `users` table to exist at runtime — becomes live only after Phase 1 / 02 schema lands

## Problems solved

- Confirmed the full feature inventory from `context/progress-tracker.md`: 1/30 features complete (Phase 0 + Phase 1/01). Next is **02 Database Schema**.

## Current state

- Working Next.js app: `tsc --noEmit` passes; `next build` succeeds (6 routes); landing + auth pages render 200 with 0 console errors
- Auth UI is mock-only — signup/login/OTP do NOT yet talk to InsForge
- No InsForge tables, RLS policies, storage buckets, or realtime channels exist yet
- Role checks are not yet enforced at runtime (guard wired but `users` table missing)

## Next session starts with

**Phase 1 / 02 Database Schema.** Create all InsForge tables per `architecture.md` schema section: `departments`, `users`, `events`, `entries`, `reports`, `report_signatories`, `entry_comments`, `department_report_counters`, `notifications`, `push_subscriptions`, `audit_logs` — plus partial unique indexes on `users`, storage bucket `departments` with the `storage/departments/{id}/events/{id}/...` layout, department-scoped RLS policies, and realtime channel scoping. Then continue 03 (auth wiring) and 04 (login/session/redirect).

## Open questions / conflicts to resolve

- ~~**Tailwind version conflict:** resolved 2026-07-14 — confirmed use Tailwind v4. Updated `AGENTS.md` line 588 from "Use Tailwind CSS 3.4 (do not upgrade to v4)" to "Use Tailwind CSS v4... `@theme` directive — no `tailwind.config.ts`", matching `package.json` (`^4.1.6`), `globals.css`, and all other context docs. No conflict remains.
- `app/(auth)/signup` uses a hardcoded mock `DEPARTMENTS` constant — replace with real department list once `departments` table exists (Phase 1 / 02+).
- `.env.local` exists but real InsForge credentials/keys were not verified this session — confirm backend URL + anon key are valid before Phase 1 / 03 auth wiring.
