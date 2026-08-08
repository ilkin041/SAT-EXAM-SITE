# Gradient audit — T0.6 (shared chrome) + T1.8 (pages)

Budget, from `CLAUDE.md`: **one gradient element per viewport.**

Two passes. **T0.6** changed only shared chrome — `AdminNav`, `StudentNav`, `UserMenu`,
`PageHeader` — and took the routes over budget from 17 to 8. **T1.8** changed the pages
themselves: the dashboard hero, the landing hero, the results panel, the auth panels, and every
hand-rolled `bg-gradient-primary` button. **Every route is now at or under 1 above the fold.**

## Counting rule

A "gradient element" is one rendered DOM element whose paint is a multi-stop gradient — a
`bg-gradient-*` background, a `text-gradient-*` clipped fill, or an inline `linear-gradient`.
Counted in the route's **default** state: hover-only gradients (`hover:from-*`) and the
`animated-gradient-bg` mesh are excluded, and a repeated card component counts once, not once
per instance.

Two things this rule has never counted, unchanged here: the 2px fade-to-transparent hairlines on
`/` (the step connector at `page.tsx:228`, the footer rule at `:294`) and the radial dot textures.
They are texture, not a signature — they carry no brand colour at full strength and no element
reads as "the gradient thing" because of them.

---

# T1.8 — page-level sweep

## Where each route's one gradient went

| Route | Kept | Why that one |
|---|---|---|
| `/` | ~~`Sign Up Free` hero CTA (`Button variant="accent"`)~~ → **the demo panel's top rail** (T3.4) | Was the single primary CTA. T3.4 made `LiveQuestionDemo` the hero, and policy allows `--gradient-primary` to be the CTA *or* the hero signature: the signature is now something you can use, so the CTA is flat `primary`. Measured after: 1 counted gradient in the fold at 1280×800, 0 at 360px (the rail is below it) |
| `/dashboard` | `TestCard` left accent strip above the fold; `--gradient-warm` on `Continue test` in the history table below it | `--gradient-warm` is reserved for resume, and this is the dashboard's resume affordance. The strip is kept by instruction — see the residual note |
| `/results/[attemptId]` | The `ScoreDial` ring | Policy allows `--gradient-primary` to be the score gauge **or** the hero signature; the gauge is the reason the page exists |
| all 15 `/admin/*` | The `AdminNav` navy bar | `--brand-navy` is admin chrome and nothing else on the page carries it |
| `/practice` | Page wash | Already at budget; untouched |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | none | The panel is now flat `--primary`, which is the point — see below |

## Changes, route by route

### `/dashboard` — 6 → 2 (1 above the fold)

| Element | Before | After |
|---|---|---|
| Hero banner (`page.tsx:109`) | `bg-gradient-hero` | `bg-paper-sunk` — the editorial recessed sheet, inverted in dark |
| Greeting name (`:127`) | `text-gradient-primary` | `text-primary` |
| Avg-score figure (`:145`) | `text-gradient-primary` | `text-foreground` |
| Best-score figure (`:152`) | `text-gradient-accent` | `text-foreground` |
| `TestCard` "Start test" (`test-card.tsx:196`) | `variant="secondary"` + a `TODO(T1.8)` | `variant="soft"` |
| `TestCard` "Continue test" (`test-card.tsx:142`) | `bg-gradient-warm` | solid `primary` |
| `TestCard` left accent strip (`test-card.tsx:72`) | `bg-gradient-primary` | **kept** |
| History row actions (`page.tsx:335`–`:349`) | `secondary` / warm gradient / `secondary`, all `sm` | `soft` / **warm gradient kept** / `secondary`, all `xs` |

The three stat figures were three different colours for three numbers that mean the same kind of
thing. They are one colour now; the greeting carries the page's only tinted text.

**Residual: 2, by instruction — 1 above the fold.** The accent strip and the warm resume button are
both kept: the strip is a 6px rule that costs nothing and marks the card, the warm button is the
one gradient the policy actually assigns to resume.

Measured at 1280×800 on a seeded admin account with 5 visible tests: the first row of `TestCard`s
clears the fold, so **the accent strip is the one gradient above it** — the hero banner, the
greeting and the three stat figures are all flat now, so nothing competes with it. The warm resume
button is two sections further down, in the history table, and only renders when an attempt is
`IN_PROGRESS`; it never shares a viewport with the card rail at 360px, and at 1280px it would take
a longer test list than the seed has. Verified: `scrollWidth === innerWidth` at 360px.

### `/` — 5 → 1

