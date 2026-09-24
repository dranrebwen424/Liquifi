# Profile Page Simplification

## Goal

Replace the information-dense profile dashboard with the compact, vertically scannable layout shown in the supplied mobile reference.

## Layout

- Use one centered column at every viewport size.
- Keep the mobile arrow-only back control and existing desktop navigation.
- Show one identity card with a dark header band, overlapping initials avatar, full name, role, and account status.
- Show one General information card below it with first, middle, and last name, email, department, department code, and joined date.
- Present Change password as the final list action.
- Keep the Admin-only mobile logout below the information card.

## Simplification

- Remove the desktop two-column layout and desktop page introduction.
- Remove duplicate Organization and Account & security sections.
- Do not show email-verified or account-approved dates.
- Keep the separate Admin department-member profile unchanged.

## Verification

- Run the profile structural check, scoped ESLint, TypeScript, and production build.
- Verify authenticated mobile and desktop rendering when a role session is available.
