# Admin Departments Experience Redesign

**Date:** 2026-09-15
**Status:** Approved design
**Reference:** Figma file `werwziocGxW0hh7a4sWvhl`, node `69:1138`

## Goal

Redesign the admin departments experience into a premium, Apple-influenced interface while preserving Liquifi's Poppins typography, monochrome-first token system, semantic status colors, server-side authorization, and existing department mutations.

The work covers the admin departments index, department workspace, mobile admin navigation, department-member profile page, and all empty states used by these screens. Event and report content remains read-only for admins.

## Non-Goals

- No database schema changes.
- No new dependencies.
- No changes to event, report, entry, or account state machines.
- No editable member profile fields.
- No redesign of treasurer or adviser pages outside shared-component compatibility.
- No server-side audit pagination in this slice; filters remain limited to the newest 100 rows.

## Design Principles

- Use only utilities generated from `app/globals.css` `@theme` tokens; no hardcoded colors or raw Tailwind color classes.
- Prefer generous spacing, clear type scale, restrained rounded surfaces, and subtle CSS press/hover responses.
- Use color only for meaningful state.
- Avoid decorative permanent selection: the Figma inverse department card is treated as a transient pressed state, not an arbitrary first-card highlight.
- Reuse existing event, report, status, filter, view-toggle, sheet, and empty-state primitives before creating new UI.

## Admin Mobile Shell

- Replace the admin mobile bottom-navigation pattern with the established mobile drawer pattern used by treasurer/adviser.
- On `/admin/departments`, render a 64px top bar with menu trigger, department search, and an Approvals shortcut.
- Use `ClipboardCheck` for Approvals in the mobile top bar, drawer/sidebar navigation, and any approval shortcut touched by this redesign.
- Department search is URL-backed (`?search=1&q=`) so the top bar and departments client share one source of truth.
- On the department workspace root (`/admin/departments/[departmentId]`), hide the mobile top bar completely while keeping desktop sidebar navigation.
- Detail event/report routes retain their existing immersive behavior.

## Admin Departments Index

### Desktop

- Preserve the existing multi-column grid and creation flow.
- Strengthen the hierarchy: compact welcome context, prominent Departments heading/count, search, and primary New Department action.
- Remove the top-right active check from every department card.
- Each card receives a department/building icon tile and icon-led Adviser and Treasurer rows.
- Department state is presented near the code as compact semantic text/icon metadata, never as a corner check.
- Keep tokenized white cards with subtle border/shadow and restrained hover lift.

### Mobile

- Use a dedicated single-column card stack below `md`; never render two department columns on phones.
- Card order: department icon and name, code/state metadata, divider, adviser row, treasurer row, trailing chevron.
- Cards use large rounded tokenized surfaces and an inverse transient press state.
- Section header contains Departments, total count, status/staffing filters, and sort controls from the Figma hierarchy. Mobile remains single-column and does not offer a column-count view toggle.
- Keep the rounded-square floating Create Department action above the safe area.
- Remove the duplicate bottom-nav instance currently mounted by `DepartmentsListClient`.

### Empty States

- Zero departments: centered department/folder illustration built from Lucide icons, “No departments yet”, supporting copy, and Create Department CTA.
- Filter/search produces zero matches: “No matching departments”, query-aware supporting copy, and Clear Search action.
- Creation errors stay inside the existing modal/sheet and never replace the page empty state.

## Department Workspace

- Start the page with at least 24px top spacing when the mobile top bar is hidden.
- Render an in-page back button and compact department identity header: icon tile, name, code, and active/inactive state.
- Tabs are ordered Events, Reports, Users, Audit Logs; Events is always the initial tab on a fresh visit.
- Tabs use accessible tab roles, keyboard behavior, an underline active state, counts where the existing arrays make them reliable, and a subtle content crossfade.

### Events Tab

