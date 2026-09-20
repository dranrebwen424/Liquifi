# Mobile Audit Log Spacing Refresh

**Date:** 2026-09-21
**Status:** Approved design
**Scope:** `components/admin/DepartmentAuditTab.tsx`

## Goal

Give the department Audit Logs tab more breathing room on mobile without changing its data, filtering behavior, desktop layout, or audit-detail content.

## Mobile Design

- Add an `Audit activity` section header above the log list.
- Place one icon-only filter button in the header. It has an accessible label, visible focus state, and `aria-expanded` state.
- Keep filters collapsed by default. Tapping the button reveals a spacious tokenized panel containing Actor, Category, From date, and To date controls.
- When any filter is active, show an accent indicator on the filter control and a compact result-count row with a Clear action.
- Increase vertical space between audit cards and slightly increase card padding.
- Keep the tone icon, action label, actor, role, timestamp, and expansion affordance, but place actor/role and timestamp on separate lines so neither is cramped or prematurely truncated.
- Render expanded summary/details inside the same card beneath a divider instead of as a separate indented card.
- Preserve bottom padding so the fixed department navigation never covers the final record.

## Desktop

- Keep the current always-visible horizontal filter row and card density from `md` upward.
- Do not change desktop interactions or information hierarchy.

## Boundaries

- No query, schema, authorization, audit mapping, or filter-logic changes.
- No new dependency or component abstraction.
- Use existing project tokens and native controls only.
- Preserve empty and no-match states.

## Verification

- Verify the mobile filter opens/closes, reports `aria-expanded`, indicates active filters, clears all filters, and leaves cards readable at 390px.
- Verify card expansion remains keyboard accessible and details stay within the card.
- Verify the desktop filter row and audit cards remain unchanged at 1440px.
- Run scoped ESLint, TypeScript, production build, browser console checks, and `git diff --check`.
