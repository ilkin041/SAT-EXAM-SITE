# CLAUDE.md

Place this at the repo root. Claude Code reads it automatically at the start of every session.

---

## Project

A self-hosted Bluebook-style Digital SAT practice platform. Students take timed, module-based
practice tests in an interface that mirrors the real Digital SAT; tutors/admins manage a question
bank, assemble tests, group students, and review attempts.

**Stack:** Next.js 14 (App Router, RSC-first), React 18, TypeScript, Tailwind 3, Radix UI,
NextAuth v5 (credentials), Prisma + PostgreSQL, Zustand, Cloudinary, Resend, KaTeX, Desmos.

**Architecture rule:** server components by default. Interactivity lives in small, explicitly
named client islands. Do not add `"use client"` to a page or layout — push it down to the
smallest component that needs it.

---

## How to work on a task

1. You will be given a task prompt with an ID like `T2.4`. The full rationale for every task is in
   `docs/improvement-plan.md` — read the relevant phase section before starting.
2. **Plan first.** List the files you will create and modify, and any schema changes, before writing
   code. If the task's scope seems wrong for the codebase as it actually is, say so and stop.
3. Stay inside the task's scope. Each prompt has an explicit **Out of scope** list — respect it.
   If you spot an unrelated problem, note it at the end of your response instead of fixing it.
4. Work in small commits with conventional messages (`feat:`, `fix:`, `refactor:`, `chore:`).
5. Finish by running the verification commands and reporting the acceptance criteria one by one,
   each marked pass or fail. Do not claim a criterion passes without having checked it.

---

## Never break these

These are the load-bearing parts of the product. Changes here need tests first.

- **The test-taking interface** (`/test/attempt/[attemptId]`). A student mid-exam losing answers is
  the worst possible failure. Before refactoring it, Playwright coverage must exist and pass
  (task T6.1). Never touch it in a task that is not explicitly a Phase 6 task.
- **Answer persistence and the server-anchored clock.** Do not move timing logic client-side.
- **Scoring logic.** Raw→scaled conversion is correctness-critical. Changes require a test.
- **Auth and session handling.** No task in this plan should need to modify NextAuth config; if one
  seems to, stop and ask.

---

## Design policy

The design tokens already exist in `globals.css` and are good. The problem is application
discipline. These rules are enforced in review.

### Gradient budget

**One gradient-filled element per viewport. No exceptions.**

| Token | Reserved for |
|---|---|
| `--gradient-primary` (indigo→violet) | The single primary CTA on a page, **or** the score gauge, **or** the hero signature — never two at once |
| `--gradient-accent` (violet→purple) | AI features only. Violet means "a model produced this" |
| `--gradient-warm` | Resume / in-progress / time pressure only |
| `--brand-navy` | Admin chrome only |
| `--accent-warm` (amber) | Time, pacing, in-progress. Never decorative |
| `success` (emerald) | Correct, completed, mastered |
| `destructive` | Incorrect, destructive actions, offline |

Consequences: the logo mark is solid indigo, not gradient. Hero headlines are solid ink.
Repeated list actions (test cards, table rows) use `variant="soft"`, never a gradient fill.

### Numbers are mono

Every number in this product is set in IBM Plex Mono with `tabular-nums`: timers, scores, question
counts, percentages, dates, table figures, stat values. Plus all eyebrow labels
(`FEATURES`, `MODULE 1 · MATH`) in mono uppercase at `0.08em` tracking.

Use the `.tabular` utility. Never hand-roll `font-mono tabular-nums` inline.

### Type scale

Use the tokens; do not invent sizes.

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

Marketing body copy is `--text-body-lg` at `max-w-[52ch]`. App body is `--text-body`.

### Spacing

Marketing sections: `py-16 md:py-24` maximum. App pages: `py-10`.
Density comes from content, not padding. If a section looks empty, add content or cut the section —
do not add vertical space.

### Motion

- One orchestrated load sequence per page (60ms stagger), not `animate-fade-in` on every card.
- Scroll reveal at most once per section: `translateY(12px)` + opacity, 350ms, `once: true`.
- Ambient/looping animation is banned except inside the hero signature component.
- Everything respects `prefers-reduced-motion` via the global block in `globals.css`.

### Colour tokens

