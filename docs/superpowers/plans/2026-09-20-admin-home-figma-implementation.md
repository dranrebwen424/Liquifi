# Admin Home Figma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/admin/departments` from Figma node `69:1138` and add a direction-aware top bar that hides on downward scroll and returns on upward scroll.

**Architecture:** Keep `app/admin/departments/page.tsx` as the server data boundary and preserve existing department/create/search behavior in `DepartmentsListClient`. Restyle the existing client components, share one small scroll-direction hook between the mobile and desktop top bars, and keep the desktop sidebar from PR #5.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 project tokens, Lucide, existing Framer Motion.

## Global Constraints

- Use only existing `@theme` utilities; no raw Tailwind colors or hardcoded hex values.
- Preserve server-side admin authorization and all existing department mutations.
- Preserve the desktop sidebar; mobile navigation maps Profile to the avatar and Approvals to the trailing icon.
- Animate only `transform`, use a passive scroll listener throttled by `requestAnimationFrame`, and honor `prefers-reduced-motion` through `motion-reduce:transition-none`.
- Add no dependencies.

---

### Task 1: Direction-aware top-bar behavior

**Files:**
- Create: `lib/top-bar-scroll.ts`
- Create: `hooks/useAutoHideTopBar.ts`
- Create: `scripts/check-top-bar-scroll.ts`

**Interfaces:**
- Produces: `resolveTopBarScroll(anchorY: number, currentY: number): { anchorY: number; visible: boolean | null }`
- Produces: `useAutoHideTopBar(): boolean`

- [ ] **Step 1: Add failing scroll-policy assertions**

```ts
import assert from "node:assert/strict";
import { resolveTopBarScroll } from "../lib/top-bar-scroll";

assert.deepEqual(resolveTopBarScroll(0, 4), { anchorY: 4, visible: true });
assert.deepEqual(resolveTopBarScroll(20, 25), { anchorY: 20, visible: null });
assert.deepEqual(resolveTopBarScroll(20, 40), { anchorY: 40, visible: false });
assert.deepEqual(resolveTopBarScroll(40, 24), { anchorY: 24, visible: true });
console.log("top bar scroll check: all assertions passed");
```

- [ ] **Step 2: Run the check and confirm the missing-module failure**

Run: `npx tsx scripts/check-top-bar-scroll.ts`

- [ ] **Step 3: Implement the pure policy and browser hook**

The policy keeps the bar visible within 16px of the top, ignores movement under 8px, hides after meaningful downward movement, and shows after meaningful upward movement. The hook owns one passive `scroll` listener, throttles work with `requestAnimationFrame`, and cancels the frame during cleanup.

- [ ] **Step 4: Run the check**

Run: `npx tsx scripts/check-top-bar-scroll.ts`
Expected: `top bar scroll check: all assertions passed`

### Task 2: Figma top bar

**Files:**
- Modify: `app/admin/layout.tsx`
- Modify: `components/admin/AdminTopBar.tsx`
- Modify: `components/admin/AdminMobileTopBar.tsx`

**Interfaces:**
- `AdminTopBar({ pendingApprovalsCount, adminInitial })`
- `AdminMobileTopBar({ pendingApprovalsCount, adminInitial })`

- [ ] **Step 1: Derive the avatar initial in the server layout**

Capture the existing `requireLayoutRole("admin")` result and derive `user.email.slice(0, 1).toUpperCase() || "A"`; pass it to both top bars.

- [ ] **Step 2: Match the Figma hierarchy**

Both bars render an accessible 44px profile/avatar target, a rounded department-search control, and an accessible `UserRoundCheck` approvals target. Mobile removes the drawer/menu because the Figma's three controls map directly to Profile, Departments search, and Approvals; the search-active branch remains a focused input with Back.

- [ ] **Step 3: Apply auto-hide motion**

Use `useAutoHideTopBar()` and conditionally apply `translate-y-0` / `-translate-y-full` with `transition-transform duration-200 motion-reduce:transition-none`. Keep search-active mode visible so a focused input never disappears.

### Task 3: Figma page and department cards

**Files:**
- Modify: `components/admin/DepartmentsListClient.tsx`
- Modify: `components/admin/DepartmentCard.tsx`

**Interfaces:**
- Preserve `DepartmentsListClient({ initialDepartments, loadError })`
- Preserve `DepartmentCard({ department })`

- [ ] **Step 1: Rebuild the page hierarchy**

Center `WELCOME BACK!`, then render a left-aligned `Departments` heading and `Total of N Departments`. On mobile use a one-column stack with Figma-scale gutters and 12px gaps; on desktop retain a responsive grid beside the existing sidebar.

- [ ] **Step 2: Rebuild the card**

Render code above a bold department name, a circular `ChevronRight` target at top-right, then `Treasurer:` and `Adviser:` rows with names emphasized. Use project surface/border/text tokens and the registered card shadow; preserve the entire card as the route link.

- [ ] **Step 3: Match the floating add action**

Keep the existing create sheet/modal logic, but restyle the mobile FAB to the Figma's 64px dark rounded-square treatment. Keep a normal-flow desktop `New Department` action so the page remains operable without a fixed desktop control.

### Task 4: Documentation and verification

**Files:**
- Modify: `context/ui-registry.md`
- Modify: `context/progress-tracker.md`

- [ ] **Step 1: Record the Figma page and top-bar pattern**

Document node `69:1138`, responsive adaptation, card hierarchy, avatar/approvals mapping, and scroll-direction behavior.

- [ ] **Step 2: Run static verification**

Run:

```powershell
npx tsx scripts/check-top-bar-scroll.ts
npx tsx scripts/check-admin-departments.ts
npx eslint app/admin/layout.tsx components/admin/AdminTopBar.tsx components/admin/AdminMobileTopBar.tsx components/admin/DepartmentsListClient.tsx components/admin/DepartmentCard.tsx hooks/useAutoHideTopBar.ts lib/top-bar-scroll.ts scripts/check-top-bar-scroll.ts
npx tsc --noEmit
npm run build
```

Expected: all commands exit successfully.

- [ ] **Step 3: Browser verification**

At 390px and 1440px, verify the Figma hierarchy, search, department links, create action, and no horizontal overflow. Scroll down to confirm the bar exits upward; scroll up to confirm it returns; emulate reduced motion and confirm the transition is disabled. Check the console for errors.
