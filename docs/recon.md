# Codebase recon & plan validation (T0.1)

**Date:** 2026-08-06 · **Commit:** `868db51` · **Branch:** `master`
**Scope:** read-only audit of the codebase against `docs/improvement-plan.md`. No source file was modified.
**Companion:** `docs/baselines.md` (build + bundle numbers).

---

## 0. Read this part first — where the plan is wrong about this codebase

The plan is a screen-by-screen read of a *deployed* app plus an architecture doc. Since it was
written, four commits (`12fe5eb` → `868db51`) landed work that the plan does not know about.
Several of its headline diagnoses are now stale, and a few of its code snippets will not compile
against the current schema.

| # | Plan says | Actually |
|---|---|---|
| **W1** | Routes live in `app/(student)/…`, `app/(marketing)/…`, `app/admin/…` (§0.1) | There are **no route groups at all**. Routes are `src/app/dashboard`, `src/app/results/…`, `src/app/login`. Every path in §0.1 is wrong, and `app/` is `src/app/`. |
| **W2** | P5: dashboard shows `AVG 415 / BEST 430` polluted by section-only attempts; ship `scoreScope` (§4.1.2, Quick win 2) | **Already fixed, differently.** `getScoreFidelity()` (`src/lib/scoring.ts:117`) returns `INCOMPLETE` when either section has 0 questions; dashboard avg/best filter to `FULL_LENGTH` only (`src/app/dashboard/page.tsx:75-84`); the results page refuses to render a total for `INCOMPLETE`. A `scoreScope` enum would now be a *second, conflicting* policy. Rescope to "label ESTIMATE attempts better", not "add scoreScope". |
| **W3** | P4: "no try-without-account path", "no demo" | `/practice` exists and is public; `src/lib/anonymous-attempt.ts` issues an HMAC-signed HTTP-only cookie binding an anonymous attempt to one browser; middleware whitelists `/practice`, `/test/`, `/results/`. A logged-out visitor can already take a **full** public test. What's missing is the *3-question hero demo*, not the anonymous path. §2.2 gets much cheaper as a result. |
| **W4** | §2.3 stats query uses `question.published` and `test.visibility: 'PUBLIC'` | Neither field exists. `Question` has no publish state at all; `Test` uses `isPublic: Boolean`. The snippet in §2.3 will not compile. Also `Test.mode` defaults to **`ADAPTIVE`**, not LINEAR. |
| **W5** | §2.2 demo loads questions with a `PUBLIC_DEMO` flag "on the question record" | No such field, and adding one is a schema migration the plan lists as free. |
| **W6** | "No progress over time anywhere" (§1.2 Dashboard) | `src/components/score-trend.tsx` renders a hand-rolled SVG trend on the dashboard, fed by `computeAttemptScorePoint`. A dedicated `/progress` route is still missing, but the primitive and the data shape exist. |
| **W7** | §9.2 question-quality analytics is greenfield | `/admin/analytics/items` exists with p-value, distractor frequency, mean time, and `TOO_EASY` / `TOO_HARD` / `DISTRACTOR_OUTDRAWS_KEY` flags (`src/lib/analytics.ts:43`). **Discrimination index is the one thing genuinely missing**, and it is the one the plan correctly calls highest-value. |
| **W8** | §1.2 Landing: `Digital SAT Practice ,` stray space; `∞` glyph baseline (Quick wins 1 & 8) | Both already fixed. The H1 reads `Digital SAT Practice,{" "}` and the stats tile is `Free / Sample Test`. Two of fourteen quick wins are done. |
| **W9** | Commands are `pnpm build` / `pnpm typecheck` / `pnpm test:e2e` | Repo is **npm** (`package-lock.json`, no pnpm installed). There is **no `typecheck` script**, no Playwright, no `analyze` script. `pnpm typecheck` in the CLAUDE.md definition of done cannot pass because it cannot run. |
| **W10** | CLAUDE.md (derived from §2.3/§1.1) states the type-scale tokens, `--ink`/`--paper`, `.tabular`, IBM Plex Mono, and a global `prefers-reduced-motion` block already exist in `globals.css` | **None of them exist.** `globals.css` has colour, gradient, glass, glow and transition tokens only. CLAUDE.md is describing the *target* state as if it were current, which will mislead every future task. |
| **W11** | Test interface is "~1,500 lines in one component" | It's 1,589 lines across two files (`test-interface.tsx` 715 + `test-interface-components.tsx` 874) plus 5 extracted client islands. Already partially split; §6.1's "<300 lines each" target is still far off but the starting point is better than described. |
| **W12** | "52 tasks in the roadmap" (this prompt) | The plan contains **no task IDs** and no 52 anything. Counting leaf-numbered work items gives **60** (`0.1`–`10.4`, splitting `4.1.x` and `5.x.x`). CLAUDE.md's "you will be given a task prompt with an ID like `T2.4`" describes a scheme that does not exist in the plan. §7 below validates all 60. |

**One more, not in the plan but load-bearing:** `globals.css:148` sets `:focus-visible { outline: none }`
globally with **no replacement ring** in the base layer. `Button` re-adds its own ring, but every
raw `<button>`, `<a>`, `<select>` and `<input>` outside a primitive currently has **no visible
keyboard focus indicator**. That is a WCAG 2.4.7 failure across the whole app today, and it is
more urgent than anything in Phase 0.

---

## 1. Route inventory

`src/app/` — 30 rendered routes + 24 API handlers. **No route groups, no `layout.tsx` below root
except `/admin`, no `loading.tsx`, no `error.tsx`, no `not-found.tsx`, no `global-error.tsx`,
no `sitemap.ts`, no `robots.ts`.**

"Largest component file" = the biggest `.tsx` in that route's own folder, or the biggest client
island it imports.

### Marketing / public

| Route | Kind | Page LOC | Largest component file |
|---|---|---|---|
| `/` | server | 460 | `src/app/page.tsx` — 460 (all sub-components inline) |
| `/practice` | server (`force-dynamic`) | 130 | `src/app/practice/page.tsx` — 130 |

### Auth

| Route | Kind | Page LOC | Largest component file |
|---|---|---|---|
| `/login` | server shell + client form | 83 | `login-form.tsx` — 95 **(client)** |
| `/signup` | server shell + client form | 78 | `signup-form.tsx` — 170 **(client)** |
| `/forgot-password` | server shell + client form | 75 | `forgot-form.tsx` — 79 **(client)** |
| `/reset-password` | server shell + client form | 77 | `reset-form.tsx` — 147 **(client)** |

### Student

