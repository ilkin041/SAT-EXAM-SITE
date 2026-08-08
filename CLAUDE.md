# CLAUDE.md

Repo root. Read automatically every session.

**This file describes the codebase as it is today, and marks target state explicitly.** Anything
under "TARGET" does not exist yet — do not write code against it until the task that builds it has
shipped.

---

## Project

Self-hosted Bluebook-style Digital SAT practice platform. Students take timed, module-based practice
tests; tutors manage a question bank, assemble tests, group students, review attempts.

**Stack:** Next.js 14 App Router (RSC-first), React 18, TypeScript, Tailwind 3, Radix UI,
NextAuth v5, Prisma + PostgreSQL, Cloudinary, Resend, KaTeX, Desmos.

**Package manager is npm.** There is no pnpm and no `pnpm-lock.yaml`.

**Routes live in `src/app/`. There are no route groups.** Do not write `app/(student)/…` or
`app/(marketing)/…` — those directories do not exist.

**File naming is kebab-case** (`test-card.tsx`, `review-client.tsx`). Client islands are named
`*-form.tsx`, `*-client.tsx`, `*-table.tsx`. Follow the repo, not any other convention.

**RSC rule holds today and must keep holding:** no `"use client"` in any `page.tsx` or `layout.tsx`.

---

## Commands

```bash
npm run dev
npm run build
npx tsc --noEmit              # there is no `typecheck` script
npx tsc --noUnusedLocals      # catches dead imports
npm test                      # vitest, 156 tests
npm run lint                  # next lint --no-cache --max-warnings=0; must be clean
npm run analyze               # ANALYZE=true next build -> .next/analyze/*.html
npm run db:backfill-question-html   # populate Question.renderedHtml (see T2.1 below)
npm run db:verify-question-html     # stored render == fresh render, field by field
npm run gen:reference-sheet         # re-typeset the geometry reference sheet
npm run gen:katex-subset            # re-derive the KaTeX CSS + font subset from the bank
npx prisma migrate dev --name <name>
npx prisma studio
```

No Playwright, no `test:e2e` yet.

### Lint guardrails

`.eslintrc.js` + five local rules in `eslint-rules/` (plugin name `sat`) enforce the design policy
below. Each is covered by `tests/eslint-rules.test.ts`.

| Rule | Fails on |
|---|---|
| `sat/no-unresolved-tailwind-class` | A class that compiles to no CSS. Asks Tailwind's own JIT, so `py-4.5`, `bg-primary/8` and `dark:text-emerald-350` are caught; classes declared in `globals.css` are accepted |
| `sat/no-raw-color` | Hex / `rgb()` / `hsla()` in `.tsx`. `hsl(var(--token))` passes. Off under `src/app/test/attempt/**` |
| `sat/no-inline-color-style` | A colour property in `style={{ }}` — raw or computed in JS. Dynamic width/transform is untouched |
| `sat/no-class-constants` | Module-level `*_CLS` / `*_CLASSES` string constants |
| `sat/no-client-page` | `"use client"` in any `page.tsx` / `layout.tsx` |

Every rule is `error` or `off`, never `warn`, so `--max-warnings=0` keeps the ratchet honest. A
suppression must name the task that removes it: `// TODO(T4.1): …` above the
`// eslint-disable-next-line`.

Current debt for the design rules: **zero inline suppressions** — only two file-scoped overrides
remain in `.eslintrc.js`, for T6.1 (`test-interface.tsx` hook deps) and T10.2
(`review-client.tsx` `<img>`), both used because an inline comment there is not possible or not
allowed. T0.7 cleared five: the StatCard shimmer and the auth dot lattice (4×) both moved into
`globals.css`, where a colour is not a violation. T1.3 cleared the last two, the `SELECT_CLS`
pair — along with a third class constant the rule never saw, a function-scoped `selectClass` in
`admin/analytics/items/page.tsx`. It only goes down.

---

## How to work on a task

1. You get a task prompt with an ID like `T3.4`. Rationale is in `docs/improvement-plan.md`;
   ground truth about the codebase is in `docs/recon.md`. **Read `docs/recon.md` §0 before any task**
   — it lists twelve places the plan was wrong.