| Element | Before | After |
|---|---|---|
| Header logo mark (`:36`) | `bg-gradient-to-br from-primary to-primary/80` | `bg-primary`, matching the `StudentNav` / `UserMenu` marks T0.6 flattened |
| H1 second clause (`:88`) | `text-gradient-primary` on a `<span>` | span removed; the whole headline is `text-ink` |
| Hero CTA (`:115`) | `variant="accent"` | **kept** — the page's one gradient |
| CTA-banner wash (`:260`) | `bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5` | flat `bg-primary/5` |
| CTA-banner button (`:271`) | `variant="accent"` | `primary` (solid) |
| `Feature` icon tile ×3 (`:356`) | `bg-gradient-to-br ${gradient}` | flat `${tint}` |
| `Feature` hover wash ×3 (`:351`) | same two-stop gradient | same flat tint |
| `Step` number badge ×3 (`:383`) | `bg-gradient-to-br from-primary to-primary/80` | `bg-primary` |

`Feature`'s `gradient` prop is now `tint` and takes one flat class (`bg-blue-500/10`), shared by
the icon tile and the hover wash — the two were always the same two stops anyway.

### `/results/[attemptId]` — 4 → 1

| Element | Before | After |
|---|---|---|
| Hero panel (`:166`) | `bg-gradient-hero` | `bg-paper-sunk` |
| `ScoreDial` ring | gradient | **kept** |
| R&W section bar (`:195`) | `barClassName="bg-gradient-primary"` | no `barClassName` — `Progress` grades it |
| Math section bar (`:201`) | `barClassName="bg-gradient-accent"` | no `barClassName` — `Progress` grades it |
| `Review all answers` CTA (`:277`) | hand-rolled `bg-gradient-primary` | default `primary` |

The Math bar was the app's only live use of `--gradient-accent`, which `CLAUDE.md` leaves
**UNASSIGNED**. It is now unused again in `.tsx`, as intended — the token still exists and still
needs a decision before anything claims it.

Dropping both fills is also a readability win, not just a budget one: with no `barClassName`, both
section bars grade on the product's one scale (`gradeOf()`, emerald ≥75 / blue ≥50 / amber ≥25 /
red below), so R&W and Math read against each other instead of against two brand colours. The
`SectionScore` helper lost its now-unused `progressColor` prop.

### Auth pages — 2 each → 0

Identical change in all four (`/login`, `/signup`, `/forgot-password`, `/reset-password`):

| Element | Before | After |
|---|---|---|
| Left brand panel | `bg-gradient-to-br from-primary via-primary/90 to-violet-600` | `bg-primary` |
| Header logo mark | `bg-gradient-to-br from-primary to-primary/80` | `bg-primary` |
| Lower decorative orb | `bg-violet-400/20` | `bg-white/10` |

The violet orb went too. Flattening the wash but leaving a violet bloom on top of it would have
kept exactly the cast the change exists to remove: the panel and the form's `Sign in` button are
now provably the same blue, which is the whole point. **Coordinated with T4.1 — the colour
unification is here, the layout is there.**

The `.dot-lattice` overlay is unchanged and is not a counted gradient (it is a radial dot texture,
same class as the hero dot fields).

### Admin — the four hand-rolled gradient buttons

The T0.6 audit flagged these and parked them here.

| File | Button | After |
|---|---|---|
| `admin/questions/page.tsx:93` | `New question` | default `primary` |
| `admin/questions/page.tsx:151` | `Filter` | `variant="soft"` |
| `admin/attempts/page.tsx:167` | `Filter` | `variant="soft"` |
| `admin/tests/page.tsx:47` | `Create test` (empty state) | default `primary` |

Both `Filter` submits took `soft` rather than `secondary`: a filter bar's submit is the primary
action *of that bar* and should not read as disabled next to the `Clear` ghost, but it is not the
primary action of the page — which is exactly the gap `soft` exists to fill.

All four dropped `hover:glow-primary` and the `text-white border-transparent` overrides with the
gradient; `primary` already carries `hover:shadow-glow`.

**Every admin route is now at exactly 1** (the navy bar), down from the 1–3 T0.6 left.

## `Button` — `soft` and `xs`

```
soft   border border-primary/20 bg-primary/10 text-primary
       hover:bg-primary/15 hover:border-primary/30 hover:-translate-y-0.5
xs     h-8 gap-1.5 px-3 text-xs
```

`soft` is the **repeated-list action**. A rail of five `primary` cards fights itself for attention;
a rail of five `secondary` ones reads as disabled. `soft` sits between: still "the primary action
of this card", quiet enough that the page keeps one real primary. No gradient, no shadow, no
`_CLS` constant at the call site.

`xs` is for table rows and dense toolbars, where `sm`'s `h-9` already crowds the row. Both are in
the `/ui` gallery, `soft` with a three-card rail specimen showing what it is for.

This also resolves the T0.6 note that `Button`'s `accent` variant had **zero call sites**. It has
one now — the `/` hero CTA — and it is the only gradient button left in the app. `globals.css`'s
`.from-indigo-500 :focus-visible` override stays with it.