| Route | Kind | Page LOC | Largest component file |
|---|---|---|---|
| `/dashboard` | server | 320 | `src/components/test-card.tsx` — 159 **(client)** |
| `/account` | server | 64 | `account-forms.tsx` — 277 **(client)** |
| `/results/[attemptId]` | server | 527 | `src/app/results/[attemptId]/page.tsx` — 527 |
| `/results/[attemptId]/review` | server shell | 99 | `review-client.tsx` — 563 **(client)** |
| `/test/[testId]/start` | server | 250 | `begin-button.tsx` — 63 **(client)** |
| `/test/attempt/[attemptId]` | server shell (46) | 46 | `test-interface-components.tsx` — **874 (client)**; `test-interface.tsx` — **715 (client)** |

### Admin (all server pages under `src/app/admin/layout.tsx`, 13 LOC)

| Route | Kind | Page LOC | Largest component file |
|---|---|---|---|
| `/admin` | server | 124 | — |
| `/admin/analytics/items` | server | 312 | — |
| `/admin/attempts` | server | 289 | — |
| `/admin/attempts/[id]` | server | 140 | — |
| `/admin/groups` | server | 93 | — |
| `/admin/groups/[id]` | server | 226 | — |
| `/admin/import` | server (16) | 16 | `import-form.tsx` — **506 (client)** |
| `/admin/questions` | server | 223 | `questions-table.tsx` — **554 (client)** |
| `/admin/questions/new` | server | 55 | `question-form.tsx` — **587 (client)** |
| `/admin/questions/[id]` | server | 150 | `question-form.tsx` — **587 (client)** |
| `/admin/tests` | server | 125 | `duplicate-test-button.tsx` — 103 (client) |
| `/admin/tests/new` | server (17) | 17 | `new-test-form.tsx` — 118 (client) |
| `/admin/tests/[id]` | server | 99 | `section-editor.tsx` — **314 (client)** |
| `/admin/users` | server | 143 | — |
| `/admin/users/[id]` | server | 208 | — |

### API (all server)

24 handlers under `src/app/api/`. Largest: `admin/import` 304, `admin/export/attempts` 159,
`admin/upload-image` 128, `tests/[id]/start` 108, `ai/explain` 96.

### Architecture-rule compliance

No `"use client"` on any `page.tsx` or `layout.tsx` — the RSC-first rule in CLAUDE.md holds
everywhere. Client islands are named by convention (`*-form.tsx`, `*-client.tsx`, `*-table.tsx`)
but **do not follow the documented `*Client.tsx` / `client/` naming**; the codebase is
kebab-case throughout while CLAUDE.md specifies `ComponentName.tsx`. Two conventions, one
codebase — pick one before Phase 1 or the new primitives will drift on filename alone.

---

## 2. Primitive inventory — `src/components/ui/`

Six files. The plan's §1.2 asks for 17. Nothing here is a Radix wrapper except via `Slot`.

| Primitive | LOC | Variants | Sizes | Files importing it |
|---|---|---|---|---|
| `Button` | 107 | `primary` (default), `secondary`, `destructive`, `ghost`, `link`, `accent` | `sm`, `default`, `lg`, `icon` | **25** |
| `Badge` | 47 | `default`, `secondary`, `outline`, `muted`, `success`, `warning`, `info`, `purple`, `destructive` | — | 13 |
| `Input` | 29 | none | none | 10 |
| `EmptyState` | 54 | none (`icon`, `title`, `description`, `action` props) | none | 10 |
| `PageHeader` | 42 | none | none | 9 (admin only) |
| `StatCard` | 84 | `accentColor`: blue / emerald / violet / amber (prop, not CVA) | none | 6 |

**Missing from §1.2 entirely:** `Select`, `Table`, `DataTable`, `Modal`, `Tabs`, `Tooltip`,
`Skeleton`, `Progress`, `Alert`, `SegmentedControl`, `Sheet`, `Pagination`, `Avatar`,
`ScoreDial`, `DomainBar`, `Field`, `Separator`, `ThemeToggle`.

**Radix packages installed:** `react-dialog`, `react-dropdown-menu`, `react-label`, `react-slot`.
`Select`, `Tabs`, `Tooltip`, `Accordion`, `Popover`, `Progress`, `Toggle-group` are **not
installed** — §1.2 and §2.6 each add dependencies the plan doesn't budget for.

### Feature components outside `ui/` that are de-facto primitives

`toast.tsx` (74, client, context-based), `delete-question-modal.tsx` (181),
`admin-reset-password-modal.tsx` (183) — two hand-rolled Radix Dialogs that a `Modal` primitive
would collapse. `test-card.tsx` embeds a *third*. `dark-mode-toggle.tsx` (43) is the bare `☀/☾`
button §1.3 calls out; it has an `aria-label` already, but it is binary (no system state) and
there is no blocking theme script in `layout.tsx`, so every page loads light and flips on hydration.

---

## 3. Drift report

### 3.1 `SELECT_CLS`-style class constants — 3 declarations, 7 usages

| File | Line | Note |
|---|---|---|
| `src/app/admin/questions/page.tsx` | **25** (decl) | used at 108, 113, 118, 125 |
| `src/app/admin/attempts/page.tsx` | **111** (decl) | used at 144, 151 |
| `src/app/admin/users/page.tsx` | **12** (decl) | used at 66 |

Three independent copies of the same string. Confirms P6 exactly.

### 3.2 Hand-rolled `<table>` — 13 instances, zero shared markup

| File | Line |
|---|---|
| `src/app/admin/analytics/items/page.tsx` | 204 |
| `src/app/admin/attempts/page.tsx` | 177 |
| `src/app/admin/groups/page.tsx` | 54 |
| `src/app/admin/groups/[id]/page.tsx` | 134, 198 |
| `src/app/admin/import/import-form.tsx` | 446 |
| `src/app/admin/page.tsx` | 62 |
| `src/app/admin/questions/_components/questions-table.tsx` | 234 |
| `src/app/admin/tests/page.tsx` | 57 |
| `src/app/admin/users/page.tsx` | 94 |
| `src/app/admin/users/[id]/page.tsx` | 114 |
| `src/app/dashboard/page.tsx` | 218 |
| `src/app/results/[attemptId]/page.tsx` | 400 |

The plan says "5 hand-rolled tables" (Appendix C). It is 13, and **two are on student
surfaces** (dashboard history, results domain table), which §1.3 doesn't mention. Every one of
them repeats its own `thead`/zebra/padding recipe.

### 3.3 Raw hex in `.tsx` — 5

