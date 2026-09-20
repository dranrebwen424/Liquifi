# Admin Department Detail Figma Redesign

**Date:** 2026-09-21
**Status:** Approved design
**Reference:** Figma file `werwziocGxW0hh7a4sWvhl`, node `229:459`

## Goal

Rebuild `/admin/departments/[departmentId]` around the supplied mobile design while preserving all existing admin read-only data, tab behavior, routes, authorization, filters, empty states, and account actions.

## Mobile Department Root

- Hide the global admin mobile top bar on the department workspace, as it does today.
- Render a centered `Department Detail` title with an in-page back arrow to `/admin/departments`.
- Render a dark department card with the full department name, code, and `/public/Loudspeaker.json` through the existing `LottiePlayer`.
- Events is the initial tab. Its mobile layout follows the Figma hierarchy: rounded Search Events field, Active Events heading/count, View all link, two-column folder grid, Archive Events heading/count/filter, and compact archive rows.
- Show only the four newest active events on the root page. `View all` navigates to `/admin/departments/[departmentId]/events`.
- Render Events, Reports, Users, and Audit Logs as a fixed mobile workspace bottom navigation. Keep enough page-bottom clearance so content is never obscured.
- Existing Reports, Users, and Audit Logs content remains functionally unchanged and switches in place through the workspace navigation.

## All Events Route

- Add `/admin/departments/[departmentId]/events` as an admin-only Server Component page.
- Reuse the treasurer-style `ActiveEventsClient` with admin paths and read-only event links.
- Its back button returns to the department root.
- The department workspace bottom navigation is absent on this route; the existing global mobile top bar also remains hidden because it is a department-workspace route.

## Desktop Adaptation

- Keep the desktop sidebar and global admin top bar.
- Use the same department identity card at the top, adapted to the available width without stretching the Lottie excessively.
- Render an accessible in-flow tablist immediately below the department card; no fixed workspace navigation on desktop.
- Events keeps the existing full desktop `EventBrowser`; Reports, Users, and Audit Logs keep their existing desktop components.

## Boundaries

- No schema, mutation, authorization, or state-machine changes.
- No new dependency; use existing `lottie-web`, `LottiePlayer`, folder cards, archive rows, filters, tabs, and event list components.
- Do not alter adviser or treasurer screens while adapting the admin workspace.
- Use only project theme tokens; no hardcoded component colors or raw Tailwind color utilities.

## Accessibility and Verification

- Tab controls keep `role="tablist"`, `role="tab"`, `aria-selected`, panel association, keyboard arrows, Home, and End behavior.
- Icon-only controls receive accessible labels and focus-visible states.
- Verify at 390px mobile and 1440px desktop, including all four tabs, search/filter states, View all navigation, back navigation, bottom-nav visibility, and empty collections.
- Run scoped ESLint, TypeScript, production build, browser console checks, and relevant deterministic checks before completion.
