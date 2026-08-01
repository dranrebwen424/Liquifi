# UI Rules

Concise rules for building Liquifi UI. These cover the patterns and constraints to keep the UI consistent without over-specifying every detail.

All component specs use `var(--token-name)` references to the canonical values defined in `ui-tokens.md`. Never hardcode values — always reference the token.

---

## Font

Always import Poppins via `next/font/google` in the root layout.

```typescript
import { Poppins } from "next/font/google";
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans" });
```

The `--font-sans` variable is declared in `@theme` in `globals.css`. Apply the font variable class to the `<html>` tag in root layout. Never use system fonts as the primary font.

---

## Layout

- Page max-width: 1440px, centered
- Main content area padding: 32px on all sides (16px on mobile)
- Gap between page sections: 24px
- Header height: 64px, full width, white background, padding 0 24px
- **Web:** sidebar nav, fixed width 240px, full viewport height, left-aligned
- **Mobile:** bottom nav bar, fixed height 64px, icons + labels
- Nav items are role-scoped per the architecture doc — never render a nav item the current role/route group doesn't own:
  - Treasurer → Home, Notifications, Reports, Profile
  - Adviser → Home, Approvals, Notifications, Reports, Profile
  - Admin → Departments, Approvals, Profile
- Role checks that gate a page are server-side (route group layout); the nav itself is cosmetic only — never rely on hiding a nav item as access control

---

## Sidebar / Bottom Nav

- Active item: `color: var(--color-accent)`, font-weight 500, 14px, `background: var(--color-accent-light)` pill behind icon+label on web sidebar
- Inactive item: `color: var(--color-text-secondary)`, font-weight 500, 14px
- No underline — active state is color + background change only
- Sidebar/nav always white background, full-height (web) or full-width (mobile)
- Unread notification count shows as a small pill badge on the Notifications nav item, never as a raw dot with no count

---

## Cards

Every content section lives in a card.

```
background:      var(--color-surface)
border:          1px solid var(--color-border)
border-radius:   var(--radius-lg)
padding:         24px
box-shadow:      0px 1px 2px rgba(17,17,20,0.04),
                 0px 1px 3px rgba(17,17,20,0.06)
```

Never use colored card backgrounds — always white. Color goes inside cards via badges, bars, banners, and text, never on the card surface itself. Exception: the locked/archived banner (see below) is a banner, not a card.

---

## Typography Hierarchy

Three levels used consistently throughout:

**Section headings** — card titles, page section titles

```
font-size:     16px
font-weight:   600
color:         var(--color-text-primary)
line-height:   24px
```

**Body / primary content text**

```
font-size:     14px
font-weight:   500
color:         var(--color-text-primary)
line-height:   20px
```

**Secondary / muted text** — labels, timestamps, subtitles, attribution ("voided by [Name]")

```
font-size:     12px
font-weight:   400
color:         var(--color-text-muted)
line-height:   16px
```

**Stat numbers** (Total / Spent / Remaining on event dashboard):

```
font-size:     28px
font-weight:   600
color:         var(--color-text-primary)
line-height:   36px
```

Negative `Remaining` overrides color to `var(--color-error)` only; weight and size stay identical — overspend reads as a color change, not a layout change.

---

## Buttons

All button variants. Padding and radius reference the canonical spacing/radius tokens.

### Primary

```
background:      var(--color-accent)
color:           var(--color-accent-foreground)
padding:         8px 16px
font-size:       14px
font-weight:     500
border-radius:   var(--radius-full)
hover:           background var(--color-accent-hover)
                 no visual layout change
transition:      transition-[color,transform]
press:           active:scale-[0.98]
```

### Secondary

```
background:      var(--color-surface)
border:          1px solid var(--color-border)
color:           var(--color-text-primary)
padding:         8px 16px
font-size:       14px
border-radius:   var(--radius-full)
hover:           background var(--color-surface-secondary)
                 border var(--color-border-strong)
```

### Ghost

