# Reports Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Treasurer and Adviser report indexes from Figma with role-aware featured sections, filtering, and a Treasurer-only rejection callout.

**Architecture:** Server pages keep authenticated, department-scoped fetching. A shared client component receives serializable report/event rows and owns only filter state; pure helpers own role/status grouping and receive a runnable assertion check.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 tokens, lottie-web through the existing `LottiePlayer`, Lucide icons.

## Global Constraints

- Preserve server-side role and department checks.
- Use existing `@theme` utilities only; no new colors or dependencies.
- Treasurer alone sees Action Required, and only when the newest report is rejected.
- Treasurer featured section is approved open events; Adviser featured section is pending reports.
- Filter tabs use native CSS sticky positioning.

---

### Task 1: Pure report grouping

**Files:** Create `lib/report-overview.ts`; create `scripts/check-report-overview.ts`.

- [ ] Write assertions for role-aware featured/action groups and status filters.
- [ ] Run `npx tsx scripts/check-report-overview.ts` and confirm it fails because the helper is absent.
- [ ] Implement the minimal typed grouping helpers.
- [ ] Re-run the assertion script and confirm it passes.

### Task 2: Shared responsive page UI

**Files:** Create `components/reports/ReportsOverview.tsx`; modify `app/treasurer/reports/page.tsx`; modify `app/adviser/reports/page.tsx`.

- [ ] Build the Figma-derived hierarchy: conditional action card, featured folder grid, sticky filter tabs, active report rows, archive rows.
- [ ] Reuse `FolderCard`, `LottiePlayer`, semantic tokens, and existing report detail routes.
- [ ] Keep server pages responsible for auth and data mapping only.

### Task 3: Documentation and verification

**Files:** Modify `context/ui-registry.md`; modify `context/progress-tracker.md`.

- [ ] Record the new shared component and role behavior without replacing existing history.
- [ ] Run the report helper check, scoped ESLint, `tsc --noEmit`, and `next build`.
- [ ] Verify Treasurer and Adviser mobile/desktop rendering in the browser when credentials permit.