2. Plan first: list files you will create and modify, plus any migration, before writing code.
3. Stay in scope. Every prompt has an explicit **Out of scope**. Note unrelated problems at the end
   instead of fixing them.
4. Small commits, conventional messages.
5. Finish by reporting each acceptance criterion individually, pass or fail. Do not claim a pass you
   did not verify.

---

## Never break these

- **The test interface** (`src/app/test/attempt/[attemptId]/`, 1,589 lines across
  `test-interface.tsx` + `test-interface-components.tsx` plus 5 islands). A student losing answers
  mid-exam is the worst failure this product has. Playwright coverage must exist and pass before any
  refactor. Never touch it outside a Phase 7 task.
- **Server-anchored timing.** `moduleDeadlineAt` is authoritative and indexed for the cron sweeper.
  Never move timing authority client-side.
- **`AttemptQuestionSnapshot`.** It copies `correctAnswer`/`acceptedAnswers` at serve time so editing
  a live question cannot change an in-flight score. Preserve this.
- **`src/lib/scoring.ts` + `ScoreFidelity`.** Covered by `tests/scoring.test.ts`. Any change needs a
  test. **Do not introduce a `scoreScope` enum** — `getScoreFidelity()` already handles section-only
  attempts and a second enum would create conflicting policy.
- **Anonymous attempts.** `src/lib/anonymous-attempt.ts` binds a logged-out attempt to a browser via
  an HMAC cookie; `middleware.ts` whitelists `/practice`, `/test/`, `/results/`. **`/practice` is a
  public route — do not build authenticated features there.** The drill feature goes at `/drill`.

---

## Design policy

### Gradient budget — one gradient element per viewport