```
background:      transparent
color:           var(--color-text-secondary)
padding:         8px 16px
font-size:       14px
border-radius:   var(--radius-md)
hover:           background var(--color-surface-secondary)
                 color var(--color-text-primary)
```

### Destructive

(Void, Reject, Discard — never use a filled/solid red button)

```
background:      var(--color-surface)
border:          1px solid var(--color-error)
color:           var(--color-error)
padding:         8px 16px
font-size:       14px
font-weight:     500
border-radius:   var(--radius-full)
hover:           background var(--color-error-lightest)
```

Destructive actions never use a filled/solid red button — outline-only, so the visual weight of delete/void/reject never exceeds the primary action on the page.

---

## Form Inputs

```
background:        var(--color-surface)
border:            1px solid var(--color-border)
border-radius:     var(--radius-md)
padding:           8px 12px
font-size:         14px
color:             var(--color-text-primary)
placeholder color: var(--color-text-muted)
focus:             ring-1 var(--color-accent) border var(--color-accent)
```

Read-only fields (receipt review — extracted values the treasurer cannot edit) use the same shell with `background: var(--color-surface-secondary)` and a disabled cursor, so editable vs. read-only is visually obvious without relying on a label alone.

---

## Badges (Status / Role / Tags)

Badges are **bare Lucide icons** — no background, no border, no text. The icon color encodes status via semantic tokens. Each badge includes `aria-label` and `title` for accessibility and hover tooltip.

```
size:           20×20px
display:        inline-flex, shrink-0
background:     none
border:         none
padding:        none
```

One shared `<StatusBadge>` component drives every state-machine field — never a one-off badge per page. Takes `icon` (Lucide component), `variant` (color), and `label` (aria text). Fixed icon mapping, extend this table rather than inventing new icons per feature:

### Status Badge Icon Mapping

| State family | Value | Icon | Variant | Color source |
|---|---|---|---|---|
| Account | `pending_approval` | `Clock` | `warning` | `var(--color-warning)` |
| Account | `active` | `CircleCheckBig` | `success` | `var(--color-success)` |
| Account | `deactivated` / `rejected` | `CircleMinus` | `neutral` | `var(--color-neutral)` |
| Event | `open` | `CircleCheckBig` | `success` | `var(--color-success)` |
| Event | `archived` | `CircleMinus` | `neutral` | `var(--color-neutral)` |
| Entry | `ai_parsed` / `treasurer_reviewed` / `draft` | `CircleDot` | `info` | `var(--color-info)` |
| Entry | `pending_approval` / `resubmitted` | `Clock` | `warning` | `var(--color-warning)` |
| Entry | `approved` / `deducted` | `CircleCheckBig` | `success` | `var(--color-success)` |
| Entry | `rejected` / `discarded` / `voided` | `CircleX` | `error` | `var(--color-error)` |
| Report | `pending_adviser_approval` | `Clock` | `warning` | `var(--color-warning)` |
| Report | `approved` | `CircleCheckBig` | `success` | `var(--color-success)` |
| Report | `rejected` / `cancelled` | `CircleX` | `error` | `var(--color-error)` |

### Role Badge Icon Mapping

| Role | Icon | Variant | Color source |
|------|------|---------|-------------|
| Admin | `Shield` | `default` | `var(--color-accent)` |
| Adviser | `BookOpen` | `info` | `var(--color-info)` |
| Treasurer | `Landmark` | `success` | `var(--color-success)` |

---

## Currency

All monetary values are PHP, `decimal(12,2)`. Always render through one shared formatter (`lib/format.ts formatPHP()`) — `₱` prefix, comma thousands separator, always 2 decimals, never formatted inline per component. Never round or truncate decimals for display.

---

## Voided / Struck-Through Entries

Voided entries are never removed from a list. Row treatment: `opacity: 0.6`, entry amount and description get `text-decoration: line-through`, plus the `voided` badge from the status map above. The void reason and `voided_by`/`voided_at` attribution show as secondary text directly under the row, always visible — not hidden behind a hover or expand.

---

## Locked / Archived Banner

Shown at the top of the event dashboard, full-width inside the page (not inside a card), whenever `Event.is_locked = true` or `Event.status = 'archived'`:

