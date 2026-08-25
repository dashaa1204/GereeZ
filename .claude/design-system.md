# GereeZ design system

Produced by the `ui-design` skill's system probe. Read this before designing
anything in this project.

## The product in one line

A Mongolian-language contract audit tool: a person uploads a contract, and the
product tells them what in it puts them at risk, grounded in Mongolian law.

## Themes

Light and dark, both shipped. `.dark` class variant (`@custom-variant dark`),
tokens defined in `app/globals.css` under `:root` and `.dark`. Tailwind v4 —
tokens are exposed to utilities through `@theme inline`, so `--risk-high`
becomes `bg-risk-high`, `text-risk-high`, `border-risk-high/25`.

There is no `tailwind.config.js`. Add tokens in `globals.css`, in both blocks.

## Color roles

Colors are `oklch()`. Never introduce a hex or an `emerald-*` / `zinc-*`
utility class — everything routes through a token.

| Token | Means | Never |
| --- | --- | --- |
| `--brand` | The one non-severity accent. Section eyebrows, active nav, supporting icons, icon chips. Emerald. | Anything that could be read as a risk state |
| `--brand-bright` | The same accent, for use **on `--panel`** where light-mode brand is too dim. Identical in both themes. | On normal page surfaces |
| `--panel` | The near-black emphasis surface the landing page leads with. Deliberately dark in **both** themes (dark mode *lifts* it so it still separates from the page). | As a generic card |
| `--risk-high / medium / low / info / ok` | The severity scale | Decoration, emphasis, brand |
| `--success`, `--warning` | Process outcomes | Severity — that's the risk scale's job |

**Two values per severity, and this is the system's central rule:**

- `--risk-*` is the **signal** — rails, dots, icons. Saturated.
- `--risk-*-ink` is the **text**, tuned for contrast on `--card`.
- Tints are derived with an opacity modifier (`bg-risk-high/10`), never a third
  token — that is why dark mode needs no second set of surfaces.

**One saturated mark per row.** `components/app/display.tsx#severityConfig`
returns five presentational roles per severity (`rail`, `ink`, `bg`, `border`,
`badge`, `icon`, `dot`) and a row is allowed to spend exactly one on color.
A rail *and* a tinted background *and* a badge is a defect, not emphasis.

Red and amber are reserved for risk. The accent is emerald precisely so it
never competes with them.

## Type

- Sans: Geist (`--font-sans`, via `next/font/google`). Headings use the same
  family (`--font-heading` aliases it).
- Mono: Geist Mono (`--font-mono`) — clause references, ids, legal article
  numbers. Not currency.
- UI copy is **Mongolian Cyrillic**. Budget extra width for every label and
  test the longest realistic string, not the English one.
- Currency via `fmt()` in `display.tsx` — `toLocaleString("mn-MN")` + `₮`.
- Observed treatments: section headings `text-lg font-bold tracking-tight`
  → `lg:text-xl`; descriptions `text-sm leading-relaxed text-muted-foreground`;
  eyebrows `text-xs font-semibold tracking-[0.14em] uppercase text-brand`.
- `text-balance` on headings, `text-pretty` on descriptions — already the
  convention, keep it.

## Space and shape

- `--radius: 0.625rem`, with a derived scale `--radius-sm` … `--radius-4xl`
  (multipliers 0.6 → 2.6). Cards and panels use `rounded-2xl`; icon chips
  `rounded-xl`; chips `rounded-full`.
- Cards: `border border-border bg-card rounded-2xl p-5`. Bordered, not shadowed.
- Shadow appears in exactly one place — under `Panel` — and it is a deep,
  tinted, offset shadow, not a generic elevation.
- Tailwind's default spacing scale, used at 1.5/2/4/5 steps most often.

## Components that already exist

**`components/app/kit.tsx`** — the shared vocabulary. Use these before writing
any wrapper of your own:

| Component | For |
| --- | --- |
| `Eyebrow` | Small uppercase brand label above a heading |
| `SectionHeading` | eyebrow + title + description + optional action |
| `Panel` | The near-black emphasis surface (carries its own grid texture, top highlight, border) |
| `PanelGlow` | The emerald bloom for a Panel corner |
| `Card` | Standard bordered content card |
| `IconChip` | Brand-tinted square holding one icon; `onPanel` switches to white/10 |
| `Chip` | Pill for a count or status — `muted` / `brand` / `onPanel` |

**`components/ui/`** — shadcn/ui primitives: `button`, `card`, `badge`, `tabs`,
`accordion`, `progress`, `separator`, plus local `LoadingSpinner`,
`ProgressRing`, `SettleIn`.

**`components/app/display.tsx`** — `severityConfig`, `confidenceConfig`,
`scoreColor`, `scoreLabel`, `fmt`. All severity and score presentation goes
through here. A screen that switches on severity itself has forked the system.

**Other app pieces:** `AppShell`, `TopNav`, `BottomNav`, `StatusBar`,
`ScoreRing`, `FindingRow`, `ContractUploadFlow`, `NotificationMenu`,
`ProfileMenu`, `ProposalCard`, `BrandMark`.

Landing page has its own set under `components/landing/`.

## Conventions observed in real screens

- Screens live in `components/app/screens/`, one file per screen, composed of
  `SectionHeading` + `Card`/`Panel` blocks.
- The home screen leads with a greeting, then **one sentence that says what the
  numbers mean** (`statusLine()`), ordered by urgency: risk → expiry → all
  clear. Copy the pattern: a screen states its conclusion in words before it
  shows figures.
- Stat figures stay in the page's ink **unless they carry a signal** — color
  appears only where something needs attention.
- Colors are passed to inline styles as CSS vars through `color-mix(in oklch,
  … , transparent)` (`tint()` in HomeScreen) rather than hardcoded tints.
- Navigation: top bar with two dropdowns on desktop (no sidebar — it was
  deliberately removed), bottom nav on mobile.
- Design drafts go in `.design-draft/` as standalone HTML before touching
  components. Four exist; match their conventions.
- Code comments in this project **explain design rationale**. Keep that up —
  when you make a non-obvious visual decision, say why in a comment.

## Motion

- `motion` (Framer) is a dependency; `tw-animate-css` for utility animations.
- Easing tokens: `--ease-settle` = `cubic-bezier(0.22, 1, 0.36, 1)` (the
  default), `--ease-snap` = `cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoot).
- Named animations in `globals.css`: `.animate-ring-glow` (600ms, settle, once
  — the score ring's arrival) and `.animate-shake` (300ms — input rejection).
- `SettleIn` is the shared entrance wrapper.
- Durations observed are 300–600ms for meaningful moments. Nothing loops.

## Base-layer notes

- Tailwind v4 preflight removes `cursor: pointer` from buttons; `globals.css`
  puts it back for `button`, `[role="button"]`, `label[for]`, `summary`. Don't
  re-add it per component.
- `* { @apply border-border outline-ring/50 }` — the default focus ring is
  already themed.

## Open gaps

Places the system has no answer yet, where a new design may deliberately
invent — and should then be recorded here:

- No documented empty-state pattern (each screen improvises one).
- No table primitive; data is presented as lists of rows.
- No chart system. `--chart-1..5` exist but are the shadcn defaults —
  undifferentiated grays, not a designed categorical palette.
- No toast/notification-surface pattern outside `NotificationMenu`.
- `--sidebar-*` tokens are vestigial; the sidebar was removed in `56fa0a9`.

---

Probed 2026-08-25 against `6c1e4dd`.
