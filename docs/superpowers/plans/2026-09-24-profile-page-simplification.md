# Profile Page Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every acting-user profile page a compact single-column layout matching the supplied mobile reference.

**Architecture:** Keep the shared role-guarded Server Component and its existing route wrappers. Simplify only its query and presentation, retaining one identity card and one general-information card at all viewport sizes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4 tokens, Lucide icons.

## Global Constraints

- Use existing `@theme` color utilities only.
- Add no dependencies or schema changes.
- Keep `AdminMemberProfile` unchanged.
- Keep Change password non-functional and Admin mobile logout role-gated.

---

### Task 1: Simplify the shared profile

**Files:**
- Modify: `components/profile/ProfileView.tsx`
- Modify: `scripts/check-profile-redesign.mjs`

- [x] Update the structural check to require one-column layout and reject removed verification/approval fields.
- [x] Run `node scripts/check-profile-redesign.mjs` and confirm it fails against the current two-column implementation.
- [x] Replace the desktop introduction and grid with one `max-w-3xl` vertical stack.
- [x] Build the reference-style identity card and one General information list.
- [x] Query and render only `created_at` among account-history dates.
- [x] Run the structural check, scoped ESLint, and `npx tsc --noEmit`.

### Task 2: Verify and document

**Files:**
- Modify: `context/ui-registry.md`
- Modify: `context/progress-tracker.md`

- [x] Verify the authenticated page at 390px and 1440px, including console output and back navigation.
- [x] Run `npm run build` and `git diff --check`.
- [x] Update project records to describe the final single-column design and any credential-limited coverage.