**Locked:**
```
background:      var(--color-warning-lightest)
border:          1px solid var(--color-border)
border-radius:   var(--radius-lg)
padding:         12px 16px
font-size:       14px
font-weight:     500
```

**Archived:**
```
background:      var(--color-neutral-light)
border:          1px solid var(--color-border)
border-radius:   var(--radius-lg)
padding:         12px 16px
font-size:       14px
font-weight:     500
```

Always states the reason in plain language ("Locked — report pending adviser approval", "Archived — this event is read-only") — never a bare icon or color with no text. All mutating controls on the page (Log Entry, Void, Generate/Cancel Report, budget edit) are `disabled` with a tooltip pointing back to this banner, never silently hidden.

---

## Required-Reason Modals

(Void, report rejection, account rejection — share one modal pattern)

- Textarea, no character minimum unless the architecture doc specifies one
- Primary (destructive) button stays `disabled` until the textarea is non-empty
- Cancel is always a secondary button, never destructive-styled
- Modal never auto-closes on a failed submit — stays open with an inline error

Account/treasurer rejection has no reason field per the architecture doc (only report rejection and void require one) — do not add a reason requirement to flows that don't call for it.

---

## Table (Entries, Jobs-style Lists)

- No alternating row colors — white rows only, separated by border
- Row border: `1px solid var(--color-border)` between rows
- Column headers: uppercase, 12px, font-weight 500, `color: var(--color-text-muted)`
- Row text: 14px, `color: var(--color-text-primary)`
- Hover state: `background: var(--color-surface-secondary)`
- Multi-select (adviser batch approval) uses a checkbox column pinned left, with a sticky action bar appearing above the table once 1+ rows are selected — never a floating/fixed-position bar

---

## Budget Progress Bar

```
track background:  var(--color-border-light)
fill:              varies by budget range (see below)
height:            6px
border-radius:     var(--radius-full)
```

### Fill Color by Range

| Range | Meaning | Color |
|-------|---------|-------|
| < 70% of budget used | Healthy | `var(--color-success)` |
| 70–99% of budget used | Near limit | `var(--color-warning)` |
| ≥ 100% of budget used (overspend) | Over budget | `var(--color-error)` |

---

## Activity / Timeline Dots

Each event type has a specific dot color:

| Activity Type | Outer ring | Inner dot |
|---|---|---|
| Entry logged | `var(--color-info-lightest)` | `var(--color-info)` |
| Report generated / approved | `var(--color-success-lightest)` | `var(--color-success)` |
| Rejected / voided | `var(--color-error-lightest)` | `var(--color-error)` |

Dot size: 8px inner, 16px outer with white border.

---

## Dashboard Chart Colors

| Chart | Color |
|---|---|
| Budget utilization over time (line) | `var(--color-accent)` stroke, 2.5px width, gradient fill rgba(17,17,20,0.06) |
| Entries logged per week (bars) | `var(--color-info)` |
| Report status breakdown (bars) | `var(--color-success)` |
| Chart grid lines | 1px dashed `var(--color-border)` |
| Chart axis labels | `var(--color-text-muted)`, 12px |

---

## Logo

```
mark:            monoline geometric symbol, single color
background:      none (transparent) — rendered in var(--color-accent)
size:            32×32px
wordmark weight: 700
```

---

## Role-Scoped Read-Only Mode

Adviser and Admin views of Treasurer-owned pages (event dashboard, report detail) reuse the exact same components as the Treasurer originals via a `readOnly` boolean prop — never a separately built duplicate component. In read-only mode: all mutating buttons (Log Entry, Void, Generate/Cancel Report, Archive, budget edit) are omitted entirely (not just disabled — there's no locked-banner tooltip need here since it's a permanent role property, not a temporary state), while every status badge, banner, and data field renders identically to the Treasurer view.

---

## Empty States

Every section that can be empty must have an empty state. Keep it minimal:

- Short descriptive text in `color: var(--color-text-muted)`
- Optional icon above text
- CTA button if there's a logical next action (e.g. empty events list → "New Event"; empty entries list → "Log Entry", disabled if `is_locked`/`archived`)

