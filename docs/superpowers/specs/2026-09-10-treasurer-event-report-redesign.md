# Treasurer Event Report Redesign

## Goal

Redesign `/treasurer/reports/[eventId]` into a premium, focused workspace that tells the treasurer what happens next. Reduce visible information without removing access to financial context or immutable report history.

## Scope

- Treasurer report detail page only.
- Preserve all report state transitions, authorization, generation, cancellation, PDF, and archive behavior.
- Do not change adviser or admin report pages.
- Do not change the generated PDF design or backend queries.

## Information hierarchy

1. Compact page header: back navigation, event name and creation metadata, `View Event` action.
2. Quiet three-step progress indicator showing report creation, adviser approval, and signed archive completion.
3. One dark, state-aware action workspace as the visual focus.
4. Latest report file row, when a report exists.
5. Collapsed `Spending summary` and `Previous revisions` disclosures.

## State-aware workspace

| State | Heading | Guidance / action |
|---|---|---|
| No report | Create your event report | Enter signatories and generate the report. |
| Rejected | Update and regenerate | Explain that a new revision keeps the same FS number; show the generation form. |
| Cancelled | Generate a new revision | Show the generation form with saved signatories restored. |
| Pending approval | Awaiting adviser approval | State that no action is required; provide `View submitted report`; keep Cancel visually secondary. |
| Approved, event open | Ready for signing | Prompt the treasurer to print/download, collect signatures, then return to the event for archiving. |
| Archived | Report complete | Confirm the event is permanently read-only and keep View/Download available. |
## Visual direction

- Use existing monochrome tokens only: `bg-background`, `bg-surface`, `bg-surface-inverse`, token borders, and semantic status colors.
- Keep Poppins and the existing typography scale.
- Use generous spacing, one main column, fewer visible borders, and rounded tokenized surfaces.
- Color communicates report state only; no decorative gradients.
- Keep motion limited to existing subtle entrance/interaction patterns and honor reduced motion.

## Responsive behavior

- Mobile and desktop share the same hierarchy.
- Desktop uses a centered readable-width column rather than the current 3/5 + 2/5 dashboard.
- Mobile actions remain full-width and touch-friendly.
- Disclosures use native `<details>/<summary>` so no new client state or dependency is required.

## Component changes

- Recompose `app/treasurer/reports/[eventId]/page.tsx` around the selected guided workspace.
- Restyle `ReportGenerationFlow` and `SignatorySetup` for the dark action surface while preserving their existing state machine and localStorage behavior.
- Keep shared `ReportFileCard` and `ReportViewer` unchanged; the treasurer page supplies all new layout chrome around them.
- Reuse `StatusBadge`, `PrintReportButton`, `CancelReportButton`, `formatPHP()`, and existing report proxy URLs.

## Data and errors

The page continues using the existing parallel `getEventDashboard()` and `getAllReportsByEvent()` reads, department guard, and report ordering. Generation and cancellation continue through the current endpoints. Existing human-readable inline errors remain visible in the action workspace; failed actions do not collapse or navigate away.

## Accessibility

- Preserve semantic headings and link/button elements.
- Progress text must remain understandable without color.
- Disclosure summaries are keyboard-operable and expose expanded state natively.
- Existing icon labels and focus styles remain intact.

## Verification

- TypeScript and scoped ESLint pass.
- Browser-check mobile and desktop layouts for all reachable report states.
- Verify generation, validation error, pending cancellation, PDF View/Download, Print after approval, disclosure toggles, and cross-department not-found behavior remain unchanged.
- Confirm adviser and admin report pages are visually and behaviorally unaffected.
