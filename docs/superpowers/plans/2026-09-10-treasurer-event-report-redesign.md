# Treasurer Event Report Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the treasurer event-report detail into a focused, state-aware action workspace with secondary information collapsed.

**Architecture:** Keep the page as a Server Component and preserve existing queries, guards, and mutation components. Add one pure state helper for deterministic report-state presentation, then recompose only the treasurer page around existing report primitives and native `<details>` disclosures.

**Tech Stack:** Next.js 16 App Router, React 19 Server/Client Components, TypeScript, Tailwind CSS v4 tokens, Lucide, native HTML disclosures.

## Global Constraints

- Treasurer report detail only; adviser/admin pages and backend behavior remain unchanged.
- Use existing `@theme` token utilities only; no raw Tailwind colors or hardcoded hex values.
- Preserve report state machines, PDF URLs, generation, cancellation, localStorage signatory reuse, and department guards.
- Keep `ReportFileCard` and `ReportViewer` unchanged.
- Do not add dependencies or commit unless the user explicitly requests it.

---

### Task 1: Report workspace state model

**Files:**
- Create: `lib/report-workspace.ts`
- Create: `scripts/check-report-workspace.ts`

**Interfaces:**
- Produces: `getReportWorkspaceState(eventStatus, reportStatus)` returning `{ state, step }`.
- Consumes: existing `EventStatus` and `ReportStatus` unions from `@/types`.

- [ ] **Step 1: Write the state check**

Cover no-report, rejected, cancelled, pending, approved-open, and archived inputs with `node:assert`.

- [ ] **Step 2: Run the check and confirm it fails**

Run: `npx tsx scripts/check-report-workspace.ts`
Expected: module-not-found failure for `lib/report-workspace.ts`.
- [ ] **Step 3: Implement the minimal helper**

```ts
export type ReportWorkspaceState = "empty" | "rejected" | "cancelled" | "pending" | "approved" | "archived";

export function getReportWorkspaceState(eventStatus: EventStatus, reportStatus: ReportStatus | null) {
  if (eventStatus === "archived") return { state: "archived", step: 3 } as const;
  if (reportStatus === "pending_adviser_approval") return { state: "pending", step: 2 } as const;
  if (reportStatus === "approved") return { state: "approved", step: 3 } as const;
  if (reportStatus === "rejected") return { state: "rejected", step: 1 } as const;
  if (reportStatus === "cancelled") return { state: "cancelled", step: 1 } as const;
  return { state: "empty", step: 1 } as const;
}
```

- [ ] **Step 4: Run the check and confirm all assertions pass**

Run: `npx tsx scripts/check-report-workspace.ts`
Expected: `report workspace check: all assertions passed`.

### Task 2: Recompose the treasurer report page

**Files:**
- Modify: `app/treasurer/reports/[eventId]/page.tsx`

**Interfaces:**
- Consumes: `getReportWorkspaceState`, existing event/report query results, `ReportGenerationFlow`, `ReportViewer`, and `ReportFileCard`.
- Produces: the selected guided-action layout without changing route data or actions.

- [ ] **Step 1: Replace the two-column dashboard with one centered column**

Use a compact header, labeled three-step progress row, dark state-aware workspace, latest-report section, and two native disclosure sections.

- [ ] **Step 2: Render exact state-specific guidance**

Use the approved copy from `docs/superpowers/specs/2026-09-10-treasurer-event-report-redesign.md`; render `ReportGenerationFlow` only for empty/rejected/cancelled states and preserve `ReportViewer` for any latest report.

- [ ] **Step 3: Collapse spending and history**

Move the existing spending map into `<details><summary>Spending summary</summary>…</details>` and previous reports into a second disclosure. Keep `formatPHP()` and immutable report history unchanged.
- [ ] **Step 4: Verify the page compiles**

Run: `npx tsc --noEmit`
Expected: exit code 0.

### Task 3: Polish the generation workspace and verify

**Files:**
- Modify: `components/reports/ReportGenerationFlow.tsx`
- Modify: `components/reports/SignatorySetup.tsx`
- Modify: `context/ui-registry.md`
- Modify: `context/progress-tracker.md`

**Interfaces:**
- Preserve `ReportGenerationFlowProps`, `SignatorySetupProps`, and all existing callbacks unchanged.

- [ ] **Step 1: Restyle generation content for the dark workspace**

Use inverse text, tokenized translucent borders/surfaces, compact signatory rows, and a white primary Generate action. Preserve setup → generating → preview behavior and human-readable errors.

- [ ] **Step 2: Run focused static checks**

Run: `npx eslint "app/treasurer/reports/[eventId]/page.tsx" components/reports/ReportGenerationFlow.tsx components/reports/SignatorySetup.tsx lib/report-workspace.ts scripts/check-report-workspace.ts`
Expected: exit code 0 with no new errors.

Run: `npx tsc --noEmit`
Expected: exit code 0.

- [ ] **Step 3: Browser-verify responsive behavior**

Check desktop and mobile widths. Confirm the action workspace dominates, View Event remains reachable, disclosures open by keyboard/click, PDF View/Download remain functional, and no console errors appear.

- [ ] **Step 4: Record the completed UI pattern**

Add the new treasurer event-report workspace hierarchy and exact component responsibilities to `context/ui-registry.md`; add a dated completion entry to `context/progress-tracker.md`.

## Self-review

- Spec coverage: all approved hierarchy, state, responsive, accessibility, data, and verification requirements map to Tasks 1–3.
- Placeholder scan: no deferred implementation or unspecified behavior remains.
- Type consistency: the helper accepts existing status unions; existing component props remain unchanged.