**No route exceeds one gradient element above the fold** (was 17 of 30 over budget before T0.6 did
shared chrome, 8 before T1.8 did the pages). Per-route before/after counts are in
`docs/gradient-audit.md`. The only residual is `/dashboard` at 2 total — the `TestCard` left accent
strip (which does clear the fold at 1280×800, and is the page's one above it) and the warm
`Continue test` in the history table two sections below. Both are deliberate. There are **no hand-rolled `bg-gradient-*` buttons left** — `Button variant="accent"` on the
`/` hero is the app's one gradient button.

| Token | Reserved for |
|---|---|
| `--gradient-primary` | The single primary CTA on a page, **or** the score gauge, **or** the hero signature — never two at once |
| `--gradient-accent` | **UNASSIGNED, and as of T1.8 unused in `.tsx`.** Was reserved for AI features; the AI feature was removed 2026-08-06. Do not silently reuse it — ask before assigning |
| `--gradient-warm` | Resume / in-progress / time pressure only |
| `--brand-navy` | Admin chrome only |
| `--accent-warm` (amber) | Time, pacing, in-progress. Never decorative |
| `success` (emerald) | Correct, completed, mastered |
| `destructive` | Incorrect, destructive actions, offline |
| `--ink` / `--paper` / `--paper-sunk` | Editorial pair: highest-contrast text, its sheet, a recessed well within it. Inverted (not dimmed) in dark; `paper-sunk` recedes in both. Available as `text-ink`, `bg-paper`, `bg-paper-sunk` |

Shared chrome is clean (T0.6): `AdminNav` is down to its one navy bar, and `StudentNav`,
`UserMenu` and `PageHeader` carry none. Pages are clean (T1.8). The one remaining known gap is
`EmptyState`'s `from-card/80 to-muted/30` surface tint — read strictly it should be a flat
`bg-muted/20`, and it takes any route showing an empty state to 2.

### Numbers are mono

IBM Plex Mono (400/500/600, latin) is loaded in `src/app/layout.tsx` as `--font-mono` and wired
into `fontFamily.mono`. Every number is `.tabular` — timers, scores, counts, percentages, dates,
table figures. Eyebrow labels use `.eyebrow` (mono, uppercase, 0.08em, 11px). Both utilities live
in `globals.css`.

`font-mono` on its own is still correct for things that are *code* rather than *quantities* — `<kbd>`
keys, error digests, the JSON import textarea, raw event logs. Those now render in Plex Mono too;
they just do not want `tabular-nums` or tighter tracking.

The frozen test interface (`src/app/test/attempt/**`) still hand-rolls `font-mono tabular-nums`.
That is deliberate — it is off-limits outside a Phase 7 task.

### Type scale

Eight rungs, defined as custom properties in `globals.css` and bound into Tailwind utilities in
`tailwind.config.ts`. Each utility carries size, weight, tracking and line-height together, so a
heading is one class. Use them and do not invent sizes:

```
--text-display  clamp(2.5rem, 4.5vw + 1rem, 4rem)    800 / -0.035em / 0.95
--text-h1       clamp(2rem, 2.5vw + 1rem, 2.75rem)   800 / -0.03em  / 1.05
--text-h2       clamp(1.5rem, 1.5vw + .75rem, 2rem)  700 / -0.02em  / 1.15
--text-h3       1.25rem                               700 / -0.01em  / 1.3
--text-body-lg  1.0625rem                             400 / 1.65
--text-body     0.9375rem                             400 / 1.6
--text-caption  0.8125rem                             500 / 1.45
--text-eyebrow  0.6875rem                             mono 600 / 0.08em / uppercase
```

Class names are `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body-lg`, `text-body`,
`text-caption`, `text-eyebrow`. The four display rungs are fluid `clamp()`, so **do not add
responsive size variants** — `text-h1 md:text-h1-something` is not a thing, and `sm:text-4xl` next
to a rung defeats the clamp. Do not restate weight or tracking either; the rung owns them.

Marketing body is `--text-body-lg` at `max-w-[52ch]`. App body is `--text-body`.

No page file uses a raw `text-*` size any more. Components under `src/components/` and the client
islands have **not** been swept — that is follow-on work, not a licence to add new raw sizes.

### Spacing

Marketing sections `py-16 md:py-24` max. App pages `py-10`. Density comes from content, not padding.

### Motion

One orchestrated load sequence per page, not `animate-fade-in` on every card. Scroll reveal once per
section. The global `prefers-reduced-motion` block landed in T0.1 and stops every infinite
decorative loop (`float`, `pulse-glow`, `shimmer`, `timer-critical-pulse`). `gradient-shift` is gone
entirely — T0.7 removed its only user, the landing page's 15s `animated-gradient-bg`.

### Colour

No raw hex or `rgb()`/`hsla()` in `.tsx`. No `style={{ color }}`.

**Exception: `src/app/test/attempt/**`.** The Bluebook chrome deliberately ignores the theme and its
four hardcoded colours (`#f4f5f7`, `#1a237e`, `#121212`, `#1a1a1a`) are correct. Lint rules must
exempt that directory.

No known violations outside the exempt directory. T0.6 replaced the `admin-nav.tsx` hex with
`--brand-navy-light`; T0.7 cleared the last two — the auth dot lattice is now the `.dot-lattice`
utility behind `<DotLattice />`, and the StatCard shimmer is the `.shimmer-sweep` utility reading
`--primary`.

---

## Math is typeset at save time (T2.1)

A student never downloads a math renderer. KaTeX runs on the server when a question is written,
and `Question.renderedHtml` stores the sanitized output. `/results/[attemptId]/review` went
290 → 110 kB First Load and `/test/attempt/[attemptId]` 324 → 145 kB; per-route numbers are in
`docs/baselines.md`.

- **`RichContent` renders LaTeX. `RichHtml` displays HTML that was already rendered.** They look
  interchangeable and are not: `RichContent` imports `@/lib/rich-content`, which imports KaTeX, so
  a *client* component that touches it puts ~200 kB back on the route. Every student surface uses
  `RichHtml` and takes the HTML as a prop. `RichContent` has exactly one live call site left —
  `question-preview.tsx`, inside the admin editor's preview pane, which is the one place the
  renderer legitimately has to run in the browser.
- **`src/lib/rendered-question.ts` is server-only.** `renderQuestionHtml` writes, and
  `readRenderedQuestion` reads with a fallback: a NULL or stale-version blob is re-rendered on the
  server. That fallback is why a missing row is one slow request rather than a blank question, and
  it is what makes the column safe to treat as a cache. `import type` from this module is fine; a
  value import from a client component is not.
- **Every write path must populate it** — `admin/questions/actions.ts`, the JSON importer, and the
  seed all do. A new one that forgets does not break anything visibly, which is the problem: the
  route silently goes back to rendering per request.
- **Bump `RENDER_VERSION` when the renderer or sanitizer changes, then
  `npm run db:backfill-question-html`.** Readers treat a version mismatch as "not rendered yet",
  so the rollout is safe in either order. `npm run db:verify-question-html` diffs every stored
  render against a fresh one field by field; `-- --spot-check <dir>` also writes a side-by-side
  page for the twenty most math-heavy questions. Compare *fields*, not `JSON.stringify` — Postgres
  JSONB reorders object keys, so a stringify diff reports a mismatch that is not one.
- **The reference sheet is pre-typeset into a generated file.** `reference-sheet-formulas.ts` holds
  the LaTeX, `reference-sheet-formulas.generated.ts` the HTML; `npm run gen:reference-sheet`
  regenerates and `tests/rendered-question.test.ts` fails if they drift. It exists because
  `ReferenceSheet` is a client component inside the test interface, and twelve formulas that never
  change are not worth a renderer.
- **KaTeX's CSS and fonts are subset, and the subset is derived from the bank.**
  `npm run gen:katex-subset` writes `src/app/katex-subset.css` (imported by the root layout in
  place of `katex/dist/katex.min.css`) and `public/katex/fonts/`. 20 `@font-face` blocks become
  10, 253.7 kB of woff2 becomes 71.7 kB, and it verifies its own output by reading each font's
  cmap back. **Re-run it after authoring math that uses new glyphs.** `middleware.ts` exempts font
  extensions from its matcher — without that, `/katex/fonts/*.woff2` 307s to `/login` and math
  renders in a fallback serif for exactly the logged-out visitors who cannot tell.

## Copy rules

- Active voice, plain verbs. "Save changes", not "Submit".
- An action keeps its name through the flow. "Publish" → toast says "Published".
- **Errors say what happened and what to do. Never apologise, never vague.**
- Empty states are invitations to act, with a CTA.
- Sentence case except mono eyebrows.
- **Dates go through `src/lib/format-date.ts`. Never call `toLocaleDateString()` / `toLocaleString()`
  in a component.** With no locale argument they read the *runtime's* default, and the runtimes
  disagree: this Node process resolves to `az`, so a server component rendered "5 avq 2026" while a
  client component rendered the browser's "8/6/2026" — and `questions-table.tsx` formatting a
  server-rendered date on the client was two hydration errors on every `/admin/questions` visit.
  `formatDate` → `6 Aug 2026`, `formatDateTime` → `6 Aug 2026, 08:14 UTC`, `formatDayMonth` →
  `6 Aug`. Locale `en-GB` and time zone UTC are pinned there and covered by
  `tests/format-date.test.ts`; that file is where open decision 8 (localisation) gets made. The one
  legitimate exception is a timestamp produced *after* an interaction and never server-rendered —
  `test-meta-form.tsx`'s "Saved at 14:32", which wants the reader's own clock.
- **Never state a number the product cannot back.** No hardcoded marketing stats, no invented
  percentiles, no fabricated testimonials. `tierLabel()` in `results/[attemptId]/page.tsx:316`
  currently violates this — it returns "Above Average Score" from a raw ratio against no
  distribution. It is removed in T6.1.

---

## Accessibility floor

**Currently failing app-wide:** `globals.css:148` sets `:focus-visible { outline: none }` with no
replacement. `Button` re-adds its own ring; every raw `<button>`, `<a>`, `<select>`, `<input>` has no
visible focus indicator. Fixed in T0.1.

Every task ships to this floor: visible focus ring ≥3:1, `aria-label` on icon-only buttons,
`aria-hidden` on decorative SVG, correct heading order, programmatic form labels, status never by
colour alone, keyboard-traversable modals, no horizontal scroll at 360px on full-support surfaces.

---

## Responsive policy

| Surface | Target |
|---|---|
| Landing, auth, content pages | Full support from 360px |
| Dashboard, progress, results, review, account | Full support from 360px |
| Drill runner (`/drill`) | Full support — this is the mobile use case |
| Full test interface | Tablet-first; phone supported-but-warned |
| Admin | Read on mobile (card lists below `md`), edit on desktop |

---

## Schema facts that constrain the work

- **No score is persisted anywhere.** Every scaled score is recomputed from `ModuleResult`
  (`correctCount`/`totalCount` per module) on each render. A conversion-table change retroactively
  rewrites history. `/progress` charts and Δ columns are N+1 by construction — measure before
  shipping.
- **`Question.domain` is free-text String (indexed). `Question.skill` is nullable free-text, not
  indexed.** `"Linear equations"`, `"Linear Equations"` and `"linear equations "` are three different
  skills today. Per-skill drilling and `SkillMastery` require normalising this first (T2.2).
- **`Test.isPublic: Boolean`.** There is no `Test.visibility` and no `Question.published`.
- **`Test.mode` defaults to `ADAPTIVE`.** Adaptive routing is fully implemented and tested
  (`src/lib/adaptive-routing.ts`, `ModuleResult.routedTo`, 600-point EASY-route cap). "Every test is
  LINEAR" is a statement about seeded data, not capability.
- **`TestAttempt.userId` is nullable** — that is the anonymous path.
- **`AttemptEvent` records only BLUR/FOCUS/FULLSCREEN_ENTER/EXIT.** No device, viewport, or user
  agent. Device analytics require capture first.
- **All 280 questions have an authored explanation.** `Question.explanation` is nullable and nothing
  enforces it at authoring time — one bulk import from being reachable.
- **`Question.renderedHtml` (Json?, T2.1) holds the KaTeX output for `stem`, `passage`,
  `explanation` and each choice.** Source columns stay authoritative; this is a cache with a
  version. See "Math is typeset at save time" below.

### Radix packages

Installed: `react-accordion`, `react-dialog`, `react-dropdown-menu`, `react-label`, `react-select`,
`react-slot`, `react-tabs`, `react-tooltip`. **Not installed:** `react-progress`. `react-label` was
installed and unused until T1.6 gave it a call site in `Field`.

**`package.json` pins `@radix-ui/react-dismissable-layer` through `overrides`. Do not remove it**
without checking the symptom it fixes. Radix keeps its layer stack in a module-level React context,
so two copies of that package are two stacks that cannot see each other, and every layer then
believes it is the topmost: one Escape dismisses a Select *and* the Dialog around it. Adding
`react-select` created exactly that split (1.1.19 against `react-dialog`'s 1.1.11) and `npm dedupe`
will not merge them, because each parent pins its own. Outside-click layering keeps working
throughout, which is what makes the split easy to miss — only the Escape path reads the shared
stack. Any new Radix package needs this checked: `npm ls @radix-ui/react-dismissable-layer --all`.
T1.5 checked it after adding `react-tabs` and `react-tooltip`: tooltip pulls the layer and dedupes
onto the override, tabs does not use it at all. One stack. T1.6 checked it again after adding
`react-accordion`, which does not pull the layer either.

### Existing primitives (23, in `src/components/ui/`)

`Button` (7 variants, 5 sizes, 25 importers) · `Badge` (9 variants) · `Input` (no variants)
· `Select` (sizes sm/default, error state, leading icon, clearable) · `Table` · `DataTable` ·
`Pagination` · `Modal` · `Sheet` · `Tabs` · `Accordion` · `Tooltip` · `Alert` ·
`SegmentedControl` · `Field` · `Avatar` · `Separator` · `Progress` · `ScoreDial` · `DomainBar` ·
`EmptyState` · `PageHeader` (admin only) · `StatCard`. Everything else in the plan is greenfield.

Two app-level compositions sit outside `ui/` because they are *uses* of the primitives, not
primitives: `src/components/password-field.tsx` (a `Field` + `Input` + show/hide toggle, used by all
four auth forms and `/account`) and `src/components/password-strength.tsx`.

`Select` carries one rule worth knowing before using it: Radix rejects an item value of `""`, so the
wrapper translates it to a private sentinel and back. A call site writes `value=""` for the "All …"
row exactly as it did with `<option>`, and **"nothing selected" is `undefined`, not `""`** — that is
what shows the placeholder. Passing `name` renders a mirror input so GET filter forms and server
actions still receive the value; there is no native `<select>` left in the app.

`Table` and `DataTable` (T1.4) carry three rules, all of which survived T1.9 migrating the 13
hand-rolled tables onto them:

- **`stickyHeader` caps the scroll container at `max-h-[70vh]`.** The wrapper that keeps a wide
  table off the *page's* horizontal scrollbar is by CSS a vertical scrollport too, so an unbounded
  one has its top edge exactly where the header already is and nothing appears to stick. Override
  the cap through `containerClassName`, do not remove it.
- **The table uses `border-separate`, and row rules live on the cells, not a `divide-y`.** A
  collapsed table owns every border and drops the header's the moment it detaches. `<tr>` cannot
  carry a border in the separate model — put row styling on `TD`, or on `TBody` via an arbitrary
  variant, as `TBody` already does for hover.
- **`DataTable` state lives in the URL, not the component.** `?q=` `?sort=` `?dir=` `?page=`, named
  by `dataTableParams(prefix)` so a server page reads the same keys. `mode="server"` takes one page
  plus a `total` and does no filtering itself — that is the `/admin/questions` 100-per-page shape,
  and it needs no new params. Two tables on one page need different `paramPrefix` values.
  Client-mode sorting falls back to the text a `cell` renders, which is wrong for a date or a
  badge: give those columns a `sortValue`.

The T1.5 six carry their own rules:

- **`Modal` and `Sheet` both require a `title` prop.** Not a slot — a dialog with no accessible
  name is a bug you can forget to make, and Radix only warns. `Sheet` has `hideTitle` for the
  visually-hidden case. `Modal`'s `dismissable={false}` removes Esc, click-outside **and** the ✕
  together; it is for a flow where dismissing loses something unrecoverable (a one-time secret, a
  request in flight), not for making a message harder to ignore.
- **`Tooltip` is supplementary. Nothing may live only inside one.** It brings its own provider, so
  it works without touching a layout — necessary, since every `layout.tsx` here is a server
  component. Two behaviours to know: a *touch* gesture makes it tap-to-toggle (Radix Tooltip is
  hover/focus only and shows nothing on a tap), classified per gesture from `pointerType` rather
  than from `(hover: none)` at mount; and `<TooltipTrigger disabled>` wraps the child in a
  focusable span, which is the only way a tooltip on a disabled control ever opens.
- **`SegmentedControl` is a `radiogroup`, not tabs.** Use it when it sets a value and nothing below
  is a panel. Fully controlled, two to four options — past four the labels stop fitting at 360px
  and the answer is `Select`.
- **`Tabs` `variant="pill" tone="inverted"` reproduces the `AdminNavLinks` treatment class for
  class**, so that nav can move onto it later. It has not moved: those are links, and links are not
  tabs.
- **`Alert` is not a live region by default.** Pass `live` only when it appears in response to
  something the reader just did; the role then follows the variant.

The T1.6 five:

- **`Field` owns the wiring, not the styling.** It sets `id`/`htmlFor`, an `aria-describedby`
  covering the hint *and* the error, and `aria-invalid`. The red border is no longer a class a call
  site remembers: `Input` styles `aria-[invalid=true]` itself, so the attribute a screen reader
  needs is the same one that turns the border red. A single child is cloned with those props and a
  child's own `id`/`aria-describedby` always wins; a control inside a wrapper takes the render-prop
  form. **`required` renders no asterisk** — the copy rules mark the exceptions, so pass `optional`.
  The error is not a live region, same rule as `Alert`.
- **`Avatar` derives its hue from `seed`, and `seed` is the user id.** Not the name — an avatar that
  changes colour when someone renames themselves stops being recognisable. Six hues, none of them
  emerald, amber or red: those mean correct, time and incorrect, and a person is not a status.
  `hueIndex()` is pinned by `tests/ui-primitives.test.ts`, so changing the hash is a deliberate act.
  No image branch, because `User` has no `image` column.
- **`Pagination` shares `?page=` with `DataTable` on purpose**, plus `?perPage=`, named by
  `paginationParams(prefix)`. A `?perPage=` that is not one of the offered `pageSizeOptions` is
  ignored. Passing `onPageChange` (or `onPageSizeChange`) makes that half controlled and it writes
  no URL. It renders nothing at `total: 0` — that surface wants an `EmptyState`. **T1.9 wired it
  into `DataTable`,** replacing that component's inline prev/next; the swap was a deletion rather
  than an integration, because the two already shared `?page=` on purpose. `DataTable` passes
  `page` and `onPageChange` — it has already clamped the page against `total`, and letting
  `Pagination` re-read a hand-edited `?page=` would put the overshoot back on screen.
- **`Separator` is for the two cases a `border-t` cannot do**: vertical, and labelled. Everything
  else should stay a border. Decorative by default; the labelled form carries no role at all,
  because a separator's children are presentational and the label would be hidden.
- **`Accordion` needs `headingLevel` set to whatever the page's outline says.** Radix wraps every
  trigger in an `<h3>`, which is right under an `<h2>` and wrong under an `<h1>`, and only the page
  knows. The panel animation reads `--radix-accordion-content-height`, so its two keyframes live in
  `tailwind.config.ts` rather than `globals.css`.

The T1.7 three — the score-report language, now shared by results, progress and admin:

- **`Progress` grades by default, and `gradeOf()` owns the cuts** — emerald ≥75, blue ≥50, amber
  ≥25, red below. They came from the results page's domain breakdown and are now the product's one
  grading scale; `tests/ui-primitives.test.ts` pins them, because no score is stored and every bar
  in every historical attempt is recomputed on render. Difficulty colours are *not* this scale and
  must not be folded into it: 40% on hard is not the same news as 40% on easy, so a difficulty bar
  passes `barClassName`. T1.8 removed the only other escape-hatch use: the results page's two
  section-score bars passed `bg-gradient-primary` / `bg-gradient-accent` and now pass nothing, so
  they grade like everything else.
  **A bar with no `label` is `aria-hidden`**, because it nearly always sits under text that already
  reads "12 / 15 · 80%"; pass `label` only when the bar is the only place the number appears.
- **`variant="scoreBand"` is the relative reading, `ScoreDial` is the absolute one.** A band takes
  `min`, so 200–1600 and 200–800 both work and a 200 correctly draws empty. A dial does not: it is
  `value / max`, and the bug this extraction fixed was the results page mapping 400–1600 onto the
  ring, so an SAT floor of 400 — a real score, not an absent student — rendered as an empty circle.
  Ticks are `scoreBandTicks()`, the smallest round step giving at most eight intervals; only three
  are labelled, because eight 11px labels do not fit 360px.
- **`ScoreDial` puts `role="img"` on the wrapper, not the SVG**, so the number, the sublabel and the
  delta chip announce as one sentence — ARIA makes an `img`'s children presentational. Everything
  visible must therefore also be in the label. The sweep is **keyframes, not a transition**: a
  server render has no value change for a transition to catch, so the old `transition-all
  duration-1000` never fired. `score-dial` interpolates between two inline custom properties and
  lives in `tailwind.config.ts` for the same reason the accordion's does; `forwards` is what makes
  the global reduced-motion override land on a full ring instead of an empty one.
- **`DomainBar` takes `label` as a node rather than a `tooltip` prop, and that is a bundle
  decision.** It was written with a `tooltip` prop first and it cost `/results/[attemptId]` 31 kB of
  client JavaScript — 94.2 kB first load to 125 kB — because a static import of a client component
  is paid whether or not the optional prop is ever passed, and that page passes it nowhere. Any
  primitive tempted to reach for `Tooltip`, `Modal` or `Sheet` behind an optional prop has the same
  problem. Compose the trigger at the call site around `DomainBarLabel`.

T1.9 migrated all 13 hand-rolled tables and left four rules behind:

- **`dataTableParams` lives in `src/lib/table-params.ts`, not in `data-table.tsx`.** Every export of
  a `"use client"` module — plain functions included — becomes a client *reference* when a Server
  Component imports it, so calling the client copy on the server throws at request time rather than
  at build time. `data-table.tsx` re-exports it for client call sites; **a server page must import
  it from `@/lib/table-params`.** That module also has `readTableParams` (searchParams → `{q, sort,
  dir, page, skip}`) and `orderByFrom`, which maps `?sort=` onto a **whitelist** of orderings.
  The whitelist lookup is `hasOwnProperty`, not `orderings[sort]`: a plain object literal still
  inherits from `Object.prototype`, so `?sort=constructor` found a truthy non-ordering and
  `?sort=__proto__` found something that was not callable. Both crashed the page until
  `tests/table-params.test.ts` went looking. The same fix is inlined in the analytics comparator.
- **`DataTableFilter` is what the `filters` slot is for.** A `Select` that writes its param to the
  URL on change and resets the table's page. There is no Filter button anywhere any more — the
  search box already navigates on its own debounce, and a bar where one control applies itself and
  the other waits for a button is unpredictable. The param is **not** run through `paramPrefix`: a
  filter belongs to the page's query, not to the table's view state.
- **A server page whose filters live in its `where` must pass `filtersActive`.** The component can
  only see its own search box, so without that flag an over-filtered list renders as "no rows yet"
  — an empty database rather than a narrow filter. `filterParams` names what "Clear filters" wipes.
- **Not every table wants a `DataTable`.** Four deliberately stayed on the bare `Table` primitives:
  `/admin` (the eight most recent attempts — searching a deliberately truncated window lies about
  what it holds), `/dashboard` history (the abandoned-attempt disclosure is a grouped `<tr>` a flat
  row list cannot express, and it is a student route), the import preview (rows that have no ids
  and vanish on reload — a shareable URL would restore a filter over nothing), and the results
  difficulty breakdown (three fixed rows; `DataTable` is a client component and this page is the
  one whose bundle T1.7 already fought over). All four stayed at zero client JavaScript.

T1.8 added two `Button` options:

- **`variant="soft"` is the repeated-list action.** A rail of five `primary` cards fights itself
  and a rail of five `secondary` ones reads as disabled; `soft` is a tinted surface that still says
  "the primary action of this card" while the page keeps one real primary. Use it for the action
  that appears on every card in a list, and for a filter bar's submit — primary *of that bar*, not
  of the page. It is not a quieter `primary` for one-off CTAs.
- **`size="xs"` (h-8) is for table rows and dense toolbars**, where `sm`'s h-9 already crowds the
  row. Keep every button in a given row at the same size or the rows change height between states.

---

## Definition of done

- [ ] Every acceptance criterion verified and reported individually
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] `npx tsc --noUnusedLocals` introduces no new dead imports
- [ ] Full-support routes render at 360px with no horizontal scroll
- [ ] New interactive components keyboard-operable with a visible focus ring
- [ ] New primitives added to the `/ui` gallery (after T1.2)
- [ ] No new gradient exceeds the budget
- [ ] No raw hex outside `src/app/test/attempt/**`, no `_CLS` class constants, no hardcoded stats

---

## Open decisions

Do not guess. Ask if a task depends on an unresolved one.

1. **Primary audience — student or tutor?** Blocks all landing copy (Phase 3).
2. ~~Does adaptive mode ship?~~ **Answered: yes, in code.** Query `Test.mode` where `isPublic` to
   see whether *published data* is adaptive before writing landing copy about it.
3. **Paid tiers?** "Free to use" appears repeatedly on the landing page.
4. **Content licensing.** The bank references "Official SAT Practice Test 4". Blocks the public demo
   and the stats strip.
5. ~~Chart library or hand-rolled?~~ **Answered: hand-rolled.** `score-trend.tsx` already is, and no
   charting dep is installed. Ratified.
6. ~~zustand — installed with zero imports.~~ **Answered in T1.9: removed.** Nothing in the app
   had state that outgrew React context — the toast provider is one and works — so the dependency
   was uninstalled rather than given a make-work call site. **`docs/prompts/C-student.md:318` and
   T7.2 still plan a `use-test-store.ts`; that task must `npm i zustand` first.**
7. **Mobile test-taking: support or warn?** Blocks T7.4.
8. **Localisation** (Azerbaijani/Russian). Cheap now, expensive after Phase 8.