- Match the treasurer home information hierarchy using existing event primitives: search, filters, grid/list controls, active events, archived grouping, and current event cards/rows.
- Admin detail links resolve under `/admin/departments/[departmentId]/events/[eventId]`.
- Mutating controls remain omitted, not disabled.

### Reports Tab

- Match the adviser reports hierarchy using the shared report overview pattern.
- Only events with a latest non-cancelled report are included; events without reports never appear.
- Preserve All, Pending, Approved, and Rejected filtering and archived grouping.
- Admin detail links resolve under `/admin/departments/[departmentId]/reports/[eventId]`.
- Report detail remains read-only while View, Download, and approved-report Print remain available.

### Users Tab

- Replace the current table/mobile split with responsive account cards: one column on mobile and a restrained multi-column layout on wider screens.
- Each card shows initials, full name, email, role icon, account-status icon/text, and chevron.
- The whole card links to `/admin/departments/[departmentId]/users/[userId]`.
- Inline activate/deactivate controls are removed from the list to keep navigation and mutation intent separate.

### Audit Logs Tab

- Preserve actor/category/date filters and expandable metadata.
- Restyle desktop and mobile as consistent activity rows with semantic action icon tiles, stronger action/actor/date hierarchy, and tokenized expanded detail surfaces.
- Clearly retain the newest-100 limitation in implementation documentation; this redesign does not imply complete historical pagination.

## Department Member Profile

- Add `/admin/departments/[departmentId]/users/[userId]` as an admin-only Server Component route.
- Verify the requested member belongs to the department in the URL; otherwise return not found.
- Show an in-page back control, initials/avatar surface, full name, email, role, department, account status, and existing available account metadata.
- Active accounts expose Deactivate; deactivated accounts expose Reactivate. Pending/rejected accounts expose no mutation.
- Reuse `setUserAccountStatus`, but strengthen it to verify the target user's actual department before updating or writing the audit record.
- Failed mutations remain on the page with human-readable feedback; successful mutations refresh the profile and department workspace.

## Data and Component Boundaries

- `app/admin/departments/page.tsx` remains the server data owner for the index.
- `DepartmentsListClient` owns local creation state and responsive presentation; URL search is read from navigation state.
- `app/admin/departments/[departmentId]/page.tsx` remains the server data owner for workspace tabs.
- Extend existing shared event/report overview contracts with explicit base paths/read-only admin support instead of duplicating their logic.
- Add a dedicated admin member profile presentation component rather than bending the authenticated-user-only `ProfileView` contract.
- Keep all database reads in Server Components and mutations in existing Server Actions.

## Error and Empty Handling

- Database-query failure must not masquerade as a confirmed empty state when an error is available; render a restrained retry/error surface.
- Empty collections use `EmptyState` with context-specific copy.
- Account action errors remain scoped to the member profile action region.
- Creation failures preserve entered department name/code.

## Accessibility and Motion

- All icon-only controls require accessible labels and visible focus states.
- Cards used as links must be keyboard reachable and expose one unambiguous navigation target.
- Tabs use `role=tablist`, `role=tab`, `aria-selected`, and associated panels.
- Motion uses existing CSS/Framer patterns only: 180–250ms card feedback, 8–12px entrance movement, and reduced-motion support.
- No fixed-position element may be placed inside a transformed `FadeIn` ancestor.

## Verification

- Desktop review at 1440px: enhanced grid, removed card checks, search/create flow, navigation, and no regressions.
- Mobile review at 390px and 768px boundary: single-column departments, top bar/menu/search/Approvals, floating create action, and no duplicate navigation.
- Verify zero-department and no-search-result states.
- Verify department root hides the mobile top bar, starts with at least 24px spacing, and defaults to Events.
- Verify Events and Reports match shared role patterns while remaining read-only and excluding no-report events.
- Verify each user card opens the correct member profile and active/deactivated transitions remain department-safe.
- Run scoped ESLint, `npx tsc --noEmit`, `git diff --check`, production build, browser console/network checks, and relevant Playwright flows.