Never write a raw hex or `rgb()` in a `.tsx` file. Never use `style={{ color }}`. If a colour you
need does not exist as a token, add the token.

---

## Copy rules

Words are design material. Apply these to every string you write.

- **Active voice, plain verbs.** "Save changes", not "Submit". "Start test", not "Begin testing".
- **An action keeps its name through the whole flow.** The button that says "Publish" produces a
  toast that says "Published".
- **Errors say what happened and what to do. They never apologise and are never vague.**
  - Bad: "Something went wrong. Please try again."
  - Good: "That email and password don't match an account. Check the email, or reset your password."
- **Empty states are invitations to act,** with a CTA — not "No data".
- **Sentence case everywhere** except mono eyebrows (uppercase).
- **Never state a number the product cannot back.** No hardcoded marketing statistics, no invented
  percentiles, no fabricated testimonials, no comparison to an unstated distribution. If a figure
  is not queried from the database, it does not ship.

---

## Accessibility floor

Every task ships to this floor. It is not a separate phase.

- Visible `focus-visible` ring on every interactive element, including gradient-filled buttons
  (use `ring-offset-2 ring-offset-background`).
- All icon-only buttons have `aria-label`; all decorative SVG has `aria-hidden`.
- Correct heading order; one `h1` per page.
- Form controls have programmatic labels; errors announced via `aria-describedby`.
- Status is never communicated by colour alone.
- Keyboard-traversable, including modals (focus trap, restore on close).
- No horizontal scroll at 360px on any full-support surface (see responsive policy below).

---

## Responsive policy

Do not half-support surfaces. Each has a defined target:

| Surface | Target |
|---|---|
| Landing, auth, content pages | Full support from 360px |
| Dashboard, progress, results, review, account | Full support from 360px |
| Practice/drill runner | Full support — this is the mobile use case |
| Full test interface | Tablet-first; phone is supported-but-warned |
| Admin | Read on mobile (card lists below `md`), edit on desktop |

---

## Conventions

- **Components:** `src/components/ui/` for primitives, `src/components/<feature>/` for feature
  components. One component per file, named export, `ComponentName.tsx`.
- **Variants:** CVA. No prop-to-className string concatenation.
- **Client islands:** name them `*Client.tsx` or place under a `client/` folder so the boundary is
  obvious in a file listing.
- **Data:** fetch in server components; never fetch in a client component if an RSC can do it.
- **Prisma:** all queries in `src/lib/queries/` or a server action — never inline in a page beyond
  a simple `findMany`.
- **Never** use `localStorage` for anything that must survive a device change; it is fine for
  theme and UI preferences only.
- **New dependencies require justification.** Prefer hand-rolled SVG over a charting library for
  fewer than ~8 charts.

---

## Definition of done

A task is done when all of these are true:

- [ ] Every acceptance criterion in the prompt is verified and reported individually
- [ ] `pnpm typecheck` and `pnpm lint` pass with no new errors
- [ ] `pnpm build` succeeds
- [ ] The affected routes render at 360px with no horizontal scroll (for full-support surfaces)
- [ ] New interactive components are keyboard-operable with a visible focus ring
- [ ] New components have an entry in the `/ui` gallery (after T0.4 exists)
- [ ] No new gradient-filled element violates the gradient budget
- [ ] No hardcoded numbers, no raw hex, no `SELECT_CLS`-style class constants introduced
- [ ] Any new user-facing string follows the copy rules above

---

## Commands

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
pnpm test            # unit
pnpm test:e2e        # Playwright (exists after T6.1)
pnpm prisma migrate dev --name <name>
pnpm prisma studio
pnpm analyze         # bundle analyzer (added in T0.6)
```

---

## Open decisions

Do not guess on these. If a task depends on one and it is unresolved, ask.

1. **Primary audience — student or tutor?** Blocks all landing copy (Phase 2).
2. **Does adaptive mode actually ship?** Every visible test is `LINEAR` while the landing page leads
   with adaptive routing. Blocks T2.6.
3. **Will there be paid tiers?** "Free to use" appears four times on the current landing page.
4. **Test-content licensing.** The bank references "Official SAT Practice Test 4". Any public demo
   question must be originally authored, not College Board content. Blocks T2.3.
5. **Mobile test-taking: support or warn?** Blocks T6.4.
