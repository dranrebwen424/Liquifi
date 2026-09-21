# Admin Department Users Role Sections

## Goal

Make the department Users tab easier to scan by separating Treasurers and Advisers, surfacing the active account first, and replacing unexplained icon-only metadata with readable member information. Each role gets a dedicated full-list page.

## Users Tab

- When the Users tab is active, render a `Search users` field directly below the department identity card.
- Search matches first name, last name, full name, and email, case-insensitively.
- With an empty query, render two sections in this order: **Treasurers**, then **Advisers**.
- Each section shows its role title, total user count, and a right-aligned `View all` link with a chevron.
- Each section renders at most three users.
- Sort each role with `active` accounts first, then by `created_at` newest-first.
- A role with no users keeps its section header and renders a compact empty message.

## Search Mode

- As soon as the normalized query is non-empty, hide both role section headers, totals, and `View all` links.
- Render one combined list containing all matching Treasurers and Advisers; do not limit search results to three.
- Keep the same ordering rule: active accounts first, then newest-first.
- Cards retain a visible role label so mixed-role results remain understandable.
- If nothing matches, show the existing clean empty-state pattern with a search-specific message.
- Clearing the query restores the two role sections.

## Member Card

- The whole card links to the existing member profile route.
- Card anatomy: initials tile, full name, email, visible role label, visible account-status label, and trailing chevron.
- Status text uses human-readable labels: `Active`, `Pending approval`, `Deactivated`, and `Rejected`.
- Semantic status colors continue to use existing theme tokens; cards remain white with the standard border and shadow.
- Do not rely on icon-only status or role badges. Any retained icon is decorative and accompanies text.
- Preserve keyboard focus, hover, and active states.

## Role List Pages

- `View all` routes:
  - `/admin/departments/[departmentId]/users/treasurers`
  - `/admin/departments/[departmentId]/users/advisers`
- Static role route segments coexist with the existing `/users/[userId]` member-profile route.
- The page begins with 24px top spacing and a back link/title: `← Treasurers` or `← Advisers`.
- Back returns to `/admin/departments/[departmentId]?tab=users`, and the department workspace uses that query value as its initial tab so the user returns to the Users section.
- Render every department member for the selected role using the enhanced member card.
- Apply the same active-first, newest-first ordering.
- Do not render the department identity card or the department workspace bottom tab bar.
- The existing admin mobile top bar remains hidden because these routes are department-workspace routes.
- Empty roles render a role-specific empty state.

## Data and Boundaries

- Extend `DepartmentMemberSummary` and the department query with `created_at`.
- Role-list page queries must filter explicitly by both `department_id` and the fixed role value.
- Admin authorization remains enforced by the existing admin layout; no schema, mutation, account-state, or RLS changes.
- Only `treasurer` and `adviser` belong in these sections; admin accounts are excluded.

## Verification

- Pure checks cover active-first/newest-first sorting, role grouping, three-item previews, and combined search behavior.
- Verify mobile and desktop Users-tab layouts, search-mode header removal, readable card labels, both `View all` routes, absence of department hero/bottom tabs on list pages, keyboard focus, empty states, and existing profile navigation.
- Run scoped ESLint, TypeScript, production build, and browser console checks.
