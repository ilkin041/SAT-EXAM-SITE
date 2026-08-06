# Gradient audit — T0.6 (shared chrome)

Budget, from `CLAUDE.md`: **one gradient element per viewport.**

This audit covers T0.6, which changed only **shared chrome**: `AdminNav`, `StudentNav`,
`UserMenu`, `PageHeader`. Page-level gradients (dashboard hero, test cards, landing hero, the
gradient CTA buttons) are untouched and belong to **T1.8**.

## Counting rule

A "gradient element" is one rendered DOM element whose paint is a multi-stop gradient — a
`bg-gradient-*` background, a `text-gradient-*` clipped fill, or an inline `linear-gradient`.
Counted in the route's **default** state: hover-only gradients (`hover:from-*`) and the
`animated-gradient-bg` mesh are excluded, and a repeated card component counts once, not once
per instance.

## What changed

| Component | Before | After | Routes affected |
|---|---|---|---|
| `AdminNav` | 3 — navy header bar, indigo→violet logo mark, indigo→violet `ADMIN` badge | **1** — navy header bar only | all 15 admin |
| `StudentNav` | 1 — logo mark `from-primary to-primary/80` | **0** — solid `bg-primary` | `/dashboard`, `/account` |
| `UserMenu` | 1 — avatar `bg-gradient-primary` | **0** — solid `bg-primary` | `/dashboard`, `/account` |
| `PageHeader` | 1 — accent rule `from-primary to-primary/40` | **0** — solid `bg-primary` | 9 admin |

The navy bar is the one gradient kept: it is the admin section's entire budget, and it is the
only thing on the page carrying `--brand-navy`, which the policy reserves for admin chrome.

`admin-nav.tsx:20` also carried the last raw hex outside `src/app/test/attempt/**`
(`via-[#1e305e]`) behind an `eslint-disable`. It is now `via-brand-navy-light`, backed by a new
`--brand-navy-light` token in `globals.css` (`223 40% 24%` light / `223 38% 17%` dark) and mapped
in `tailwind.config.ts`. **The suppression is gone** — repo debt drops from 8 inline
suppressions to 7, and T9.6 no longer has a colour item.

## Admin routes (15)

All 15 render `AdminNav`. "Page" counts only gradients the route itself declares.

| Route | Chrome before | Page | Before | After |
|---|---|---|---|---|
| `/admin` | 3 + PageHeader 1 | 0 | 4 | **1** |
| `/admin/analytics/items` | 3 + PageHeader 1 | 0 | 4 | **1** |
| `/admin/attempts` | 3 + PageHeader 1 | 1 — `Filter` button | 5 | **2** |
| `/admin/attempts/[id]` | 3 | 0 | 3 | **1** |
| `/admin/groups` | 3 + PageHeader 1 | 0 | 4 | **1** |
| `/admin/groups/[id]` | 3 + PageHeader 1 | 0 | 4 | **1** |
| `/admin/import` | 3 + PageHeader 1 | 0 | 4 | **1** |
| `/admin/questions` | 3 + PageHeader 1 | 2 — `New question`, `Filter` | 6 | **3** ⚠ |
| `/admin/questions/new` | 3 | 0 | 3 | **1** |
| `/admin/questions/[id]` | 3 | 0 | 3 | **1** |
| `/admin/tests` | 3 + PageHeader 1 | 1 — `New test` button | 5 | **2** |
| `/admin/tests/new` | 3 | 0 | 3 | **1** |
| `/admin/tests/[id]` | 3 | 0 | 3 | **1** |
| `/admin/users` | 3 + PageHeader 1 | 0 | 4 | **1** |
| `/admin/users/[id]` | 3 | 0 | 3 | **1** |

Range: **3–6 before → 1–3 after.** 14 of 15 are at ≤2; 11 of 15 are at the budget of 1.

⚠ **`/admin/questions` is the one route still above 2.** It carries two
`bg-gradient-primary` buttons: `New question` (`page.tsx:91`) and `Filter` (`page.tsx:137`).
`--gradient-primary` is reserved for *the single primary CTA on a page*, so the `Filter` submit
is the violation — `New question` is the legitimate holder. Demoting `Filter` to a plain
`Button` on `/admin/questions:137` and `/admin/attempts:158` would put every admin route at ≤2
and take `/admin/questions` to 2. Both are page-level and **out of scope here; they belong to
T1.8.**

## Student routes

`StudentNav` (which nests `UserMenu`) renders on `/dashboard` and `/account`. Every student
route it is later added to inherits the −2.

| Route | Chrome before | Chrome after | Page | Before | After |
|---|---|---|---|---|---|
| `/account` | 2 | 0 | 0 | 2 | **0** |
| `/dashboard` | 2 | 0 | 6 — hero panel, greeting name, 2 stat numbers, `TestCard` rail, `TestCard` CTA | 8 | **6** |

`/dashboard` is still far over budget, but every remaining gradient is page-level and owned by
T1.8. The "6 above the fold" figure in `improvement-plan.md` counted only the page's own; with
chrome it was 8.

## Routes with no shared chrome — unchanged by T0.6

| Route | Gradients | Owner |
|---|---|---|
| `/` | 5 — logo mark, hero headline fill, section wash, feature-card icon+hover pair, step badge | T1.8 |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | 2 each — split-panel wash, logo mark | T1.8 / T4.1 |
| `/practice` | 1 — page wash | at budget |
| `/results/[attemptId]` | 4 — hero panel, 2 progress fills, CTA button | T1.8 |
| `/results/[attemptId]/review` | 0 | — |
| `/test/[testId]/start` | 0 | — |
| `/test/attempt/[attemptId]` | 0 | Bluebook chrome, exempt |

## Totals

| | Before | After |
|---|---|---|
| Routes over budget (>1 gradient) | 17 of 30 | **8 of 30** |
| Admin routes over budget | 15 of 15 | **4 of 15** |
| Gradient elements from shared chrome | 6 across 4 components | **1** |

## Noted, not fixed

- `Button`'s `gradient` variant (`button.tsx:44`, `from-indigo-500 to-violet-500`) has **zero
  call sites**. Every gradient button in the app hand-rolls `className="bg-gradient-primary …"`
  instead. Either the variant becomes the one way to do this, or it is dead code. T1.8.
- `EmptyState` uses `bg-gradient-to-br from-card/80 to-muted/30` — a surface tint, not a brand
  gradient. Left alone; if the budget is read strictly it should become a flat `bg-muted/20`.
- `globals.css` still lists `.from-indigo-500 :focus-visible` in the saturated-fill focus
  override. It is now only reachable through the unused `Button` gradient variant; it goes when
  that variant does.