**T3.4 update: `accent` is back to zero call sites.** The `/` hero CTA became flat `primary` when
the demo panel took the page's one gradient, so there is now no gradient button anywhere in the
app. The variant and its focus-ring override are kept — the next thing that wants a gradient button
has to argue for it against the route's budget first, which is the point.

## Totals

| | Before T0.6 | After T0.6 | After T1.8 |
|---|---|---|---|
| Routes over budget above the fold | 17 of 30 | 8 of 30 | **0 of 30** |
| Admin routes above budget | 15 of 15 | 4 of 15 | **0 of 15** |
| Gradient elements from shared chrome | 6 across 4 components | 1 | 1 |
| Hand-rolled `bg-gradient-*` buttons | 6 | 6 | **0** |
| Live uses of `--gradient-accent` | 2 | 2 | **0** |

## Noted, not fixed

- **`EmptyState`** still uses `bg-gradient-to-br from-card/80 to-muted/30` — a surface tint, not a
  brand gradient, and the same call the T0.6 audit made. Read strictly it should be a flat
  `bg-muted/20`; it would take any route showing an empty state to 2. Left alone deliberately, but
  it is the last one-line change between the app and a strict reading of the budget.
- **`/ui`** shows gradient specimens by construction — `Button variant="accent"` and the
  `Progress barClassName="bg-gradient-primary"` demo in `progress-section.tsx:37`. A gallery that
  hid the treatments it documents would be useless. Not counted.
- **`globals.css:291`** lists `.from-primary :focus-visible` in the saturated-fill focus override.
  No element carries `from-primary` any more (the auth panels were the last), so that selector is
  now unreachable. Harmless, one line, not worth a separate change here.
- **The `/` hairlines** (`page.tsx:228`, `:294`) are still inline `linear-gradient`. See the
  counting rule — texture, never counted, unchanged since before T0.6.

---

# T0.6 — shared chrome (historical)

| Component | Before | After | Routes affected |
|---|---|---|---|
| `AdminNav` | 3 — navy header bar, indigo→violet logo mark, indigo→violet `ADMIN` badge | **1** — navy header bar only | all 15 admin |
| `StudentNav` | 1 — logo mark `from-primary to-primary/80` | **0** — solid `bg-primary` | `/dashboard`, `/account` |
| `UserMenu` | 1 — avatar `bg-gradient-primary` | **0** — solid `bg-primary` | `/dashboard`, `/account` |
| `PageHeader` | 1 — accent rule `from-primary to-primary/40` | **0** — solid `bg-primary` | 9 admin |

`admin-nav.tsx:20` also carried the last raw hex outside `src/app/test/attempt/**`
(`via-[#1e305e]`) behind an `eslint-disable`. It became `via-brand-navy-light`, backed by a
`--brand-navy-light` token in `globals.css` (`223 40% 24%` light / `223 38% 17%` dark) and mapped
in `tailwind.config.ts`.

## Per-route counts

Admin (all 15 render `AdminNav`; "page" counts only what the route itself declares):

| Route | Before T0.6 | After T0.6 | After T1.8 |
|---|---|---|---|
| `/admin` | 4 | 1 | **1** |
| `/admin/analytics/items` | 4 | 1 | **1** |
| `/admin/attempts` | 5 | 2 | **1** |
| `/admin/attempts/[id]` | 3 | 1 | **1** |
| `/admin/groups` | 4 | 1 | **1** |
| `/admin/groups/[id]` | 4 | 1 | **1** |
| `/admin/import` | 4 | 1 | **1** |
| `/admin/questions` | 6 | 3 | **1** |
| `/admin/questions/new` | 3 | 1 | **1** |
| `/admin/questions/[id]` | 3 | 1 | **1** |
| `/admin/tests` | 5 | 2 | **1** |
| `/admin/tests/new` | 3 | 1 | **1** |
| `/admin/tests/[id]` | 3 | 1 | **1** |
| `/admin/users` | 4 | 1 | **1** |
| `/admin/users/[id]` | 3 | 1 | **1** |

Everything else:

| Route | Before T0.6 | After T0.6 | After T1.8 |
|---|---|---|---|
| `/` | 5 | 5 | **1** |
| `/account` | 2 | 0 | **0** |
| `/dashboard` | 8 | 6 | **2** (1 above the fold) |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | 2 each | 2 each | **0** |
| `/practice` | 1 | 1 | **1** |
| `/results/[attemptId]` | 4 | 4 | **1** |
| `/results/[attemptId]/review` | 0 | 0 | **0** |
| `/test/[testId]/start` | 0 | 0 | **0** |
| `/test/attempt/[attemptId]` | 0 | 0 | **0** (Bluebook chrome, exempt) |
</content>
</invoke>
