# Native Bottom Sheet Drag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every mobile bottom sheet smoothly slide up when opened, follow a drag started anywhere on the sheet, and always snap back open when the pointer is released or cancelled.

**Architecture:** `CssBottomSheet` owns the sole vertical transform for entrance, dragging, and snap-back so transforms never compete. It supplies native Pointer Event handlers to every sheet body; release, cancel, lost pointer capture, or page visibility loss resets the transform to the open position. Dragging never dismisses a sheet.

**Tech Stack:** React state/effects, Pointer Events, CSS transforms/transitions, Tailwind CSS v4.

## Global Constraints

- No Framer Motion for mobile bottom-sheet enter, exit, drag, or snap-back.
- All colors use existing `@theme` utilities; no new dependencies.
- Keep desktop dialog Framer variants unchanged.
- Use `85dvh` sheet limits and honor `prefers-reduced-motion`.

---

### Task 1: Make `CssBottomSheet` own native entrance and drag state

**Files:**
- Modify: `components/ui/CssBottomSheet.tsx`
- Delete: `lib/use-drag-to-dismiss.ts`

**Interfaces:**
- Produces: `CssBottomSheet({ open, children, className?, hideAt? })` with a single outer transform and pointer handlers cloned onto its child.

- [ ] **Step 1: Add a focused executable drag-state check**

Add `scripts/check-bottom-sheet-state.ts` with assertions for clamped up/down drag values and snap-back:

```ts
import assert from "node:assert/strict";

function clampDrag(delta: number): number {
  return Math.max(-24, Math.min(delta, 320));
}

assert.equal(clampDrag(-80), -24);
assert.equal(clampDrag(80), 80);
assert.equal(clampDrag(999), 320);
console.log("bottom-sheet state checks passed");
```

- [ ] **Step 2: Run it before implementation**

Run: `npx tsx scripts/check-bottom-sheet-state.ts`

Expected: fail because the file does not exist.

- [ ] **Step 3: Implement the single-transform sheet state**

In `CssBottomSheet`, retain its mount/enter effect and add `offset`, `dragging`, refs for pointer id/start Y, pointer handlers on the sheet body, `onPointerCancel`/`onLostPointerCapture` reset, and `onPointerUp` reset. While dragging set `transition: none`; otherwise use the 450ms cubic-bezier transition. Clamp upward drag at `-24px`, downward drag at `320px`; every terminal pointer path sets offset to zero. Remove `useDragToDismiss` because the outer sheet is now the only transform owner.

- [ ] **Step 4: Run the check and typecheck**

Run: `npx tsx scripts/check-bottom-sheet-state.ts; npx tsc --noEmit`

Expected: `bottom-sheet state checks passed` and no TypeScript errors.

### Task 2: Route every sheet through the unified drag surface

**Files:**
- Modify: `components/events/NewEventModal.tsx`
- Modify: `components/entries/LogEntryModal.tsx`
- Modify: `components/events/EditBudgetModal.tsx`
- Modify: `components/events/ArchiveEventModal.tsx`
- Modify: `components/entries/VoidEntryModal.tsx`
- Modify: `components/entries/ReceiptReview.tsx`
- Modify: `components/entries/EntryDetailModal.tsx`
- Modify: `components/admin/DepartmentsListClient.tsx`

**Interfaces:**
- Consumes: the drag-enabled `CssBottomSheet` from Task 1.
- Produces: no per-feature drag hooks/styles; all sheets use one CSS/native implementation.

- [ ] **Step 1: Remove the per-feature drag hook references**

Delete the `useDragToDismiss` import, `wrapRef`, `sheetStyle`, and handler spread from New Event and Log Entry. Do not add feature-level Pointer Event handlers elsewhere.

- [ ] **Step 2: Make sheet bodies usable as one drag surface**

Keep each existing mobile sheet body as the single child of `CssBottomSheet`. Remove `touch-none` from scrollable sheet bodies so form controls and content remain scrollable/clickable until a drag crosses the gesture threshold.

- [ ] **Step 3: Build and inspect the emitted surface count**

Run: `npx next build`

Expected: successful build, every former sheet still renders through `CssBottomSheet`.

### Task 3: Mobile smoke test and record the pattern

**Files:**
- Modify: `context/progress-tracker.md`
- Modify: `context/ui-registry.md`

- [ ] **Step 1: Deploy**

Run: `npx vercel --prod --yes`, then alias the deployment to `liquifi-app.vercel.app`.

- [ ] **Step 2: Verify an affected mobile sheet**

At `390×844`, open an entry detail sheet and sample its computed transform: initially below the viewport, then settled at the viewport bottom; drag it downward and dispatch `pointercancel`, confirming it returns to zero; drag upward and release, confirming it returns to zero. Verify one other sheet trigger when available.

- [ ] **Step 3: Record the finalized pattern**

Document that `CssBottomSheet` owns all sheet transforms, allows a whole-sheet native drag, and always snaps back on release/cancel/lost capture. Commit docs separately.