| File | Line | Value | Verdict |
|---|---|---|---|
| `src/components/admin-nav.tsx` | 20 | `via-[#1e305e]` | **Fix.** Should be a token; it's the admin chrome mid-stop. |
| `src/app/test/attempt/[attemptId]/test-interface-components.tsx` | 79 | `bg-[#f4f5f7]` | **Keep.** Bluebook-accurate top bar. Should become a test-scoped token, not a global one. |
| same | 219 | `bg-[#1a237e]` | **Keep** (practice banner navy). Same treatment. |
| same | 815 | `bg-[#121212]` | **Keep** (duplicate-tab lock overlay). |
| same | 820 | `bg-[#1a1a1a]` | **Keep.** |

Plus `globals.css:359-360` hardcodes `#f4f5f7` / `#dc2626` inside `timer-critical-pulse`.
The test interface deliberately ignores the theme (documented in `dark-mode-toggle.tsx`), so a
blanket "no raw hex" lint rule (§0.5) **will fire on correct code**. It needs a per-directory
exemption for `src/app/test/attempt/**` or a `--test-*` token set first.

### 3.4 Inline `style={{}}` — 18, of which 10 carry colour

Colour-bearing (would violate the CLAUDE.md rule as written):

| File | Line | What |
|---|---|---|
| `src/app/page.tsx` | 60, 157 | dot-lattice `radial-gradient(... hsl(var(--foreground)) ...)` |
| `src/app/page.tsx` | 221 | step connector `linear-gradient(... hsl(var(--primary)/0.2) ...)` |
| `src/app/page.tsx` | 285 | footer rule `linear-gradient(... hsl(var(--ring)/0.2) ...)` |
| `src/app/dashboard/page.tsx` | 97 | dot lattice |
| `src/app/login/page.tsx` | 17 | `rgba(255,255,255,0.8)` — **raw rgb in tsx** |
| `src/app/signup/page.tsx` | 15 | `rgba(255,255,255,0.8)` — **raw rgb** |
| `src/app/forgot-password/page.tsx` | 15 | `rgba(255,255,255,0.8)` — **raw rgb** |
| `src/app/reset-password/page.tsx` | 16 | `rgba(255,255,255,0.8)` — **raw rgb** |
| `src/components/ui/empty-state.tsx` | 29 | dot lattice, token-based |
| `src/components/ui/stat-card.tsx` | 52 | `hsla(228,60%,50%,0.03)` — **raw hsla, hardcoded hue** |

Legitimately dynamic (not colour, keep): `results/[attemptId]/page.tsx:362,435,517` (bar widths),
`resizable-split.tsx:108,136` (split %), `desmos-calculator.tsx:152` (drag position),
`annotated-passage.tsx:287` (popup position).

The four auth pages are the same dot-lattice copy-pasted four times — one component, four files.

### 3.5 Classes that silently do nothing (not in the plan; found here)

These are typos against Tailwind 3's scale. They compile, produce no CSS, and make the UI look
subtly off for a reason nobody can find.