---

## Animation Standards

See `code-standards.md` → Animation Library Selection for the tool selection rules (CSS → framer-motion → GSAP). This section defines the *what* and *how* — the visual standards every animation must meet.

### 5 Animation Rules

**1. Animate only when meaning changes.** If the user can't answer "what just happened", the animation is noise. Animations communicate state transitions — they are not decoration.

**2. Keep durations short.**

| Element | Duration |
|---|---|
| Hover / focus | 120–180 ms |
| Buttons | 150–200 ms |
| Cards | 180–250 ms |
| Dialogs / sheets | 250–350 ms |
| Page transitions | 250–400 ms |

When in doubt, use the lower end of the range.

**3. Prefer spring motion** over linear easing. Springs feel natural and make the UI feel responsive.

```
// framer-motion
transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.2 }}

// CSS approximation
transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
```

Reserve fixed-duration `power` eases for GSAP presentation animations only (ScrollTrigger reveals, hero sequences).

**4. Use subtle movement.**

| Parameter | Range | Example |
|---|---|---|
| Slide / translate | 8–24 px | `y: 12` for card stagger |
| Scale | 0.98 ↔ 1.02 | `scale: 1.02` on hover |
| Opacity | 0 → 1 | Gentle fades only |
| Blur | 0 → 4 px max | Dialog backdrops |

No dramatic 100+ px slides, no large bounces, no jarring transforms.

**5. Every animation must have a purpose.** Is the user waiting? → communicate progress. Did a new element appear? → fade it in so their peripheral vision catches it. Are we listing entries? → a micro-stagger cues "these are related items."

If the answer to "what information does this communicate?" is "none" — remove it.

### framer-motion vs GSAP Boundary

| Use framer-motion for | Use GSAP for |
|---|---|
| List stagger-ins | ScrollTrigger parallax |
| Modal/sheet mount/unmount | SVG path drawing (`DrawSVG`) |
| Page transitions | Timeline sequences (>5 steps) |
| Tab content crossfade | Canvas/WebGL integrations |
| Layout animations (`layoutId`) | Animation that needs progress-based scrub |

### Stagger Pattern (Standard)

```tsx
"use client";
import { motion } from "framer-motion";

const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1, y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20, duration: 0.2 },
  },
};

// Usage
<motion.div variants={staggerContainer} initial="hidden" animate="show">
  {items.map(item => (
    <motion.div key={item.id} variants={fadeUpItem}>
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

### AnimatePresence Pattern (Standard)

```tsx
"use client";
import { motion, AnimatePresence } from "framer-motion";

<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } }}
    exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
  >
    {content}
  </motion.div>
</AnimatePresence>
```

---

## Tailwind v4 Note

This project uses Tailwind v4. Tokens are defined with `@theme` in `globals.css` — no `tailwind.config.ts` needed. Never define colors in a config file. Always use `@theme` for new tokens.

---

## Do Nots

- Never use Tailwind's built-in color classes (`bg-purple-500`, `text-gray-600`) — use project tokens only
- Never define colors in `tailwind.config.ts` — use `@theme` in `globals.css`
- Never add gradients to card backgrounds
- Never use more than one font weight in a single UI element
- Never show raw error messages to users — always show human-readable text (e.g. a failed OpenRouter parse never surfaces a stack trace, it surfaces "Couldn't read this receipt — try again or use manual entry")
- Never stack more than 2 levels of border radius inside each other
- Never use `position: fixed` for UI elements — use normal flow layout (this includes the batch-approval action bar — use sticky within the scroll container, not fixed to viewport)
- Never hide a disabled/unavailable action without explaining why (locked event, archived event, wrong role) — always pair with a banner or tooltip
- Never build a second version of a component for a different role — extend the original with a prop (`readOnly`, `variant`) per the read-only mode rule above
- Never invent a new status color outside the Status Badges table — extend that table first, then use it
- Never hardcode hex or pixel values in component specs — always reference token variables
