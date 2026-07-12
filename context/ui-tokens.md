# UI Tokens

Design tokens for **Liquifi**. All colors, typography, spacing, and component
values below are the single source of truth for styling. Use these exact
values throughout the codebase — never hardcode colors or use raw Tailwind
color classes in components.

---

## How to Use

This project uses **Tailwind CSS v4**. All design tokens are defined using
the `@theme` directive in `app/globals.css`. No `tailwind.config.ts` needed
for colors or tokens.

Tailwind v4 automatically generates utility classes from `@theme` variables:

- `--color-accent` → `bg-accent`, `text-accent`, `border-accent`
- `--color-surface` → `bg-surface`, `text-surface`, `border-surface`

```tsx
// Correct — uses generated utility classes
className="bg-surface text-text-primary border-border"

// Also correct — references CSS variable directly
style={{ color: 'var(--color-text-primary)' }}

// Never — hardcoded hex values
className="bg-[#FFFFFF] text-[#111827]"

// Never — raw Tailwind color classes
className="bg-black text-gray-600"
```

---

## Design Direction

Liquifi's UI is **clean, monochrome-first, and quiet** — a neutral gray/black/
white system carries structure and hierarchy, with a single black "ink"
accent for primary actions (mirrors an editorial, high-contrast SaaS look).
Color is reserved almost entirely for **state**: budgets, approvals,
overspend, and report status. If a badge, bar, or icon is colored, it's
telling the user something about status — not decoration.

---

## globals.css — Complete Token Definition

```css
@import "tailwindcss";

@theme {
  /* Font */
  --font-sans: "Poppins", sans-serif;

  /* Page and surface backgrounds */
  --color-background: #fafafa;
  --color-surface: #ffffff;
  --color-surface-secondary: #f5f5f6;
  --color-surface-tertiary: #f0f0f2;
  --color-surface-inverse: #111114;

  /* Borders */
  --color-border: #e5e5e8;
  --color-border-light: #eeeeef;
  --color-border-strong: #d4d4d8;

  /* Text */
  --color-text-primary: #111114;
  --color-text-secondary: #63636b;
  --color-text-muted: #9a9aa2;
  --color-text-dark: #3a3a42;
  --color-text-inverse: #ffffff;

  /* Primary accent — ink black (buttons, active nav, focus, links) */
  --color-accent: #111114;
  --color-accent-hover: #27272e;
  --color-accent-light: #eeeeef;
  --color-accent-muted: #f5f5f6;
  --color-accent-foreground: #ffffff;

  /* Success — green (approved, on-budget, matched) */
  --color-success: #10b981;
  --color-success-dark: #047857;
  --color-success-light: #d1fae5;
  --color-success-lightest: #ecfdf5;
  --color-success-foreground: #047857;

  /* Info — blue (in review, informational, no-receipt entries) */
  --color-info: #3b82f6;
  --color-info-dark: #1d4ed8;
  --color-info-light: #dbeafe;
  --color-info-lightest: #eff6ff;
  --color-info-foreground: #1d4ed8;

  /* Warning — amber (pending approval, nearing budget limit) */
  --color-warning: #f59e0b;
  --color-warning-dark: #b45309;
  --color-warning-light: #fef3c7;
  --color-warning-lightest: #fffbeb;
  --color-warning-foreground: #b45309;

  /* Error — red (rejected, overspent, voided) */
  --color-error: #ef4444;
  --color-error-dark: #b91c1c;
  --color-error-light: #fee2e2;
  --color-error-lightest: #fef2f2;
  --color-error-foreground: #b91c1c;

  /* Neutral / archived — gray (locked, archived, closed) */
  --color-neutral: #71717a;
  --color-neutral-light: #f0f0f2;
  --color-neutral-foreground: #52525b;

  /* Role tags */
  --color-role-admin: #111114;
  --color-role-admin-light: #eeeeef;
  --color-role-adviser: #3b82f6;
  --color-role-adviser-light: #dbeafe;
  --color-role-treasurer: #10b981;
  --color-role-treasurer-light: #d1fae5;

  /* Overlays */
  --color-overlay: #111114;
  --color-overlay-alpha: rgba(17, 17, 20, 0.5);

  /* Border radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-full: 9999px;
}
```

Tailwind v4 generates utility classes automatically from every `--color-*`
token above:

- `bg-accent`, `text-accent`, `border-accent`
- `bg-surface`, `text-surface-secondary`
- `bg-success-light`, `text-text-muted`
- etc.

---

## Color Usage Guide

### Page Layout

| Element               | Token                      |
| --------------------- | -------------------------- |
| Page background       | `bg-background`            |
| Card / surface        | `bg-surface`               |
| Secondary surface     | `bg-surface-secondary`     |
| Inverse surface       | `bg-surface-inverse`       |
| Default border        | `border-border`            |
| Light border          | `border-border-light`      |
| Strong border         | `border-border-strong`     |

### Typography

