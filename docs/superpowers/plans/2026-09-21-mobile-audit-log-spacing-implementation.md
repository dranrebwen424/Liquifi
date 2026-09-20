# Mobile Audit Log Spacing Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the department Audit Logs tab a collapsible icon-only mobile filter and more readable audit cards while preserving desktop behavior.

**Architecture:** Keep all filtering and expansion state inside the existing `DepartmentAuditTab`. Use one responsive filter container: collapsed below `md`, always visible from `md` upward. Restructure each audit record into one responsive card so mobile metadata and expanded details have room without changing audit data or mapping.

**Tech Stack:** React 19, Next.js 16 App Router, TypeScript, Tailwind CSS v4 theme tokens, lucide-react, Node assert checks.

## Global Constraints

- No query, schema, authorization, audit mapping, or filter-logic changes.
- No new dependency or component abstraction.
- Use existing project tokens and native controls only.
- Preserve empty and no-match states.
- Keep desktop filters always visible and preserve desktop information hierarchy.

---

### Task 1: Responsive Audit Filters and Cards

**Files:**
- Create: `scripts/check-admin-audit-mobile.ts`
- Modify: `components/admin/DepartmentAuditTab.tsx`

**Interfaces:**
- Consumes: existing `logs: DepartmentAuditLog[]`, `actors: DepartmentAuditActor[]`, and `auditLogView()` output.
- Produces: the same `DepartmentAuditTab` props contract and filtering results; adds only mobile presentation state `filtersOpen: boolean`.

- [ ] **Step 1: Write the failing structural check**

Create `scripts/check-admin-audit-mobile.ts`:

```ts
import assert from "node:assert";
import { readFileSync } from "node:fs";

const source = readFileSync("components/admin/DepartmentAuditTab.tsx", "utf8");

assert.match(source, /const \[filtersOpen, setFiltersOpen\] = useState\(false\)/);
assert.match(source, /aria-label="Filter audit logs"/);
assert.match(source, /aria-expanded=\{filtersOpen\}/);
assert.match(source, /id="audit-mobile-filters"/);
assert.match(source, /Audit activity/);
assert.match(source, /hidden md:flex/);
assert.match(source, /md:hidden/);

console.log("admin audit mobile check: all assertions passed");
```

- [ ] **Step 2: Run the check and verify RED**

Run: `npx tsx scripts/check-admin-audit-mobile.ts`

Expected: FAIL because `filtersOpen` and the mobile filter control do not exist.

- [ ] **Step 3: Implement the mobile filter header and responsive filter panel**

In `components/admin/DepartmentAuditTab.tsx`:

- Import `ListFilter` from `lucide-react`.
- Add `const [filtersOpen, setFiltersOpen] = useState(false);` beside the existing filter state.
- Change the root spacing to `gap-6 md:gap-4`.
- Add a `md:hidden` header with `Audit activity`, a muted total-log subtitle, and a 44px icon-only button using:
  - `aria-label="Filter audit logs"`
  - `aria-expanded={filtersOpen}`
  - `aria-controls="audit-mobile-filters"`
  - tokenized active/inactive colors
  - a small accent indicator when `hasActiveFilters` is true.
- Give the existing filter container `id="audit-mobile-filters"` and responsive classes equivalent to:

```tsx
className={cn(
  "flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-card md:flex-row md:flex-wrap md:items-end md:gap-3 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none",
  filtersOpen ? "flex" : "hidden md:flex",
)}
```

- Keep the same four native controls and values. Use `gap-2` and `min-h-11 rounded-xl` below `md`, then restore the current desktop radii/sizing with `md:` classes.
- Make Clear full-width and centered on mobile; preserve the current compact desktop button.

- [ ] **Step 4: Add breathing room to mobile audit cards**

- Use `gap-3 md:gap-2` between records.
- Use a responsive card shell: `rounded-2xl p-4 md:rounded-xl`, with the current tokenized border, surface, shadow, hover, and press behavior.
- Increase the mobile tone tile to 40px while retaining the current 36px desktop tile.
- Keep the action label at 14px/600.
- Render actor and role together without mobile truncation; render the timestamp on its own muted line below. At `md`, return to the current inline actor/role/date line.
- Give the detail toggle a 44px mobile hit target and preserve `aria-expanded`/accessible labels.
- When expanded, render summary and definition-list details beneath `mt-4 border-t border-border pt-4` inside the card. Use responsive classes to retain the current compact desktop density.

- [ ] **Step 5: Run the check and verify GREEN**

Run: `npx tsx scripts/check-admin-audit-mobile.ts`

Expected: `admin audit mobile check: all assertions passed`.

- [ ] **Step 6: Run static verification**

Run:

```powershell
npx eslint "components/admin/DepartmentAuditTab.tsx" "scripts/check-admin-audit-mobile.ts"
npx tsc --noEmit
```

Expected: both commands exit 0 with no errors.

### Task 2: Documentation and Responsive Verification

**Files:**
- Modify: `context/ui-registry.md`
- Modify: `context/progress-tracker.md`

**Interfaces:**
- Consumes: the completed responsive `DepartmentAuditTab`.
- Produces: durable project guidance describing the collapsed mobile filter and spacious card anatomy.

- [ ] **Step 1: Update durable UI documentation**

- Update the `DepartmentAuditTab` registry entry with the mobile `Audit activity` header, icon-only collapsed filter, active indicator, separate metadata lines, larger spacing, and in-card details.
- Add the completed refresh to the top of `context/progress-tracker.md`, explicitly noting that desktop filtering and all audit logic remain unchanged.

- [ ] **Step 2: Verify mobile behavior at 390×844**

Using the existing preview route with temporary mock audit data, confirm:

- filters are closed initially;
- the icon button opens and closes the panel;
- `aria-expanded` tracks state;
- Actor, Category, From date, and To date remain functional;
- active filters show an indicator, result count, and Clear action;
- actor/role and timestamp are readable on separate lines;
- expanded details remain inside the card;
- the last card clears the fixed bottom navigation;
- browser console has zero errors or warnings.

Restore the preview route before committing.

- [ ] **Step 3: Verify desktop behavior at 1440×1000**

Confirm the horizontal filter row is always visible, audit rows retain the existing desktop density, expansion remains keyboard accessible, and the console stays clean.

- [ ] **Step 4: Run final verification**

Run:

```powershell
npx tsx scripts/check-admin-audit-mobile.ts
npx eslint "components/admin/DepartmentAuditTab.tsx" "scripts/check-admin-audit-mobile.ts"
npx tsc --noEmit
npm run build
git diff --check
```

Expected: structural assertions pass; ESLint, TypeScript, and production build exit 0; diff check reports no whitespace errors.

- [ ] **Step 5: Commit only intended files**

```powershell
git add -- "components/admin/DepartmentAuditTab.tsx" "scripts/check-admin-audit-mobile.ts" "context/ui-registry.md" "context/progress-tracker.md"
git commit -m "Improve mobile audit log spacing"
```

Do not stage `artifacts/`, `figma/`, or `context/Design/liquifi_erd_darktext (1).html`.
