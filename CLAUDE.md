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
npm test                      # vitest, 70 tests
npm run lint                  # next lint --no-cache --max-warnings=0; must be clean
npm run analyze               # ANALYZE=true next build -> .next/analyze/*.html
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

8 of 30 routes still violate this (was 17 before T0.6 fixed shared chrome). Per-route before/after
counts are in `docs/gradient-audit.md`. `/dashboard` has 6, `/` has 5 — both owned by T1.8.

| Token | Reserved for |
|---|---|
| `--gradient-primary` | The single primary CTA on a page, **or** the score gauge, **or** the hero signature — never two at once |
| `--gradient-accent` | **UNASSIGNED.** Was reserved for AI features; the AI feature was removed 2026-08-06. Do not silently reuse it — ask before assigning |
| `--gradient-warm` | Resume / in-progress / time pressure only |
| `--brand-navy` | Admin chrome only |
| `--accent-warm` (amber) | Time, pacing, in-progress. Never decorative |
| `success` (emerald) | Correct, completed, mastered |
| `destructive` | Incorrect, destructive actions, offline |
| `--ink` / `--paper` / `--paper-sunk` | Editorial pair: highest-contrast text, its sheet, a recessed well within it. Inverted (not dimmed) in dark; `paper-sunk` recedes in both. Available as `text-ink`, `bg-paper`, `bg-paper-sunk` |

Shared chrome is already clean (T0.6): `AdminNav` is down to its one navy bar, and `StudentNav`,
`UserMenu` and `PageHeader` carry none. What is left is page-level and belongs to T1.8.

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

## Copy rules

- Active voice, plain verbs. "Save changes", not "Submit".
- An action keeps its name through the flow. "Publish" → toast says "Published".
- **Errors say what happened and what to do. Never apologise, never vague.**
- Empty states are invitations to act, with a CTA.
- Sentence case except mono eyebrows.
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

### Radix packages

Installed: `react-dialog`, `react-dropdown-menu`, `react-label`, `react-select`, `react-slot`.
**Not installed:** `react-tabs`, `react-tooltip`, `react-accordion`, `react-progress`. Phase 1 adds
these — budget for it.

**`package.json` pins `@radix-ui/react-dismissable-layer` through `overrides`. Do not remove it**
without checking the symptom it fixes. Radix keeps its layer stack in a module-level React context,
so two copies of that package are two stacks that cannot see each other, and every layer then
believes it is the topmost: one Escape dismisses a Select *and* the Dialog around it. Adding
`react-select` created exactly that split (1.1.19 against `react-dialog`'s 1.1.11) and `npm dedupe`
will not merge them, because each parent pins its own. Outside-click layering keeps working
throughout, which is what makes the split easy to miss — only the Escape path reads the shared
stack. Any new Radix package needs this checked: `npm ls @radix-ui/react-dismissable-layer --all`.

### Existing primitives (7, in `src/components/ui/`)

`Button` (107 LOC, 6 variants, 4 sizes, 25 importers) · `Badge` (9 variants) · `Input` (no variants)
· `Select` (sizes sm/default, error state, leading icon, clearable) · `EmptyState` · `PageHeader`
(admin only) · `StatCard`. Everything else in the plan is greenfield.

`Select` carries one rule worth knowing before using it: Radix rejects an item value of `""`, so the
wrapper translates it to a private sentinel and back. A call site writes `value=""` for the "All …"
row exactly as it did with `<option>`, and **"nothing selected" is `undefined`, not `""`** — that is
what shows the placeholder. Passing `name` renders a mirror input so GET filter forms and server
actions still receive the value; there is no native `<select>` left in the app.

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
6. **zustand** — installed at `^5.0.2` with zero imports. Use in T7.2 or remove.
7. **Mobile test-taking: support or warn?** Blocks T7.4.
8. **Localisation** (Azerbaijani/Russian). Cheap now, expensive after Phase 8.