| Element                  | Token                              |
| ------------------------ | ---------------------------------- |
| Headings, primary text   | `text-text-primary` (#111114)      |
| Secondary text, labels   | `text-text-secondary` (#63636B)    |
| Placeholder, timestamps  | `text-text-muted` (#9A9AA2)        |
| Dark supporting labels   | `text-text-dark` (#3A3A42)         |
| Text on dark surfaces    | `text-text-inverse`                |

### Accent (Primary Ink)

Used for: primary buttons, active nav item, focus rings, links, logo mark.

| Element                | Token                     |
| ---------------------- | ------------------------- |
| Button background      | `bg-accent`               |
| Button text            | `text-accent-foreground`  |
| Light badge background | `bg-accent-light`         |
| Subtle background      | `bg-accent-muted`         |

### Entry / Report / Event Status

| Scope                     | Status                     | Background               | Text                        |
| ------------------------- | -------------------------- | ------------------------ | --------------------------- |
| Entry / Report / Event    | Approved / Active          | `bg-success-lightest`    | `text-success-foreground`   |
| Entry / Report / Event    | Pending approval           | `bg-warning-lightest`    | `text-warning-foreground`   |
| Entry / Report            | Rejected / Voided          | `bg-error-lightest`      | `text-error-foreground`     |
| Entry                     | Awaiting review            | `bg-info-lightest`       | `text-info-foreground`      |
| Event                     | Archived / Locked          | `bg-neutral-light`       | `text-neutral-foreground`   |
| Account                   | Deactivated / Rejected     | `bg-neutral-light`       | `text-text-muted`           |

### Budget Health

| Range                    | Meaning      | Token                                    |
| ------------------------ | ------------ | ---------------------------------------- |
| < 70% used              | Healthy      | `text-success` / `bg-success-lightest`   |
| 70–99% used             | Near limit   | `text-warning` / `bg-warning-lightest`   |
| ≥ 100% used (overspend) | Over budget  | `text-error` / `bg-error-lightest`       |

### Role Badges

| Role       | Background              | Text                    |
| ---------- | ----------------------- | ----------------------- |
| Admin      | `bg-role-admin-light`   | `text-role-admin`       |
| Adviser    | `bg-role-adviser-light` | `text-role-adviser`     |
| Treasurer  | `bg-role-treasurer-light` | `text-role-treasurer` |

### Entry Source Badges

| Source                   | Background               | Text                       |
| ------------------------ | ------------------------ | -------------------------- |
| Receipt (AI-parsed)      | `bg-info-lightest`       | `text-info-foreground`     |
| No-receipt (manual form) | `bg-surface-secondary`   | `text-text-secondary`      |

---

## Typography

| Element               | Size | Weight | Line height | Color token            |
| --------------------- | ---- | ------ | ----------- | ---------------------- |
| Logo text             | 20px | 700    | 28px        | `text-text-primary`    |
| Page title / hero     | 32px | 600    | 40px        | `text-text-primary`    |
| Stat number           | 28px | 600    | 36px        | `text-text-primary`    |
| Section heading       | 16px | 600    | 24px        | `text-text-primary`    |
| Nav item (active)     | 14px | 500    | 20px        | `text-accent`          |
| Nav item (inactive)   | 14px | 500    | 20px        | `text-text-secondary`  |
| Card label            | 14px | 500    | 20px        | `text-text-secondary`  |
| Body / table text     | 14px | 500    | 20px        | `text-text-primary`    |
| Badge / status text   | 12px | 500    | 16px        | inherits token         |
| Timestamp / muted     | 12px | 400    | 16px        | `text-text-muted`      |
| Chart axis labels     | 12px | 400    | 16px        | `text-text-muted`      |

Font family: **Poppins** — import via `next/font/google`, weights 400 / 500 /
600 / 700.

```ts
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});
```

---

## Spacing

| Token         | Value      | Usage                  |
| ------------- | ---------- | ----------------------- |
| `gap-1`       | 4px        | Tight inline gaps      |
| `gap-2`       | 8px        | Badge and icon gaps    |
| `gap-3`       | 12px       | Form field gaps        |
| `gap-4`       | 16px       | Section internal gaps  |
| `gap-6`       | 24px       | Between sections       |
| `gap-8`       | 32px       | Page section gaps      |
| `p-4`         | 16px       | Card padding           |
| `p-6`         | 24px       | Large card padding     |
| `px-4 py-2`   | 16px / 8px | Button padding         |
| `px-2 py-0.5` | 8px / 2px  | Badge padding          |

---

## Invariants

- Never use hex values directly in components — always use CSS variables via
  Tailwind tokens.
- Font is Poppins — always import via `next/font/google`, never fall back to
  a system font.
- Never use raw Tailwind color classes like `bg-black` or `text-gray-600` —
  use project tokens only.
- `--accent` (#111114) is the only "ink" color used for primary actions —
  it is intentionally near-black, not pure `#000000`.
- Color always encodes status (approved / pending / rejected / overspent) —
  never used purely decoratively.
- Budget bars and status badges always use the range/status tables above —
  never hardcoded colors.
- All borders default to `--border` (#E5E5E8) — never use `border-gray-*`.
- Role badges (Admin / Adviser / Treasurer) always use their dedicated
  `--role-*` tokens, never generic accent or info colors.
- Always reference `ui-rules.md` for component-level specs (cards, buttons,
  inputs, badges, etc.) — this file defines only the raw tokens and their
  usage reference, not component composition.