| Class | Occurrences | Where | Why it's dead |
|---|---|---|---|
| `shadow-xs` | 13 | dashboard, results, admin, test-card, badges | Tailwind 3 has no `xs` shadow (that's v4). `tailwind.config.ts:62-78` doesn't define it. |
| `py-4.5` | 5 | `dashboard/page.tsx:248,249,269,278,285` — **every history-table cell** | No `4.5` in the default spacing scale. The history table has *zero* vertical cell padding. |
| `h-4.5 w-4.5` | 3 | `page.tsx:372`, `results/page.tsx:305`, `student-nav.tsx:24` | Icons render at intrinsic size. |
| `text-emerald-350`, `text-blue-350` | 2 | `results/[attemptId]/page.tsx:324,325` | No `350` shade exists. **Dark-mode performance-tier pills have no text colour** and inherit — likely a contrast failure. |
| `bg-primary/8` | 1 | `page.tsx:371` | Valid in 3.3+; noted only for consistency (`/8` used nowhere else). |

The `py-4.5` one is the highest-value five-minute fix in this document.

### 3.6 Design-token gaps vs. what CLAUDE.md claims exists

| CLAUDE.md / plan claims | Reality in `globals.css` / `tailwind.config.ts` |
|---|---|
| `--ink`, `--paper`, `--paper-sunk` | absent |
| `--text-display/h1/h2/h3/body-lg/body/caption/eyebrow` | absent |
| `.tabular` utility, `.eyebrow` utility | absent — 32 files hand-roll `tabular-nums`, 24 hand-roll `font-mono` |
| IBM Plex Mono via `next/font` as `--font-mono` | absent. `layout.tsx` loads Plus Jakarta Sans only; `tailwind.config.ts` defines no `fontFamily.mono`, so all 24 `font-mono` usages fall back to the browser default monospace |
| global `prefers-reduced-motion` block | **absent** — and `float`, `pulse-glow`, `gradient-shift`, `shimmer` are all infinite loops that currently run for everyone |
| `--accent-pop`, `--accent-warm` usable as Tailwind colours | defined in CSS, **not mapped** in `tailwind.config.ts` → `text-accent-warm` / `bg-accent-pop` don't exist |
| `success` / `warning` semantic colours | mapped ✅ |
| ESLint guardrails (§0.5) | **there is no ESLint config at all** — no `.eslintrc*`, no `eslintConfig` in `package.json`. `npm run lint` drops into Next's interactive "How would you like to configure ESLint?" setup prompt and lints nothing. §0.5 has to *create* linting before it can add rules. |

---

## 4. Gradient audit

Counted per route as *gradient-filled or gradient-text elements rendered on initial load*,
including shared chrome. Budget per CLAUDE.md: **1 per viewport**.

### Shared chrome (charged to every route that uses it)

| Component | Gradient elements | Used by |
|---|---|---|
| `StudentNav` | logo mark (`from-primary to-primary/80`) | `/dashboard`, `/account` |
| `UserMenu` (inside StudentNav) | avatar circle (`bg-gradient-primary`) | same |
| `AdminNav` | header bar (`from-brand-navy via-#1e305e`), logo mark (`from-indigo-500 to-violet-600`), `ADMIN` badge (same) = **3** | all 15 admin routes |
| `PageHeader` | decorative accent rule (`from-primary to-primary/40`) | 9 admin routes |
| `Button variant="accent"` | `from-indigo-500 to-violet-500` fill | wherever used |
| `EmptyState` | card wash `from-card/80 to-muted/30` + dot lattice | 10 routes |

### Per route

| Route | Total | Above the fold | Over budget? | The offenders |
|---|---|---|---|---|
| **`/`** | **~14** | **4** | 🔴 **4×** | `page.tsx`: 28 logo · 57 `animated-gradient-bg` (15s infinite) · 81 H1 `text-gradient-primary` · 109 accent CTA · 253 CTA-band wash · 263 second accent CTA · 286 footer rule · 338 feature icon tiles ×3 · 365 step badges ×3 · 222 step connector |
| **`/dashboard`** (5 tests) | **~17** | **6** | 🔴 **6×** | StudentNav logo · UserMenu avatar · 91 `bg-gradient-hero` banner · 109 name gradient text · 127 avg-score gradient text · 134 best-score gradient text · then per card: `test-card.tsx:61` accent strip + `:149` full-width `bg-gradient-primary` "Start test" (**2 × 5 = 10**) · `dashboard:294` `bg-gradient-warm` Continue |
| **`/results/[attemptId]`** | **5** | **4** | 🔴 **4×** | 162 `bg-gradient-hero` · 223 R&W bar `bg-gradient-primary` · 230 Math bar `bg-gradient-accent` · 302 `bg-gradient-primary` CTA (+ domain bars below fold) |
| **`/login`** | **2** | **2** | 🟠 2× | 13 panel `from-primary via-primary/90 to-violet-600` · 54 logo mark. Exactly the "two different blues" §1.2 describes — panel is a gradient, `Sign in` is solid `bg-primary`. |
| **`/signup`** | 2 | 2 | 🟠 2× | 12 panel · 51 logo |
| **`/forgot-password`** | 2 | 2 | 🟠 2× | 12 panel · 47 logo |
| **`/reset-password`** | 2 | 2 | 🟠 2× | 13 panel · 48 logo |
| **`/practice`** | 2 | 2 | 🟠 2× | 39 page wash `from-primary/5` · EmptyState wash (conditional) |
| **`/admin/questions`** | **6** | **6** | 🔴 6× | AdminNav ×3 · PageHeader rule · 88 `bg-gradient-primary` New · 134 `bg-gradient-primary` Filter |
| **`/admin/attempts`** | 5 | 5 | 🔴 5× | AdminNav ×3 · PageHeader rule · 159 `bg-gradient-primary` Filter |
| **`/admin/tests`** | 5 | 5 | 🔴 5× | AdminNav ×3 · PageHeader rule · 46 `bg-gradient-primary` New |
| other `/admin/*` (9 routes) | 4 | 4 | 🔴 4× | AdminNav ×3 · PageHeader rule |
| `/admin/tests/[id]`, `/admin/questions/[id]`, `/admin/questions/new` | 3 | 3 | 🔴 3× | AdminNav ×3 (no PageHeader) |
| `/results/[attemptId]/review` | 1 | 1 | ✅ | `review-client.tsx:524` AI explain button — **and it's violet, which is exactly right** under the accent policy |
| **`/test/attempt/[attemptId]`** | **0** | 0 | ✅ | Bluebook chrome, correctly gradient-free |
| `/test/[testId]/start` | 0 | 0 | ✅ | |
| `/account` | 2 | 2 | 🟠 2× | StudentNav logo + UserMenu avatar |

**Summary: 17 of 30 routes exceed the one-gradient budget. The two routes that pass are the
two nobody was worried about.** The cheapest structural fix is not per-page: make the logo mark
solid indigo and drop the `UserMenu` avatar gradient, and **every** route loses 1–2 at once. Doing
`AdminNav` (3 → 1) fixes 15 routes in one edit. Do those before any page-level work.

---

## 5. Prisma schema summary

PostgreSQL, 13 models, 8 enums, `prisma/schema.prisma` (327 lines).

### Models & key relations

```
User ─┬─< TestAttempt >─┬─ Test ─< Section ─< Module ─< ModuleQuestion >─ Question
      ├─< PasswordResetToken                                    │
      └─>< Group >─< Test                                       │
                                                                │
TestAttempt ─┬─< Answer >───────────────────────────────────────┤
             ├─< AttemptQuestionSnapshot                        │
             ├─< ModuleResult >── Module                        │
             ├─< Annotation >────────────────────────────────────┘
             └─< AttemptEvent
```

- `User` 1─n `TestAttempt`, `onDelete: SetNull` (attempts survive user deletion)
- `Group` n─m `User`, `Group` n─m `Test` — implicit join tables, no membership metadata (no role, no joinedAt)
- `Question` n─m `Module` via **`ModuleQuestion`** with `order Float` (fractional ordering for cheap reordering), unique `[moduleId, questionId]`

### How attempts / sections / modules / scores are stored

**Test structure is three levels:** `Test` → `Section` (`type: READING_WRITING | MATH`,
`order`, `module1TimeLimit`, `module2TimeLimit` in seconds) → `Module` (`moduleNumber` 1|2,
`difficulty`). Adaptive tests have **multiple** module-2 rows per section (one EASY, one HARD);
linear tests have one `MIXED`. Questions attach to modules, not to tests.

**Attempt state is a cursor, not a document.** `TestAttempt` holds
`currentSectionId`, `currentModuleId`, `currentQuestionIndex`, plus the three timing anchors:

- `moduleStartedAt` — server UTC when the module began
- `moduleDeadlineAt` — **server-authoritative deadline**, indexed as `@@index([status, moduleDeadlineAt])` so the cron sweeper (`/api/cron/attempts`) can find expired attempts
- `breakStartedAt` — set during the 10-minute inter-section break

`userId` is **nullable** — that's the anonymous-attempt path.

**Answers:** `Answer` is unique on `[attemptId, questionId]` and carries `response`,
`isCorrect`, `isMarkedForReview`, `eliminatedChoices` (Json `('A'|'B'|'C'|'D')[]`),
`timeSpent` (seconds, accumulated). Grading is stored on the row at save time.

**Score integrity:** `AttemptQuestionSnapshot` copies `correctAnswer` + `acceptedAnswers` +
`questionType` at serve time, unique on `[attemptId, questionId]`. Editing a live question
therefore cannot change an in-flight attempt's score. This is a genuinely good design that the
plan never mentions.

**Scores are not stored.** There is **no score column anywhere.** `ModuleResult` stores only
`correctCount` / `totalCount` per module (unique `[attemptId, moduleId]`) plus `routedTo`
(the Module 2 id the student was sent to). Every scaled score in the product is **recomputed
on every render** from `ModuleResult` rows. Consequences worth knowing before Phase 4:

- A conversion-table change retroactively rewrites every historical score.
- `/progress` charts and any Δ column recompute per attempt per page load — N+1 by construction.
- There is nowhere to persist "this attempt was untimed / extended time" (§6.4 needs a migration).

### Question taxonomy

On `Question`, all flat columns — no `Domain` or `Skill` tables:

| Field | Type | Indexed | Note |
|---|---|---|---|
| `sectionType` | `SectionType` enum | ✅ | enforced against module section on assignment |
| `domain` | **`String`** | ✅ | free text — no FK, no enum |
| `skill` | **`String?`** | ❌ | free text, nullable, **not indexed** |
| `difficulty` | `Difficulty` enum (EASY/MEDIUM/HARD/MIXED) | ✅ | |
| `type` | `QuestionType` enum | ❌ | MULTIPLE_CHOICE / STUDENT_PRODUCED_RESPONSE |
| `contentHash` | `String?` | ✅ | dedupe on import (`src/lib/question-content-hash.ts`) |

`src/lib/question-taxonomy.ts` (42 lines) holds a hardcoded suggestion list, but nothing
constrains the column. **This is a real risk for Phases 7 and 9**: `SkillMastery` keyed on
`skillId` (§7.1) and per-skill drilling assume a controlled vocabulary. Today `"Linear equations"`,
`"Linear Equations"` and `"linear equations "` are three different skills. Normalising the
taxonomy is a prerequisite the plan doesn't list.

### Fields the plan assumes and that don't exist

`Question.published` · `Question.PUBLIC_DEMO` · `Test.visibility` (it's `isPublic`) ·
`StudentProfile` (test date, target score, focus domains) · `scoreScope` ·
explanation cache · `ReviewQueueItem` / `PracticeSession` / `SkillMastery` ·
notification / email-preference tables · question version history · question draft state.

---

## 6. Scoring path — raw → scaled

Everything lives in `src/lib/scoring.ts` (336 lines, pure functions, covered by
`tests/scoring.test.ts`). Policy is documented in `docs/scoring-policy.md`.

### Step 1 — raw counts, aggregated from `ModuleResult`

```ts
// src/lib/scoring.ts:143
export function computeRawScores(
  moduleResults: { sectionType: "READING_WRITING" | "MATH"; correctCount: number; totalCount: number }[],
): AttemptRawScores {
  const rw = { correct: 0, total: 0 };
  const math = { correct: 0, total: 0 };
  for (const r of moduleResults) {
    const bucket = r.sectionType === "READING_WRITING" ? rw : math;
    bucket.correct += r.correctCount;
    bucket.total += r.totalCount;
  }
  return { readingWriting: rw, math };
}
```

### Step 2 — proportional table lookup

Two embedded tables: `DEFAULT_RW_TABLE` (55 entries, raw 0–54) and `DEFAULT_MATH_TABLE`
(45 entries, raw 0–44). A test with a different question count is mapped **proportionally onto
the table index**, not by raw count:

```ts
// src/lib/scoring.ts:63
export function scaleScore(raw: number, max: number, table?: number[]): number {
  const clampedRaw = Math.max(0, Math.min(Math.round(raw), Math.max(0, max)));
  if (table && table.length > 0) {
    const tableMax = table.length - 1;              // 54 for R&W, 44 for Math
    const proportionalIdx =
      max > 0 ? Math.min(Math.round((clampedRaw / max) * tableMax), tableMax) : 0;
    const value = table[proportionalIdx];
    if (typeof value === "number" && Number.isFinite(value)) return clampScaled(value);
  }
  if (max <= 0) return SCALED_MIN;                   // linear fallback
  const ratio = clampedRaw / max;
  return clampScaled(Math.round(SCALED_MIN + ratio * (SCALED_MAX - SCALED_MIN)));
}
```

### Step 3 — adaptive lower-route cap, then sum

```ts
// src/lib/scoring.ts:160
export function computeScaledScores(raw, routes = {}): AttemptScaledScores {
  let rw = scaleScore(raw.readingWriting.correct, raw.readingWriting.total, DEFAULT_RW_TABLE);
  let math = scaleScore(raw.math.correct, raw.math.total, DEFAULT_MATH_TABLE);
  if (routes.readingWriting === "EASY") rw = Math.min(rw, EASY_ROUTE_CAP);   // 600
  if (routes.math === "EASY") math = Math.min(math, EASY_ROUTE_CAP);
  return { readingWriting: rw, math, total: rw + math };
}
```

`routes` comes from `computeAttemptRoutes` (`:176`), which resolves each Module 1 result's
`routedTo` id to the Module 2 actually served and reads *its* difficulty.

### Step 4 — **how a section-only test is handled**

This is the gate. It is not `scoreScope`; it is a three-value fidelity enum:

```ts
// src/lib/scoring.ts:117
export function getScoreFidelity(raw: AttemptRawScores): ScoreFidelity {
  if (raw.readingWriting.total <= 0 || raw.math.total <= 0) return "INCOMPLETE";
  if (
    raw.readingWriting.total !== FULL_LENGTH_RW_QUESTIONS ||   // 54
    raw.math.total !== FULL_LENGTH_MATH_QUESTIONS               // 44
  ) {
    return "ESTIMATE";
  }
  return "FULL_LENGTH";
}
```

**A math-only attempt returns `INCOMPLETE`, and every consumer suppresses the score entirely:**

- `results/[attemptId]/page.tsx:152` — replaces the whole score hero with:
  > "No complete SAT score available … a 400–1600 total would be misleading."
- `dashboard/page.tsx:270` and `admin/users/[id]/page.tsx:165` — render `—` in the Score column
- `dashboard/page.tsx:75` — `fullLengthPoints` filters to `FULL_LENGTH` before computing avg/best,
  so `ESTIMATE` attempts don't pollute the stats *or* the trend chart either
- `lib/analytics.ts:190` — `computeAttemptScorePoint` returns `null` for `INCOMPLETE`
- `admin/attempts/page.tsx:212` — prefixes `Est.` for `ESTIMATE`
- `api/admin/export/attempts/route.ts:105` — fidelity is a CSV column

**Verdict on P5:** the bug the plan describes is fixed, and fixed more conservatively than the
plan proposes. The plan wants to *show* `430 /800 · Math only`; the code currently shows nothing
at all. That is arguably too conservative — a student who takes a math-only test gets zero
feedback on their score — but it is not the misleading-`/1600` bug. Phase 4.1.2 should be
rewritten as "surface a labelled section score for `INCOMPLETE` attempts", which is a *product*
decision, not a correctness fix, and no longer belongs in Phase 0.

### Remaining honesty gaps in the scoring surface

- `tierLabel()` (`results/[attemptId]/page.tsx:316`) still returns `"Above Average Score"` /
  `"Room to Grow"` from a raw `total/1600` ratio. This is the invented-distribution claim §5.1.1
  flags, it is still live for `FULL_LENGTH` attempts, and it violates the CLAUDE.md rule
  "never state a number the product cannot back."
- `scorePct` (`:119`) maps 400–1600 onto the gauge, so a 400 renders as an empty ring.
- There is no `/scoring` page, so `docs/scoring-policy.md` — which is good, honest work — is
  invisible to students.

---

## 7. Plan validation — all 60 work items

The prompt says 52; the plan has 60 leaf-numbered items and no IDs (see W12). All 60 below.

### Phase 0 — Guardrails

| Item | Verdict | Why |
|---|---|---|
| 0.1 Route-level `loading`/`error` | **NEEDS RESCOPING** | Correct need — zero exist. But **every path listed is wrong** (no route groups; `src/app/` not `app/`). Rewrite against §1 above. Add `not-found.tsx`; the current `/_not-found` is Next's default. |
| 0.2 `Skeleton` + per-route skeletons | **OK** | |
| 0.3 `/ui` gallery at `app/(dev)/ui` | **NEEDS RESCOPING** | Path assumes a route group that doesn't exist, and there is no dev-only route convention here. Also needs a middleware entry — `middleware.ts:17` would redirect `/ui` to `/login`. |
| 0.4 Reduced-motion + focus baseline | **NEEDS RESCOPING — upgrade to first** | The reduced-motion block is genuinely absent, and 4 infinite animations run today. But the *focus* half understates the problem: `globals.css:148` kills `:focus-visible` outline globally with no replacement. That's a live WCAG failure on every non-`Button` control, not a gradient-button nicety. Split it out and do it first. |
| 0.5 Lint guardrails | **NEEDS RESCOPING** | A blanket no-raw-hex rule fires on 4 *correct* Bluebook colours in `test-interface-components.tsx`. Needs an override for `src/app/test/attempt/**` first. Also add rules for the dead classes in §3.5 — higher value than the hex rule. |
| 0.6 Baselines | **NEEDS RESCOPING** | Bundle sizes: done (`docs/baselines.md`). Lighthouse/axe: no tooling installed. **Product metrics are not measurable at all** — there is no event pipeline. That's a build task, not a measurement task; split it. |

### Phase 1 — Design system

| Item | Verdict | Why |
|---|---|---|
| 1.1 Tokens & policy | **OK** | Confirmed absent: `--ink`/`--paper`/`--paper-sunk`, all 8 type tokens, `--font-mono`, `.tabular`, `.eyebrow`. Add: map `--accent-pop`/`--accent-warm` into `tailwind.config.ts` (they're unusable today), and define `shadow-xs` or remove its 13 usages. |
| 1.2 Build 17 primitives | **NEEDS RESCOPING** | Six exist, not zero. `@radix-ui/react-select`, `-tabs`, `-tooltip`, `-accordion`, `-progress` are **not installed** — the plan adds ~5 dependencies without saying so. `EmptyState` "exists — extend" ✅ accurate. |
| 1.3 Refactors enabled | **OK** | 3 `SELECT_CLS` decls / 7 usages, 13 tables (plan says 5 — undercount), bare `☀/☾` toggle all confirmed. Add: the toggle also needs a blocking theme script to stop the light→dark flash. |
| 1.4 zustand decide | **OK** | Confirmed installed (`^5.0.2`) and **zero imports anywhere**. Decision genuinely open. |

### Phase 2 — Landing

| Item | Verdict | Why |
|---|---|---|
| 2.1 New page structure | **OK** | 460-line single file, no FAQ, no footer links beyond login/signup, header is `glass` over a busy hero. |
| 2.2 `<LiveQuestionDemo />` | **NEEDS RESCOPING** | Needs a `PUBLIC_DEMO`/`published` flag that doesn't exist (W5). **And**: `/practice` already gives logged-out visitors a full real test (W3), so this is now an *entry-point* component, not the only unauthenticated path. Cheaper than the plan thinks; also blocked on open decision #4 (licensing). |
| 2.3 Truthful stats strip | **NEEDS RESCOPING** | Right instinct, **broken snippet** — `question.published` and `test.visibility` don't exist (W4). Use `prisma.question.count()` and `test.count({ where: { isPublic: true } })`. The `∞` fix is already done (W8). |
| 2.4 Screenshot tabs | **OK** | Blocked on `Tabs` (1.2) and on capturing screenshots from a seeded account. |
| 2.5 Capability bento | **NEEDS RESCOPING** | Plan says "every test is LINEAR". **`Test.mode` defaults to `ADAPTIVE`** and adaptive routing is fully implemented (`src/lib/adaptive-routing.ts`, `ModuleResult.routedTo`, EASY-route cap in scoring). Whether *published* tests are linear is a data question, not a code one — check the DB before demoting the tile. Open decision #2 may already be answerable. |
| 2.6 FAQ + JSON-LD | **NEEDS RESCOPING** | Needs `@radix-ui/react-accordion` (not installed). Q3 "how is 200–800 calculated" can be answered verbatim from `docs/scoring-policy.md` — cheaper than estimated. |
| 2.7 Honest credibility | **OK** | `docs/scoring-policy.md` already contains the `/scoring` page's content. Mostly a routing + copy task. |
| 2.8 SEO & metadata | **OK** | Smaller than it looks on the metadata side: 25 of 27 pages already export `metadata` — only **`/` and `/admin/groups/[id]`** don't, so the landing page inherits the root's generic "SAT Practice Platform" title. Genuinely absent: `sitemap.ts`, `robots.ts`, OG images, canonicals, all JSON-LD, and all six new content routes. |
| 2.9 Carry-over fixes | **PARTIALLY ALREADY DONE** | `Digital SAT Practice ,` ✅ fixed (W8). Still true: glass header, 15s `animated-gradient-bg`, two blurred orbs, `MockTestCard` behind `lg:block`. |

### Phase 3 — Auth & onboarding

| Item | Verdict | Why |
|---|---|---|
| 3.1 Auth page fixes | **OK** | All four pages confirmed: gradient panel `hidden lg:block`, solid `bg-primary` button beside a gradient panel, `rgba()` dot lattice copy-pasted ×4. Note `/forgot-password` **already returns a generic response** (`api/auth/forgot-password/route.ts`) and `lib/rate-limit.ts` exists — that sub-bullet is closer to done than the rest. |
| 3.2 `/welcome` onboarding | **OK** | `StudentProfile` genuinely doesn't exist. Blocked on nothing but the migration. |

### Phase 4 — Dashboard & progress

| Item | Verdict | Why |
|---|---|---|
| 4.1.1 Next-action card | **OK** | No resume-priority card today; `IN_PROGRESS` surfaces only as a per-test-card button and a history row. Data is available (`inProgressByTest`, `dashboard/page.tsx:63`). |
| 4.1.2 Fix score display (P5) | **ALREADY DONE — as a different design** | See §6 and W2. Do **not** add `scoreScope`; it would be a second, conflicting policy alongside `ScoreFidelity`. Rewrite as "give `INCOMPLETE` attempts a labelled section score instead of nothing." Remove from Phase 0 — it is no longer a correctness bug. |
| 4.1.3 Richer test cards | **OK** | `test-card.tsx` confirmed: no history, no duration, no section mix, full-width gradient button, no mode tooltip. `Test`/`Section` carry the timing data needed for `~1h 34m`. |
| 4.1.4 History table | **NEEDS RESCOPING** | All four asks valid. **Add:** the table's cells use dead `py-4.5` (§3.5) and its `Score` column already respects fidelity. The `Δ` column is more expensive than it looks — scores aren't stored, so every delta recomputes from `ModuleResult` (§5). |
| 4.2 `/progress` route | **NEEDS RESCOPING** | Route absent ✅ but `src/components/score-trend.tsx` (88 LOC, hand-rolled SVG, server component) already does chart #1 and is on the dashboard (W6). Extend it rather than starting over. Chart #2 (domain heatmap) needs per-attempt domain accuracy, which is only derivable by joining `Answer` → `Question.domain` per attempt — no aggregate exists; at 10 attempts this is a fan-out query worth measuring. |

### Phase 5 — Results & review

| Item | Verdict | Why |
|---|---|---|
| 5.1.1 Delta + gap-to-target | **OK** | Both absent. Gap-to-target depends on 3.2's `StudentProfile`. |
| 5.1.2 "What to work on next" | **OK** | `computeDomainBreakdown` (`scoring.ts:305`) already returns exactly the shape needed. Cheap. |
| 5.1.3 Question map | **OK** | `Answer.isMarkedForReview` + `response` + `isCorrect` give correct/incorrect/skipped/flagged today. |
| 5.1.4 PDF export + share link | **NEEDS RESCOPING** | Two unrelated features in one bullet. The share link needs a signed-token table, revocation UI in `/account`, and a public-read path through `middleware.ts` — that's its own item, not a sub-bullet. |
| 5.2.1 Review filtering | **OK** | Confirmed: `review-client.tsx` has a single `index` state, no filters, no URL sync. Highest-value item in the phase, as claimed. |
| 5.2.2 Desktop sidebar | **OK** | Needs `Sheet` (1.2). |
| 5.2.3 AI explanation upgrade | **CUT — feature removed 2026-08-06** | The prompt was built from a client-supplied `questionStem` / `correctAnswer` / `choices` POST body; the server never read the question from the DB, so any authenticated user could drive Gemini on the project key. Removed rather than repaired. Review now shows the authored `Question.explanation` only — and all 280 bank questions have one. Successor work item: keep coverage at 100% as the bank grows (§9.3 "missing explanation" filter). |
| 5.2.4 Review queue button + table | **OK** | |
| 5.2.5 Annotations in review | **OK** | `Annotation` rows exist per attempt+question with offsets, colour and note; `annotated-passage.tsx` (433 LOC) can render them. Surfacing only. |

### Phase 6 — Test interface

| Item | Verdict | Why |
|---|---|---|
| 6.1 Refactor + Playwright | **NEEDS RESCOPING** | 1,589 lines across **two** files plus 5 islands, not one 1,500-line component (W11). No Playwright at all — no dep, no config, no `test:e2e` script; the plan treats "add tests" as a bullet when it is the whole first week. Existing coverage: 12 vitest files including `test-interface.test.tsx` and an integration `attempt-lifecycle.test.ts`. |
| 6.2 Accessibility parity | **OK** | Text size, high contrast, `aria-live`, `role="radiogroup"`, keyboard highlighting all absent. `keyboard-shortcuts-modal.tsx` exists, so `?` is a small add. |
| 6.3 Tablet & mobile | **OK** | Blocked on open decision #7. `/test/[testId]/start` has a fullscreen explanation but **no device check** — the plan is right. |
| 6.4 Practice-mode modifiers | **NEEDS RESCOPING** | Needs schema columns on `TestAttempt` to record timing/feedback/pause modifiers (§5: nowhere to store them), and the results page must label them. The plan calls this "additive, off by default" and doesn't mention the migration. Note a `PracticeBanner` already renders "THIS IS A PRACTICE TEST". |
| 6.5 Small improvements | **OK** | All five valid. "Report a problem" needs a table (feeds 9.2). |

### Phase 7 — Practice & drill

| Item | Verdict | Why |
|---|---|---|
| 7.1 Schema additions | **NEEDS RESCOPING** | `SkillMastery` is keyed `[userId, skillId]` but **`Question.skill` is a nullable free-text `String` with no index and no controlled vocabulary** (§5). Normalising the taxonomy — probably a `Skill` table plus a data migration — is a prerequisite the plan omits, and it is the real cost of this phase. |
| 7.2 `/practice` builder | **🔴 NAME COLLISION** | **`/practice` already exists** and is the public logged-out sample-test list (`src/app/practice/page.tsx`, whitelisted in `middleware.ts:21`). Building the authenticated drill builder there would break the anonymous path *and* the landing page's "Try a sample" CTA. Pick a different route (`/drill`) or explicitly plan the migration. |
| 7.3 `/practice/[sessionId]` runner | **NEEDS RESCOPING** | Same collision (`/practice/` is a public prefix in middleware). Also depends on 6.1 having extracted `QuestionPane` — sequence it after Phase 6, not in parallel. |
| 7.4 Session summary | **OK** | |
| 7.5 Spaced repetition | **OK** | Test-date cap depends on 3.2. |
| 7.6 Mastery model | **OK** | Depends on 7.1's taxonomy fix. |

### Phase 8 — Goals & notifications

| Item | Verdict | Why |
|---|---|---|
| 8.1 Goals | **OK** | Depends on 3.2. |
| 8.2 Email templates | **OK** | Resend confirmed wired (`src/lib/email.ts`, 136 LOC) and confirmed sending exactly one template (password reset). Needs an email-preferences table. |
| 8.3 In-app notifications | **OK** | |
| 8.4 Group leaderboard | **OK** | `Group` n─m `User` exists; opt-in needs a per-user column. |

### Phase 9 — Admin v2

| Item | Verdict | Why |
|---|---|---|
| 9.1 `/admin/analytics` | **NEEDS RESCOPING** | Route namespace partly exists (`/admin/analytics/items`) with no index page. **Device/viewport breakdown is not possible** — the plan says "you already log some telemetry", but `AttemptEvent` records only BLUR/FOCUS/FULLSCREEN_ENTER/EXIT. No device, no viewport, no user agent. Either drop that bullet or add the capture first. |
| 9.2 Question quality analytics | **PARTIALLY ALREADY DONE** | `/admin/analytics/items` + `computeItemAnalysis` already ship p-value, distractor pick-rate, mean time, and 3 flags with a 5-exposure floor (W7). **Genuinely missing: discrimination index, authored-vs-actual difficulty, the report queue, and the "Needs attention" tab on `/admin/questions`.** Rescope to those four; don't rebuild the rest. |
| 9.3 Question bank workflow | **OK** | Confirmed absent: bulk actions, draft/published state, version history, saved views, "missing explanation" filter. `contentHash` (`lib/question-content-hash.ts`) gives duplicate detection a head start. Note draft/published overlaps 2.3's `published` flag — do it once, here or there. |
| 9.4 Groups & roster | **OK** | `Group` has no membership metadata, no invite tokens, no per-student progress view. Confirmed greenfield. |
| 9.5 Import & attempts | **OK** | `import-form.tsx` (506) + `api/admin/import` (304) + `lib/import-schema.ts` (212) exist; dry-run diff, per-line jump, image ingestion all absent. Cloudinary is wired (`api/admin/upload-image`). |
| 9.6 Admin UI polish | **OK** | 13 tables, no breadcrumbs on `[id]` pages, no mobile card lists. **Add to scope:** `AdminNav` alone puts 3 gradients on all 15 admin routes (§4) — fixing it there is the single biggest gradient-budget win in the codebase. |

### Phase 10 — Hardening

| Item | Verdict | Why |
|---|---|---|
| 10.1 Responsive policy | **ALREADY DONE (documented)** | The table is already in `CLAUDE.md` under "Responsive policy". Enforcement isn't done, but the decision is written down. Reduce to an audit item. |
| 10.2 Performance | **NEEDS RESCOPING — promote** | Measured (`docs/baselines.md`): the plan calls Desmos "likely your single largest payload", but **Desmos is loaded from an external script on calculator open and is not in the bundle**. The actual outlier is **KaTeX/`react-katex` at 288–320 kB First Load on `/admin/questions/[id]`, `/admin/questions/new`, `/results/[attemptId]/review` and `/test/attempt/[attemptId]`**. The plan's own suggestion — render math to static HTML at save time — is the right fix and is worth ~200 kB on a student route. Promote it out of Phase 10. |
| 10.3 WCAG 2.2 AA pass | **NEEDS RESCOPING — pull the focus fix to Phase 0** | `globals.css:148` disables `:focus-visible` globally with no replacement. Also found: `text-emerald-350`/`text-blue-350` (§3.5) leave dark-mode tier pills with no text colour. Neither can wait for Phase 10. |
| 10.4 Localisation | **OK** | Genuinely open (decision #9). No i18n anywhere today. |

**Tally:** 34 `OK` · 22 `NEEDS RESCOPING` · 4 already done or partly done (2.9, 4.1.2, 9.2, 10.1) —
plus one 🔴 hard blocker (7.2/7.3 `/practice` route collision).

---

## 8. Open decisions — three of nine are now answerable

The plan's Appendix E and CLAUDE.md both list these as blocking. Recon changes the status of three:

| # | Decision | Status after recon |
|---|---|---|
| 2 | **Does adaptive mode ship?** | **Code says yes.** `Test.mode` defaults to `ADAPTIVE`; `src/lib/adaptive-routing.ts`, `ModuleResult.routedTo`, per-section EASY/HARD Module 2 rows and the 600-point route cap are all implemented and tested. The plan's "every test is LINEAR" is an observation about *seeded data*, not capability. Query the DB for `Test.mode` where `isPublic` before demoting the landing tile. |
| 5 | **Chart library or hand-rolled?** | **Effectively decided.** `score-trend.tsx` is already hand-rolled SVG and works. No charting dependency is installed. Ratify it. |
| 6 | **zustand: use or drop?** | Still open, but the fact is confirmed: installed, **zero imports**. |
| 1, 3, 4, 7, 8, 9 | audience · paid tiers · licensing · mobile test-taking · AI cost ceiling · localisation | Still genuinely open; none is answerable from the code. #4 (licensing) is the one that blocks the most work (2.2, 2.3, 2.7). |

---

## 9. Things found that the plan doesn't mention at all

Ranked by how much they'd hurt if left.

1. ~~**`/api/ai/explain` builds its Gemini prompt entirely from the client's POST body.**~~
   **Resolved 2026-08-06 — the feature was removed entirely** (route, review-page UI, API key).
   See `docs/feature-decisions.md`. Plan §5.2.3 is cut.
2. **`:focus-visible { outline: none }` with no replacement** (`globals.css:148`) — app-wide
   keyboard-focus failure outside the `Button` primitive.
3. **`py-4.5` on every dashboard history-table cell** — a dead class; the table renders with no
   vertical padding.
4. **`text-emerald-350` / `text-blue-350`** — dark-mode performance-tier pills have no text colour.
5. **`shadow-xs` × 13** — dead class, no shadow renders.
6. **No `fontFamily.mono` in `tailwind.config.ts`** — all 24 `font-mono` usages already fall back
   to the browser default. Phase 1's mono work is partly a *repair*, not an addition.
7. **CLAUDE.md documents tokens, utilities and a reduced-motion block that don't exist** (W10).
   Any future task that trusts it will produce broken code. Fix CLAUDE.md or ship 1.1 first.
8. **`pnpm typecheck` cannot pass** — no such script, and no pnpm (W9). Definition of done is
   currently unsatisfiable.
9. **No score is ever persisted** — every score in the product is recomputed from `ModuleResult`
   on each render. Fine today; an N+1 the moment `/progress` and Δ columns arrive.
10. **`Question.skill` is unindexed nullable free text** — silently degrades every Phase 7 feature.
11. **Two file-naming conventions** (kebab-case in the repo, `ComponentName.tsx` in CLAUDE.md).
12. **Theme flash on every page load** — no blocking script; `DarkModeToggle` applies the class
    in a `useEffect`.
