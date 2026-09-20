# Admin Department Detail Figma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Figma node `229:459` for the admin department workspace on mobile, add a treasurer-style All Events route, and keep desktop tabs directly below the department card.

**Architecture:** Keep the Server Component data owner unchanged. Add one admin-only responsive Events tab component: Figma-specific markup below `md`, existing `EventBrowser` at `md+`. `DepartmentDetailClient` retains tab state/accessibility and renders mobile fixed workspace navigation versus desktop in-flow tabs. The new All Events Server Component reuses `ActiveEventsClient`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4 theme tokens, lucide-react, existing lottie-web `LottiePlayer`.

## Global Constraints

- No schema, mutation, authorization, or state-machine changes.
- No new dependency.
- Use only project theme tokens; no raw Tailwind colors or component hex values.
- Preserve adviser and treasurer behavior.
- Track the user-provided `public/Loudspeaker.json`; do not stage unrelated untracked files.

---

### Task 1: Department event presentation logic

**Files:**
- Create: `lib/admin-department-detail.ts`
- Create: `scripts/check-admin-department-detail.ts`

**Interfaces:**
- Produces: `getDepartmentEventSections(events, query, archiveSort)` returning `{ activeEvents, recentActiveEvents, archivedEvents }`.
- Consumes: event objects with `status`, `name`, and `created_at`.

- [ ] Write assertions proving open/archive separation, newest-first active ordering, four-item root preview, case-insensitive search, and archive sort.
- [ ] Run `npx tsx scripts/check-admin-department-detail.ts`; expect failure before the helper exists.
- [ ] Implement the pure helper with no React or browser dependency.
- [ ] Re-run the script; expect `admin department detail check: all assertions passed`.

### Task 2: Responsive Events tab and reusable archive density

**Files:**
- Create: `components/admin/DepartmentEventsTab.tsx`
- Modify: `components/events/ArchiveEventRow.tsx`

**Interfaces:**
- `DepartmentEventsTab({ events, departmentId })` renders the mobile Figma hierarchy and the existing desktop `EventBrowser`.
- `ArchiveEventRow` gains optional `compact?: boolean`; its default output remains unchanged.

- [ ] Build the mobile Search Events input, Active Events count/View all, four-folder preview, Archive Events count/native sort selector, archive rows, and empty states.
- [ ] Link View all to `/admin/departments/${departmentId}/events` and individual cards to the existing admin event detail paths.
- [ ] Render the untouched full `EventBrowser` from `md` upward.
- [ ] Run scoped ESLint and the helper check.

### Task 3: Department workspace shell

**Files:**
- Modify: `components/admin/DepartmentDetailClient.tsx`
- Track: `public/Loudspeaker.json`

**Interfaces:**
- Consumes `DepartmentEventsTab`, existing Reports/Users/Audit components, and `LottiePlayer`.
- Preserves the existing `Props` contract from the Server Component page.

- [ ] Replace the mobile header with the centered Figma back/title row.
- [ ] Replace the identity surface with the inverse department card and `/Loudspeaker.json` animation.
- [ ] Keep the keyboard-accessible desktop tablist immediately below the card.
- [ ] Add the fixed mobile four-tab workspace navigation with accessible names and content bottom clearance.
- [ ] Render `DepartmentEventsTab` for Events and preserve the other three panels unchanged.
- [ ] Run scoped ESLint, TypeScript, and the helper check.

### Task 4: Admin All Events route

**Files:**
- Create: `app/admin/departments/[departmentId]/events/page.tsx`

**Interfaces:**
- Consumes `getDepartmentEvents(departmentId)` and `ActiveEventsClient`.
- Sets `basePath=/admin/departments/${departmentId}/events` and `homePath=/admin/departments/${departmentId}`.

- [ ] Implement async `params`, department existence validation, and admin-unrestricted department read.
- [ ] Render the shared All Events client with admin detail links and department-root back navigation.
- [ ] Confirm no workspace bottom navigation is mounted on this route.
- [ ] Run route checks, TypeScript, and production build.

### Task 5: Documentation and responsive verification

**Files:**
- Modify: `context/ui-registry.md`
- Modify: `context/progress-tracker.md`

- [ ] Record the Figma node, inverse card/Lottie pattern, mobile workspace nav, responsive Events split, and All Events route.
- [ ] Verify 390px: header/card/search/four folders/archive rows/fixed nav; switch all four tabs; View all route hides the workspace nav; back returns correctly.
- [ ] Verify 1440px: card followed immediately by accessible tabs; existing content remains usable.
- [ ] Check browser console, run scoped ESLint, `npx tsc --noEmit`, `npm run build`, `npx tsx scripts/check-admin-department-detail.ts`, and `npx tsx scripts/check-admin-routes.ts`.
- [ ] Inspect `git diff --check` and stage only intended files.
