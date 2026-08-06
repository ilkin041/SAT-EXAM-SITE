> **STATUS: rationale only, partly superseded.**
> Written before the codebase was audited. `docs/recon.md` §0 lists twelve
> places this document is wrong about the code, and `docs/ROADMAP.md` +
> `docs/prompts/` are the current task list. Read this for *why*; read
> recon for *what is actually there*. On any conflict, recon wins.

# SAT Practice Platform — Frontend & UX Improvement Plan

**Scope:** frontend, design system, UI/UX, new landing page, new student- and admin-facing features.
**Basis:** the architecture doc you provided plus a screen-by-screen read of the live app (landing, dashboard, history, account, login).

---

## 0. How to read this

- **§1 Diagnosis** — what is actually wrong, ranked. Read this even if you skip everything else.
- **§2 Direction** — the design thesis and the token/type rules that every later phase depends on.
- **§3 Phase map** — the sequence and why it's in that order.
- **Phases 0–10** — each has *Goal → Why → Work items → Acceptance criteria → Effort*.
- **Appendices** — component build list, landing copy deck, schema additions, metrics, quick wins.

Effort estimates assume one full-time developer who knows the codebase. `S` = ≤1 day, `M` = 2–4 days, `L` = 1–2 weeks, `XL` = 2–4 weeks.

---

## 1. Diagnosis

### 1.1 The seven systemic problems

**P1 — The landing page sells a product the app doesn't deliver yet.**
The hero's first feature is *Adaptive Testing*, but every test on the dashboard is badged `LINEAR`. The stats banner claims "4 Full-Length Tests" while the dashboard lists 5, and "236+ Practice Questions" while the visible tests total ~255. The banner also says "Full-Length Tests" but Practice Test 0 is a math-only single-section test. Hardcoded marketing numbers that contradict the running product are the fastest way to lose a visitor who then signs up and sees the mismatch. Every number on the landing page should be queried, or removed.

**P2 — Gradient inflation has flattened the visual hierarchy.**
Indigo→violet is used for: the logo mark, the primary button, the hero H1 span, the auth left panel, the dashboard welcome banner, the student name, two of three stat tiles, all five `Start test` buttons, the accent badge, the score gauge, the footer rule, and the admin nav badge. When the loudest treatment is applied to everything, nothing is loud. On the dashboard (image 4) the five identical full-width gradient bars are the strongest thing on screen — but "start a test I've never taken" is not five equally-weighted decisions, and the *actually* important action (resume, or review my last score) has no visual presence at all.

**P3 — Vertical space is spent on nothing.**
The landing page's stats strip (image 2) sits under an empty ~160px band. The "Three easy steps" cards (image 3) are 3 short lines each inside a section that occupies a full viewport. The CTA banner is ~280px tall for one headline and two buttons. The page reads as *sparse*, not *spacious*, because there's no density anywhere to contrast against. Meanwhile the Account page (image 6) is two thin cards on an otherwise blank screen.

**P4 — The product's best asset is invisible before signup.**
The ~1,500-line test interface — resizable passage split, Desmos, ABC eliminator, passage highlighting with notes, server-anchored clock, duplicate-tab lock — is genuinely good, and no visitor can see any of it. The hero shows a hand-built CSS *fake* of a question screen. There are no real screenshots, no demo, no try-without-account path. You are hiding the only thing that differentiates you.

**P5 — Scores are being reported in a way that misleads.**
The dashboard shows `AVG SCORE 415` / `BEST SCORE 430` out of an implied 1600. Given the test list, at least one of those attempts is a section-only or partial test. A student who takes a Math-only test and sees "430" without a qualifier will read it as a 430/1600 — which is below the floor of a real two-section SAT (400) and reads as catastrophic. Section-only attempts must display a section score (`/800`) with an explicit label, and must be excluded from or clearly separated in "average score."

**P6 — No shared primitives means the design system exists only on paper.**
`SELECT_CLS` string constants, per-page table implementations, no Modal/Tabs/Tooltip/Skeleton. Every new admin page re-derives the styling, and every re-derivation drifts. The token file is excellent; the component layer that would enforce it doesn't exist.

**P7 — No loading, error, or offline states outside the test interface.**
No `loading.tsx`, no `error.tsx`, no skeletons. On a slow connection the RSC-first architecture means a blank screen followed by a full page. The test interface has a beautiful connectivity banner and save indicator — that care stops at the test's edge.

### 1.2 Screen-by-screen findings

**Landing — hero (image 1)**
- `Digital SAT Practice ,` — there's a space before the comma. It's a `<span>` boundary; fix the whitespace.
- Headline says "Built for **Your Students**" (tutor-addressed) but every CTA lands on a student signup and a student dashboard. The page has an unresolved audience. Pick one primary and give the other its own band. (See §2.4.)
- Hero occupies ~640px with three short copy blocks; the right column mock card carries the whole composition and is `lg:block` only — on mobile the hero is a wall of text.
- Green check row ("Timed modules · 200–800 scoring · Free to use") is the same weight as body copy; it should be either a real feature strip or removed.
- The animated 15s gradient-mesh background is expensive and, at this opacity, reads as "vaguely purple." It fails the "would anyone notice if it were static?" test.

**Landing — stats + features (image 2)**
- The `∞` glyph sits on a different optical baseline than `1600` / `236+` / `4`. Use a rendered `∞` at matched cap-height or the word "Unlimited."
- Feature cards are white-on-white with a 40px icon tile and no hover state visible in a static screenshot — which is how a visitor scrolling at speed sees them. The per-card gradient wash only exists on hover.
- Card copy tells rather than shows. "Module 2 difficulty routes from Module 1 performance" is exactly the thing a 6-second animation would communicate better than a sentence.

**Landing — steps + CTA + footer (image 3)**
- Numbered markers *are* justified here (it is a real sequence), but the connecting gradient line is nearly invisible at this contrast.
- Footer has three links total. No privacy, terms, contact, FAQ, or any SEO surface.
- Two competing CTAs ("Get Started Free" + "Log in") in the closing band — the closing band should have one.

**Dashboard (image 4, 5)**
- Stat tiles are three small squares crammed into the hero's right edge; on a 1536px viewport they occupy <20% of the banner width while the welcome copy has an empty column beside it.
- All five test cards are visually identical except for the title. No last-score, no best-score, no "you've taken this," no estimated time, no difficulty hint. A returning student cannot tell which test to take next.
- `Practice Test 0` has a 2-line description; the other four have none. Cards are ragged.
- Test titles are `Practice Test 0…4` — zero information. This is a content problem, but the UI should surface *something* (source, section mix, length).
- History table: three `Abandoned` rows with disabled buttons occupy 60% of the table. Dead rows should collapse.
- No progress-over-time anywhere. The single most motivating thing in a prep product is the line going up, and it doesn't exist.

**Account (image 6)**
- Both submit buttons render in a washed lavender that reads as *broken* rather than *disabled-until-changed*. Either keep them enabled and validate on submit, or use a clearly-disabled treatment plus helper text ("Change your name to enable saving").
- Missing: email change, timezone, notification preferences, test-day date, accessibility preferences (text size, reduced motion), data export, delete account.

**Login (image 7)**
- Solid, but the gradient panel is a flat 50% of a 1536px screen carrying one icon, two lines and a pill. It's the most expensive real estate on the page doing the least work.
- On mobile the panel disappears entirely, so the brand disappears with it.
- `Sign in` button is the only saturated element and it's a solid indigo, while the panel beside it is a gradient — the two indigos don't match, so the page has two blues.

---

## 2. Design direction

### 2.1 The thesis

**The subject is the exam, and the exam has its own visual vernacular** — monospaced countdown clocks, `QUESTION 14 OF 22`, A/B/C/D answer letters, the strikethrough eliminator, the mark-for-review flag, the 200–800 scale, the module review grid. That vernacular is specific, credible, and *already living inside your test interface*. Right now the marketing layer ignores it entirely in favour of generic SaaS gradient-mesh, which is why the landing page could be selling a CRM.

**Direction: "Exam-grade."** The marketing surface borrows the test interface's own materials — mono numerals, answer-choice geometry, the score band — and spends its boldness in exactly one place.

**Signature element: a real, playable SAT question in the hero.** Not a CSS mock. A live component with a running timer, working answer choices, a working ABC eliminator, and — on submit — the real explanation and a real "here's what your score report would look like" hand-off. It is simultaneously the demo you don't have, the social proof you can't fabricate, and a working preview of the product's core loop. Everything else on the page stays quiet so this lands.

**Second structural device: the score band.** The 200→800 scale rendered as a ruler/track appears as a repeating motif — behind the hero headline as a hairline, as the section score bars, as the results gauge, as the progress chart's axis. It's a structural device that encodes something true about the content rather than decorating it.

### 2.2 Palette rules (keep the tokens, add the discipline)

Your token set is good. The problem is application policy, not values. Add these rules to `globals.css` as comments and enforce in review:

| Token | Reserved for |
|---|---|
| `--gradient-primary` (indigo→violet) | **One element per viewport.** The single primary CTA, or the score gauge, or the hero signature — never two at once. |
| `--gradient-accent` (violet→purple) | ~~AI features only.~~ **Unassigned as of 2026-08-06** — the AI explanation feature was removed and nothing else may claim this token without a new rule. |
| `--gradient-warm` | Resume / in-progress / time-pressure only. |
| `--brand-navy` | Admin chrome only (already correct). |
| `--accent-warm` (amber) | Time, pacing, in-progress. Never decorative. |
| `success` (emerald) | Correct, completed, mastered. |
| `destructive` | Incorrect, destructive actions, offline. |

**Concrete consequences:**
- Dashboard `Start test` buttons become `variant="secondary"` (solid surface + border). Only the *Resume* card gets the gradient.
- Hero H1 gradient span goes away — the H1 is set in solid ink; the gradient lives in the signature demo only.
- Logo mark becomes solid indigo, not gradient.
- Auth left panel becomes a single solid deep indigo with the dot lattice, not a gradient — so the `Sign in` button's indigo and the panel's indigo are the *same* blue.

Add two neutrals so surfaces stop being pure white on pure white:

```css
--ink:        222 47% 11%;   /* #0F172A-ish — headlines, dark surfaces */
--paper:      228 33% 98%;   /* page background */
--paper-sunk: 228 20% 95%;   /* recessed bands, table headers */
```

### 2.3 Type

Keep **Plus Jakarta Sans** for UI and body. Add **one** face and let it carry the personality:

**IBM Plex Mono** (or JetBrains Mono) — the *data and eyebrow* face.

Rule: **every number in this product is mono.** Timers, scores, `QUESTION 14 OF 22`, question counts, percentages, table numerals, the stats strip, the score gauge, dates. Plus all eyebrow labels (`FEATURES`, `HOW IT WORKS`, `MODULE 1 · MATH`) in mono uppercase with `0.08em` tracking.

This is the cheapest distinctive move available: it costs one font subset, it is true to the subject (your Bluebook timer is already mono), it instantly separates you from every other Jakarta/Inter ed-tech site, and it makes score comparisons legible because mono digits are tabular by default.

Type scale — replace ad-hoc sizes with these tokens:

```css
--text-display:  clamp(2.5rem, 4.5vw + 1rem, 4rem);   /* 800, -0.035em, 0.95 */
--text-h1:       clamp(2rem, 2.5vw + 1rem, 2.75rem);  /* 800, -0.03em,  1.05 */
--text-h2:       clamp(1.5rem, 1.5vw + 0.75rem, 2rem);/* 700, -0.02em,  1.15 */
--text-h3:       1.25rem;                              /* 700, -0.01em,  1.3  */
--text-body-lg:  1.0625rem;                            /* 400, 1.65 */
--text-body:     0.9375rem;                            /* 400, 1.6  */
--text-caption:  0.8125rem;                            /* 500, 1.45 */
--text-eyebrow:  0.6875rem;                            /* mono, 600, 0.08em, uppercase */
```

**Landing body copy should go up, not down.** Current landing paragraphs read at ~15px against a 60px headline — the ratio is why the page feels empty. Marketing body should be `--text-body-lg` at `max-w-[52ch]`.

### 2.4 Positioning (resolve before writing landing copy)

The app is two products: a **student practice tool** and a **tutor/school cohort tool** (groups, assignment, CSV export, JSON import, admin question bank). The current landing page says "Built for Your Students" — tutor language — then sends everyone to a student signup.

**Recommendation: student-first hero, tutor band mid-page.**
Students are the volume, the word-of-mouth, and the people who'll play with the hero demo. Tutors convert on a dedicated band + a `/for-tutors` page. Rewrite the H1 accordingly (copy deck in Appendix B).

If your actual business is tutor-led (you sell to tutors, students are provisioned), invert it: tutor hero, "for students" band, and the demo becomes "see what your students see." **Decide this before Phase 2.** Every downstream copy decision hangs on it.

### 2.5 Motion policy

- One orchestrated page-load sequence per page (staggered 60ms reveal of hero elements), not scattered `animate-fade-in` on every card.
- Scroll reveal at most once per section, `translateY(12px)` + opacity, 350ms, `once: true`.
- Ambient animation (the 15s gradient shift, `float`) is removed from the landing background and reserved for the hero signature only.
- All of the above wrapped in `@media (prefers-reduced-motion: reduce) { animation: none; transition-duration: 1ms; }` — currently missing globally.

---

## 3. Phase map

| Phase | Theme | Effort | Unlocks |
|---|---|---|---|
| 0 | Guardrails & measurement | M | Safe to change anything |
| 1 | Design system hardening | L | Every later phase moves 2× faster |
| 2 | Landing page rebuild | L | Acquisition, credibility |
| 3 | Auth & first-run onboarding | M | Goal data for Phases 4 & 8 |
| 4 | Dashboard v2 + Progress | L | Retention |
| 5 | Results & Review v2 | L | The "why" loop |
| 6 | Test interface refinement | L | Trust, accessibility, mobile |
| 7 | Practice / Drill mode | XL | The biggest missing feature |
| 8 | Goals, nudges, notifications | L | Retention compounding |
| 9 | Admin v2 + analytics | XL | Tutor value, question quality |
| 10 | Mobile, perf, a11y hardening | L | Reach and compliance |

**Sequencing logic.** Phase 1 before everything because primitives are a force multiplier and every later phase otherwise builds more debt. Phase 2 before 4 because acquisition is currently the tighter constraint than retention, and the landing page work forces the positioning decision. Phase 6 (test interface) is deliberately late: it's the highest-risk surface, it already works, and touching it before there are component tests and a state store is how you break the thing students trust. Phase 7 depends on Phase 5's review infrastructure and Phase 9's tagging quality.

**If you only have four weeks:** Phase 0 → Phase 1 (primitives only) → Phase 2 (hero + real stats + FAQ + screenshots) → Phase 4 (resume card + progress page). That combination fixes credibility and retention with the least code.

---

# Phase 0 — Guardrails & measurement

**Effort: M (3–5 days)**

**Goal.** Make it safe and measurable to change the frontend before changing it.

**Why.** You're about to touch every surface. Without loading/error boundaries you'll ship blank screens; without a component gallery you'll ship drift; without baselines you won't know if any of it worked.

### Work items

**0.1 Route-level states** — add `loading.tsx` and `error.tsx` for every route group:
```
app/(student)/dashboard/{loading,error}.tsx
app/(student)/results/[attemptId]/{loading,error}.tsx
app/(student)/results/[attemptId]/review/{loading,error}.tsx
app/admin/**/{loading,error}.tsx
app/(marketing)/error.tsx
app/global-error.tsx
```
`error.tsx` copy follows the skill's rule — say what happened and what to do, in the interface's voice, no apology:
> **This page didn't load.** Something failed on our side. Try again — if it keeps happening, your attempt data is safe and you can return to the dashboard.
> `[Try again]` `[Back to dashboard]`

**0.2 `Skeleton` primitive** + per-route skeletons that match the real layout's box model (not generic grey bars). Dashboard skeleton = hero band + 4 card outlines + table rows.

**0.3 Component gallery** — `app/(dev)/ui/page.tsx`, dev-only, renders every primitive × every variant × light/dark. This is your regression surface for Phase 1.

**0.4 Reduced-motion + focus baseline**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
```
Plus: audit `focus-visible` on gradient buttons — a `ring-primary` on an indigo→violet fill is invisible. Use `ring-offset-2 ring-offset-background ring-ink` on filled variants.

**0.5 Lint guardrails** — ESLint rules banning raw hex in `.tsx`, banning `style={{ }}` for color, and a `no-restricted-syntax` rule flagging `SELECT_CLS`-style class constants.

**0.6 Baselines** — record before you start:
- Lighthouse (mobile + desktop) for `/`, `/login`, `/dashboard`
- `axe` violations count per route
- Route JS bundle sizes (`@next/bundle-analyzer`)
- Product: signup → first attempt started, first attempt → completed, D7 return rate, attempts per active student, abandon rate per test

### Acceptance criteria
- No route can render a blank screen for >200ms without a skeleton.
- Every `error.tsx` offers a recovery action.
- `/ui` renders all primitives in both themes with zero console errors.
- Baseline numbers are written down in the repo (`docs/baselines.md`).

---

# Phase 1 — Design system hardening

**Effort: L (1.5–2 weeks)**

**Goal.** Build the missing component layer so the token system is actually enforced, and codify the rules from §2.

**Why.** P6. You have excellent tokens and no primitives. Every admin page currently re-implements tables and selects, so styling drift is guaranteed and every future phase pays a tax.

### 1.1 Token & policy updates

- Add `--ink`, `--paper`, `--paper-sunk` (§2.2).
- Add the type scale tokens (§2.3) and a `.eyebrow` utility.
- Add IBM Plex Mono via `next/font` as `--font-mono`; add a `tabular` utility (`font-mono tabular-nums tracking-tight`).
- Codify the gradient budget as a comment block at the top of `globals.css` and enforce in PR review.
- Spacing rhythm: define section padding as `py-16 md:py-24` **max** for marketing (down from what reads as ~`py-32`), and `py-10` for app pages. Density comes from content, not padding.

### 1.2 Primitives to build

Priority order. Each goes in `src/components/ui/` with variants via CVA and a gallery entry.

| Component | Notes |
|---|---|
| `Select` | Radix Select wrapper. **Replaces every `SELECT_CLS`.** Sizes sm/default, error state, icon slot. |
| `Table` | `Table`, `THead`, `TR`, `TH`, `TD`, `TableEmpty`, `TableSkeleton`. Sticky header, `tabular-nums` on numeric cells, hover row, zebra off by default. |
| `DataTable` | Composed: search input, filter slot, sort, pagination footer, result count, empty state, loading state. **Every admin table becomes a config, not a re-implementation.** |
| `Modal` | Radix Dialog wrapper standardising sizes, header/footer/scroll body, and destructive variant. |
| `Tabs` | Radix Tabs, two visual variants: `underline` (content) and `pill` (admin nav / segmented). |
| `Tooltip` | Radix Tooltip; needed for domain explanations, adaptive-mode explanation, disabled-button reasons. |
| `Skeleton` | From Phase 0, formalised. |
| `Progress` | Linear bar with `value`, `max`, semantic colour grading, and a `scoreBand` variant that renders the 200–800 ruler motif. |
| `Alert` / `Callout` | info / warning / success / destructive, with icon + title + body + optional action. |
| `SegmentedControl` | For section switching, timed/untimed, chart ranges. |
| `Sheet` | Radix Dialog in a bottom/side drawer — the mobile answer to every admin table and the passage pane. |
| `Pagination` | Shared by questions and attempts. |
| `Avatar` | Initials fallback with deterministic hue; used in nav and admin user tables. |
| `ScoreDial` | Extract the results-page SVG gauge into a reusable component (`value`, `max`, `size`, `label`, `delta`). |
| `DomainBar` | Label + fraction + percent + graded bar. Used on results, progress, and admin analytics. |
| `EmptyState` | Exists — extend with `size` and `illustration` slot. |
| `Field` | Label + control + hint + error, so form markup stops being hand-assembled. |

### 1.3 Refactors enabled

- Replace all `SELECT_CLS` usages (admin questions filters, attempts filters, test settings, question form taxonomy).
- Convert `/admin/questions`, `/admin/attempts`, `/admin/users`, `/admin/tests`, `/admin/groups` tables to `DataTable`.
- Replace the bare `☀/☾` toggle with a proper `ThemeToggle`: lucide `Sun`/`Moon`/`Monitor`, **tri-state** (system / light / dark), Radix DropdownMenu, `aria-label` reflecting current state.
- Button: add `size="xs"`, add `variant="soft"` (tinted surface, no gradient) — this is what the dashboard test cards need so they stop shouting.

### 1.4 State

`zustand` is installed and unused. Decide now:
- **Use it** — create `src/stores/useTestStore.ts` in Phase 6 for the test interface, and `useUIStore` now for theme + toasts + navigator open state. *Recommended.*
- **Or remove the dependency.** An unused state library in `package.json` is a trap for the next developer.

### Acceptance criteria
- Zero `SELECT_CLS`-style constants remain in the codebase.
- Every admin table renders through `DataTable`.
- `/ui` gallery shows all 17 primitives in light + dark with no visual regressions.
- Bundle size for `/admin/questions` does not increase by more than 8kB gzipped.
- No page renders more than one gradient-filled element in the initial viewport.

---

# Phase 2 — Landing page rebuild

**Effort: L (2 weeks)**

**Goal.** Replace the current marketing page with one that shows the real product, states only true numbers, and gives a visitor a way to experience the core loop before signing up.

**Why.** P1 + P3 + P4. The current page makes three claims it can't back, hides the best asset, and has no FAQ, no demo, no proof, and no SEO surface.

**Prerequisite:** the positioning decision from §2.4.

### 2.1 New page structure

```
┌─────────────────────────────────────────────────────────┐
│ HEADER  logo · Product · For tutors · Scoring · FAQ      │  sticky, solid on scroll
│                                    [Sign in] [Sign up]   │
├─────────────────────────────────────────────────────────┤
│ HERO                                                     │
│  eyebrow: BLUEBOOK-STYLE PRACTICE                        │
│  H1 (solid ink, mono-accented)                           │
│  body-lg, 52ch                                           │
│  [Try a question →]  [Create free account]               │
│                                                          │
│  ▓▓▓ SIGNATURE: LIVE QUESTION  ▓▓▓  ← the one bold thing │
│  real question · running timer · working eliminator      │
│  submit → correct/incorrect + real explanation           │
├─────────────────────────────────────────────────────────┤
│ TRUTHFUL STATS  (queried, mono, 4 up)                    │
├─────────────────────────────────────────────────────────┤
│ SEE THE REAL THING  — tabbed screenshots in a frame      │
│  [Test interface][Score report][Answer review][Admin]    │
├─────────────────────────────────────────────────────────┤
│ CAPABILITY BENTO  — 5 tiles, one large w/ routing anim   │
├─────────────────────────────────────────────────────────┤
│ SCORE REPORT ANATOMY  — annotated real screenshot        │
├─────────────────────────────────────────────────────────┤
│ FOR TUTORS band  (inverted navy — admin's own colour)    │
├─────────────────────────────────────────────────────────┤
│ HOW IT WORKS  — 3 steps, tightened                       │
├─────────────────────────────────────────────────────────┤
│ HOW SCORING WORKS  — honest methodology, links to /scoring│
├─────────────────────────────────────────────────────────┤
│ FAQ  — accordion, 8 items                                │
├─────────────────────────────────────────────────────────┤
│ CLOSING CTA  — ONE button                                │
├─────────────────────────────────────────────────────────┤
│ FOOTER  — 4 columns, real links                          │
└─────────────────────────────────────────────────────────┘
```

### 2.2 The signature: `<LiveQuestionDemo />`

This is the phase's centrepiece and the highest-leverage single component in the plan.

**Behaviour**
- Loads 3 curated public questions (1 R&W with a short passage, 2 Math) from a `PUBLIC_DEMO` flag on the question record — served by an RSC, no auth, no attempt row.
- A live countdown starts on first interaction (not on page load — starting a timer at someone unprompted is hostile). Mono, matching the real test chrome.
- Answer choices are the *real* choice component with the *real* A/B/C/D geometry.
- The ABC eliminator is on and functional. This is your most distinctive interaction and nobody knows it exists.
- On submit: correct/incorrect state, the authored explanation, and time taken.
- After the last question: a miniature score-report card — "You'd have scored in the top band on Algebra" style, honest and non-fabricated — plus the single conversion CTA: **"Create a free account to take a full test."**
- Anonymous progress is stored in `sessionStorage` and, on signup, nothing is migrated. Keep it stateless.

**Why this over a screenshot.** It is the product, it costs a visitor 20 seconds, it demonstrates the eliminator/timer/explanation loop that a static image cannot, and it converts on the emotional beat right after they get one right.

**Guardrails**
- Must work on mobile — this is the *only* hero element that must be responsive down to 360px. Stack passage above question, collapse the eliminator to a long-press or an explicit toggle.
- Lazy-load below the fold on mobile if it costs more than 15kB.
- Never blocks LCP: render the question shell server-side, hydrate the interactions.

### 2.3 Truthful stats strip

Replace hardcoded values with an RSC query, `export const revalidate = 3600`:

```ts
const [questions, tests, attempts, avgGain] = await Promise.all([
  prisma.question.count({ where: { published: true } }),
  prisma.test.count({ where: { visibility: 'PUBLIC' } }),
  prisma.attempt.count({ where: { status: 'COMPLETED' } }),
  // only if you have ≥2 attempts for enough students to be honest
]);
```

**Rules:** round down, never up (`255 → "250+"`). If a number is unimpressive, replace the tile rather than inflate it — `1600 Max SAT Score` is not a statistic about your product and should go. Suggested four tiles: *questions in the bank*, *full-length tests*, *tests completed by students*, *cost (Free)*. Set all figures in mono, and fix the `∞` baseline by using the word "Free" or "Unlimited."

### 2.4 "See the real thing"

A `Tabs` component (from Phase 1) switching a device-framed screenshot:
- **Test interface** — R&W split view with a highlight and an eliminated choice visible.
- **Score report** — the real gauge + domain bars.
- **Answer review** — showing an authored explanation on a missed question.
- **Admin** *(only if tutor-facing matters)* — the question bank.

Capture at 2× on a clean seeded account, export as AVIF + WebP, `next/image` with explicit dimensions, `priority={false}`. Annotate with 2–3 small callout labels per tab rather than a paragraph.

### 2.5 Capability bento

Replace the three uniform cards with an asymmetric grid where size encodes importance:

- **Large tile — Adaptive module routing.** A 6-second looping SVG: Module 1 → performance threshold → two Module 2 branches. Shows what a sentence can't. **Only ship this tile if adaptive tests actually exist and are published.** If every test is currently `LINEAR`, either publish an adaptive test first or demote this to a small tile labelled honestly.
- Medium — **Bluebook-accurate interface** (eliminator, highlighter, Desmos, reference sheet, keyboard shortcuts). List the specifics; specificity is the proof.
- Medium — **Score report that explains itself** (domain, difficulty, pacing).
- Small — **Works on iPad**.

*(The former "AI explanations" tile is cut — the feature was removed 2026-08-06. Do not claim
explanations on the landing page until authored-explanation coverage supports it; see §5.2.3.)*

### 2.6 FAQ

Accordion (Radix), 8 items, real answers. This is also your SEO surface and your objection handler:

1. Is this the real SAT? (No — practice built to the Digital SAT format. Say it plainly; the honesty is the trust.)
2. Where do the questions come from?
3. How is the 200–800 score calculated?
4. Is it really free? Any card required?
5. Does it work on iPad / Chromebook?
6. What's the difference between adaptive and linear mode?
7. Can I use this with my students?
8. What happens to my data?

Add `FAQPage` JSON-LD.

### 2.7 Honest credibility (instead of fake testimonials)

You have no testimonials. **Do not invent any.** Substitute verifiable signals:
- A `/scoring` page documenting the raw→scaled conversion table and its source. "We show our work" is stronger than an anonymous 5-star quote.
- "No ads. No card. No upsell." stated flatly.
- Question count by domain, published openly.
- If you have any real usage — a school, a tutoring group, a number of completed attempts — name it once when it's true.

### 2.8 SEO & metadata

- `metadata` export per route: title, description, canonical, OG/Twitter with a generated OG image (`next/og`) using the mono/score-band motif.
- `sitemap.ts`, `robots.ts`.
- New content routes: `/scoring`, `/sat-format` (a genuinely useful Digital SAT format guide — sections, timing, adaptive structure), `/for-tutors`, `/faq`, `/privacy`, `/terms`.
- `Organization` + `WebApplication` JSON-LD.

### 2.9 Fixes to carry over

- `Digital SAT Practice ,` → remove the whitespace before the comma.
- Header: solid background + border on scroll (glass over a busy hero fails contrast).
- Kill the 15s ambient gradient shift and the floating orbs; replace with a single static radial bloom plus the answer-bubble lattice at 3% opacity.
- Mobile hero: the demo replaces the hidden mock card, so `lg:block` disappears.

### Acceptance criteria
- Every number on the page traces to a query or is removed.
- A logged-out visitor can answer at least one real question and see a real explanation without an account.
- Lighthouse mobile performance ≥ 90, LCP < 2.0s, CLS < 0.05.
- The page contains at most **one** gradient-filled element per viewport.
- Full keyboard traverse of hero demo, tabs, and FAQ; visible focus throughout.
- Renders correctly at 360px with no horizontal scroll.

---

# Phase 3 — Auth & first-run onboarding

**Effort: M (4–5 days)**

**Goal.** Fix the auth pages' mobile and colour problems, and capture the three pieces of information that make every later personalisation possible.

**Why.** The auth split-screen is the app's strongest existing layout but wastes half a large screen and vanishes on mobile. More importantly: you currently know nothing about a new student, so the dashboard can't say anything useful to them.

### 3.1 Auth page fixes

- **Colour unification.** Panel becomes a solid deep indigo (`--primary` at full saturation) with the dot lattice and one soft violet bloom — so the panel and the `Sign in` button are the same blue. Per the gradient budget, the gradient moves to the button only.
- **Make the panel work.** Replace the icon + two lines with something that earns 50% of the screen: a rotating single real question stem with its answer revealed, or a compact "what you get" list in mono eyebrows, or a live score-band graphic. Currently it's the emptiest area on the site.
- **Mobile.** Below `lg`, render a 96px branded header band (solid indigo, logo, one line) above the form instead of dropping the panel entirely. The brand should never disappear.
- **Form quality:** caps-lock warning on password fields; password strength meter on signup and reset; `autocomplete` attributes (`email`, `current-password`, `new-password`); `inputMode`; submit-on-enter; error summary linked to fields with `aria-describedby`.
- **Error copy rewrite** — no apologies, no vagueness:
  - ❌ "Something went wrong. Please try again."
  - ✅ "That email and password don't match an account. Check the email, or reset your password."
  - ✅ "This email is already registered. Sign in instead, or reset your password."
- **Rate-limit + generic-response** on `/forgot-password` so it can't be used to enumerate accounts, with copy that says so honestly: "If that email has an account, a reset link is on its way."

### 3.2 First-run onboarding (`/welcome`)

Three screens, skippable, shown once after signup. Writes to a new `StudentProfile` record.

1. **When's your test?** Date picker + "not scheduled yet". → drives countdown, pacing urgency, email cadence.
2. **What's your target score?** A draggable 400–1600 slider rendered on the **score band** motif, with section split (R&W / Math). → drives the gap analysis on the dashboard and results.
3. **Where do you want to focus?** Multi-select over the real domain taxonomy. → seeds the practice recommendations in Phase 7.

Then: "Take your first practice test" as the single CTA, deep-linking to the recommended test.

**Design note:** three screens with a progress rail, mono step counter (`01 / 03`), one question per screen, large touch targets. This is the one place a slightly playful animated transition is warranted.

### Acceptance criteria
- Auth pages render usably at 360px with brand present.
- Zero colour mismatch between panel and primary button.
- `StudentProfile` populated for ≥70% of new signups (skip rate tracked).
- Onboarding completes in under 45 seconds median.

---

# Phase 4 — Dashboard v2 & Progress

**Effort: L (2 weeks)**

**Goal.** Turn the dashboard from a list of tests into an answer to "what should I do right now, and am I getting better?"

**Why.** P2, P5, and the largest gap in the product: no progress over time. A student takes a test, sees a score, and has nowhere to watch the line move. That is the single most motivating artifact a prep tool can offer.

### 4.1 Dashboard restructure

**New order:**

```
┌──────────────────────────────────────────────────────────┐
│ 1. HEADER STRIP  Welcome back, {name}   ·  {countdown}   │
│    Compact. Not a 200px gradient banner.                 │
├──────────────────────────────────────────────────────────┤
│ 2. NEXT ACTION  (one card, the only gradient on screen)  │
│    Resume Practice Test 3 · Module 2 · 18:42 left        │
│    — or — Take your next test — or — Review 12 missed Qs  │
├──────────────────────────────────────────────────────────┤
│ 3. YOUR PROGRESS  score trend sparkline + 3 stats        │
│    [Total ▁▂▄▅]  Best 1180 · Avg 1120 · +80 since first  │
│    → View full progress                                  │
├──────────────────────────────────────────────────────────┤
│ 4. WEAKEST AREAS  3 domain chips w/ accuracy + Drill CTA │
├──────────────────────────────────────────────────────────┤
│ 5. PRACTICE TESTS  richer cards, quieter buttons         │
├──────────────────────────────────────────────────────────┤
│ 6. RECENT ACTIVITY  history table, abandoned collapsed   │
└──────────────────────────────────────────────────────────┘
```

**4.1.1 Next-action card.** Deterministic priority:
1. In-progress attempt exists → **Resume** (warm gradient, per accent policy — time pressure).
2. ≥1 completed attempt with unreviewed incorrect answers → **Review N missed questions**.
3. Untaken test available → **Start {recommended test}**.
4. All tests taken → **Drill your weakest skill: {skill}** (Phase 7) or **Retake for a new score**.

**4.1.2 Fix the score display bug (P5).** Add to the attempt/score model:
- `scoreScope: 'FULL' | 'SECTION_MATH' | 'SECTION_RW' | 'PARTIAL'`
- Render section-only attempts as `430 /800 · Math only`, never as a bare number implying /1600.
- Exclude non-`FULL` attempts from "Avg score" and "Best score", or split the stat into two rows: *Full tests* and *Section practice*. **This is a correctness bug with a psychological cost — treat it as a P1 fix and ship it in Phase 0 if you can.**

**4.1.3 Test cards, rewritten.** Each card gains:
- Section mix chips (`R&W 27` · `Math 22`) instead of "2 sections · 46 questions"
- Estimated duration in mono (`~1h 34m`)
- Your history: `Best 1130 · Taken 2×` or `Not taken yet`
- Mode badge with a `Tooltip` explaining adaptive vs linear (nobody knows what `LINEAR` means)
- Description clamped to 2 lines so card heights match
- Button: `variant="soft"` + arrow, **not** a full-width gradient bar
- Card-level hover lift retained; the gradient left-edge accent bar retained (it's good and cheap)

**4.1.4 History table.**
- Collapse abandoned attempts behind `Show 3 abandoned attempts`.
- Add a `Score` column that respects `scoreScope`.
- Add a `Δ` column (change vs previous full attempt), coloured emerald/red, mono.
- Row action becomes a `DropdownMenu` (View results · Review answers · Compare with previous · Delete) once there's more than one action.
- Empty state: "No attempts yet. Your first practice test takes about 90 minutes — or start with a single section." with two CTAs.

### 4.2 New route: `/progress`

The retention feature. All charts hand-rolled SVG or a light lib — avoid pulling a 90kB charting dependency for four charts.

1. **Score over time** — line chart, total /1600, with R&W and Math as toggleable series (`SegmentedControl`). Target-score line from onboarding drawn as a dashed horizontal rule. Test date marked on the x-axis. Hover shows attempt name + date + score, click navigates to that score report.
2. **Domain mastery heatmap** — rows = domains, columns = attempts, cell = accuracy, colour-graded. Instantly shows which domains are improving and which are stuck. This is the highest-value chart for a tutor looking over a student's shoulder.
3. **Accuracy by difficulty over time** — three small sparklines (Easy/Medium/Hard). Reveals the classic pattern where a student is grinding hard questions while still dropping easy ones.
4. **Pacing** — average seconds per question per attempt vs the target bands you already reference (<1:10 R&W, <1:35 Math), with the number of "paced too long" questions per attempt.
5. **Gap to target** — a score-band graphic showing current best, target, and the per-section deltas needed. `You're 140 points from your target. 90 of those are available in Math.`

**Empty state matters here:** with 0–1 attempts, show the shell with a real explanation of what will appear and a CTA, not a spinner or a blank card.

### Acceptance criteria
- Section-only scores are never displayed as `/1600`.
- Dashboard has exactly one gradient element above the fold.
- `/progress` renders meaningfully at 1, 2, and 10 attempts.
- A student can go from dashboard → the specific weak domain → a drill in ≤2 clicks (drill stub until Phase 7).
- Dashboard TTI unchanged or better despite added content (charts lazy-loaded).

---

# Phase 5 — Results & Review v2

**Effort: L (1.5–2 weeks)**

**Goal.** Turn the score report from a summary into a prescription, and make review fast enough that students actually do it.

**Why.** The score report is already the best-designed page in the app. What it lacks is *direction*: it tells a student they got 62% on Algebra and stops. Review is one-question-at-a-time with no filtering, so reviewing 12 wrong answers means clicking through 44 questions.

### 5.1 Results page

**5.1.1 Score hero additions**
- **Delta vs previous attempt** beside the gauge: `+60 from your last full test`, mono, emerald/red. This is the single most-wanted number and it's absent.
- **Gap to target** (from onboarding): `140 to your target of 1320`.
- Remove the invented performance tiers ("Above Average Score" / "Room to Grow") **unless** they're anchored to something real. Comparing a student to an unstated distribution is a claim you can't support. Replace with their own trajectory: *your best*, *your average*, *your target*. Self-comparison is both honest and more motivating.

**5.1.2 "What to work on next"** — a new block directly under the hero, above the section cards:
- Top 3 weakest domains by accuracy, weighted by question count (so a 0/1 domain doesn't outrank a 4/12 one).
- Each with a one-line diagnosis and a `Drill this` CTA (Phase 7) plus `Review these N questions` (works today).
- One pacing insight if applicable: `You spent over 3 minutes on 6 questions, all in Module 2. Practice skipping and returning.`

**5.1.3 Question map** — a strip of small squares per module (correct / incorrect / skipped / flagged), mono-numbered, clickable to jump straight to that question in review. Reuses the navigator's visual language, which students already learned during the test. Cheap to build, very high utility.

**5.1.4 Export** — `Download score report (PDF)` via `next/og` or a print stylesheet. Tutors want this; students want to send it to parents. Also a `Share read-only link` with a signed token, expiring, revocable from account settings.

### 5.2 Review page

**5.2.1 Filtering — the biggest win.** A filter bar above the question:
- Chips: `All` · `Incorrect (12)` · `Flagged (5)` · `Skipped (2)` · `Slow (>2min)`
- Domain and difficulty `Select`s
- Default to **Incorrect** when arriving from the results page's "review missed questions" CTA
- Filter state in the URL (`?filter=incorrect&domain=algebra#q7`) so it survives refresh and can be shared with a tutor

**5.2.2 Desktop sidebar** — a persistent left rail listing all questions with status icon, domain, and time, current item highlighted. Removes the "where am I" problem of one-at-a-time review. Collapses into the `Sheet` primitive below `lg`.

**5.2.3 ~~AI explanation upgrade~~ — CUT (2026-08-06)**

The AI explanation feature was removed rather than fixed: the route built its prompt from
client-supplied stem, choices and correct answer, so any signed-in user could drive the model
directly. Review now shows the **authored** `Question.explanation` only. Replacement work item:
raise authored-explanation coverage in the bank (see `/admin/questions` "missing explanation"
filter, §9.3).

**5.2.4 Save to review queue** — a `Add to review queue` action per question, feeding Phase 7's spaced repetition. Ship the button and the table in this phase even if the scheduler lands later.

**5.2.5 Annotations carry into review** — highlights and notes the student made during the test should render in review. They currently exist per attempt+question; surface them.

### Acceptance criteria
- Reviewing only incorrect answers takes 1 click from the score report.
- Review page state fully restorable from URL.
- Score deltas correct across section-only and full attempts.

---

# Phase 6 — Test interface refinement

**Effort: L (2 weeks)** · **Risk: highest in the plan**

**Goal.** Make the crown jewel maintainable, accessible, and usable on a tablet — without changing what students rely on.

**Why.** 1,500 lines in one component with `useState`/`useRef` is a maintenance cliff. And the accessibility gap matters: the real Digital SAT offers zoom, high contrast, and screen-reader support as accommodations. A student who needs those can't practise here.

**Rule for this phase: no visual redesign.** The Bluebook-accurate chrome is a feature. Everything below is structural, accessibility, or additive.

### 6.1 Refactor (do this first, ship nothing else until it's green)

- Extract state into `useTestStore` (zustand): `phase`, `currentIndex`, `answers`, `eliminations`, `flags`, `annotations`, `saveStatus`, `timer`.
- Split into modules: `TopBar`, `BottomBar`, `QuestionPane`, `PassagePane`, `ResizableSplit`, `Navigator`, `ModuleReview`, `BreakScreen`, `Modals`, `useServerClock`, `useAutosave`, `useConnectivity`, `useDuplicateTab`, `useKeyboardShortcuts`.
- Add tests: Playwright for the flows that must never break — answer persistence across reload, module submit, auto-submit at zero, duplicate-tab lock, break timer, resume mid-attempt.
- **Only after tests are green** do anything below.

### 6.2 Accessibility (parity with real accommodations)

- **Text size control** — a stepper in the More menu (100/125/150/200%), persisted per user, applied via a CSS custom property on the test root. Real SAT accommodation; genuinely needed.
- **High-contrast mode** — a separate token set for the test interface only (the exception to "test ignores dark mode" should be an *accessibility* mode, not a theme).
- **Screen reader** — `aria-live="polite"` announcements for question changes, save status, and timer milestones (5 min, 1 min); `role="radiogroup"` on choices; the eliminator exposed as a toggle button with a clear label; focus management on modal open/close.
- **Keyboard** — annotations are currently mouse-only (select text → popup). Add a keyboard path: `Shift+H` highlights the current sentence, or expose highlight controls in a per-paragraph menu. Also add `?` to open the shortcuts modal.
- Verify all shortcuts don't collide with screen-reader keys.

### 6.3 Tablet & mobile

- iPad portrait (`768×1024`) is a primary device for this audience. Audit `h-screen` + the visualViewport SPR handling in portrait, landscape, and with a split keyboard.
- Below `md`: passage moves into a bottom `Sheet` with a persistent `Passage` toggle; the top bar collapses timer + section into one line; the navigator becomes full-screen.
- Add a pre-test device check on `/test/[testId]/start`: screen size, fullscreen capability, connection, and a warning if the device is likely to be a poor experience.

### 6.4 Practice-mode affordances (additive, off by default)

Real-exam fidelity is the default, but practice ≠ exam. On the pre-test page, offer:
- **Timing:** Real (default) · Extended time (+50% / +100%, mirroring accommodations) · Untimed
- **Feedback:** After the test (default) · After each question
- **Pause:** Off (default) · Allow pause

Attempts record which modifiers were used and the results page labels them, so an untimed attempt never silently pollutes the score trend.

### 6.5 Small improvements

- Navigator: show flagged, answered, *and* eliminated-only states; show annotation indicators.
- Save-failure: currently a status pill; add an explicit retry action and a warning before module submit if any answer is unsaved.
- Anti-cheat telemetry: tell the student it exists, once, on the pre-test page. Silent monitoring discovered later destroys trust; disclosed monitoring is just a proctoring feature.
- Break screen: add optional "skip break" for practice mode, and show what's coming next.
- Add a `Report a problem with this question` action in the More menu → writes to an admin queue (feeds Phase 9's question quality work).

### Acceptance criteria
- Test interface component files each < 300 lines.
- Playwright suite covers 6 critical flows and runs in CI.
- Zero critical axe violations in `in_module`, `review`, and `break` phases.
- Usable on iPad portrait and landscape with no layout breakage.
- Timing/feedback modifiers recorded and surfaced on results.

---

# Phase 7 — Practice & drill mode

**Effort: XL (3–4 weeks)** · **The biggest missing feature in the product**

**Goal.** Let a student practise 15 questions on Linear Equations in 10 minutes, instead of only being able to commit to a 90-minute full test.

**Why.** Full-length tests are a high-friction, low-frequency loop. A student takes 4 tests and runs out of product. Drill mode turns a 4-session product into a daily-habit product, and it's fully supported by your existing taxonomy (section / domain / skill / difficulty already exist on every question).

### 7.1 Schema additions

```prisma
model PracticeSession {
  id          String   @id @default(cuid())
  userId      String
  mode        PracticeMode   // DRILL | REVIEW_QUEUE | WEAKNESS | TIMED_SET
  filters     Json           // { sections, domains, skills, difficulties }
  timed       Boolean
  feedback    FeedbackMode   // IMMEDIATE | END
  status      SessionStatus
  startedAt   DateTime
  completedAt DateTime?
  items       PracticeItem[]
}

model PracticeItem {
  id         String  @id @default(cuid())
  sessionId  String
  questionId String
  order      Int
  answer     String?
  correct    Boolean?
  timeMs     Int?
  flagged    Boolean @default(false)
}

model SkillMastery {
  userId     String
  skillId    String
  attempts   Int
  correct    Int
  ewma       Float    // exponentially weighted accuracy, α ≈ 0.3
  lastSeenAt DateTime
  @@id([userId, skillId])
}

model ReviewQueueItem {
  id         String   @id @default(cuid())
  userId     String
  questionId String
  reason     QueueReason  // MISSED | FLAGGED | MANUAL | SLOW
  dueAt      DateTime
  interval   Int          // days
  ease       Float        @default(2.5)
  reps       Int          @default(0)
  @@unique([userId, questionId])
}
```

### 7.2 `/practice` — the builder

A single page, `Sheet`-friendly on mobile:
- **Quick starts** (three big cards, covering 90% of intent):
  - `Drill my weakest skill` — auto-selects from `SkillMastery`
  - `Review queue (14 due)` — spaced repetition
  - `Timed set — 10 questions, 12 minutes`
- **Custom set** below: section → domain → skill (cascading multi-select), difficulty mix, question count (5/10/20/custom), timed toggle, feedback timing.
- Live count of matching questions as filters change, with an honest warning when the bank is thin: `Only 8 questions match. Widen the difficulty range to get 20.`
- Exclude-recently-seen toggle.

### 7.3 `/practice/[sessionId]` — the runner

Reuses the test interface's question rendering (`QuestionPane`, KaTeX, images, SPR, eliminator) with lighter chrome:
- Progress dots instead of a full navigator
- Optional per-question timer
- **Immediate feedback mode** is the default here: answer → correct/incorrect → explanation inline → `Next`. This is a fundamentally different learning loop from exam mode and it's the reason drill mode works.
- `Add to review queue` and `Report question` on every item

### 7.4 `/practice/[sessionId]/summary`

Accuracy, time, per-skill breakdown, `Practise these again`, and mastery movement (`Linear equations: 61% → 68%`).

### 7.5 Spaced repetition

Keep it simple — a trimmed SM-2:
- Missed question enters the queue at `dueAt = now + 1 day`.
- Correct on review → `interval *= ease`, `ease` adjusted by response speed; incorrect → reset to 1 day.
- Cap intervals at the student's test date (no point scheduling a review for after the exam).
- Surface due count on the dashboard next-action card.

### 7.6 Mastery model

Deliberately simple and explainable:
- `ewma` accuracy per skill, α = 0.3, so recent performance dominates.
- Confidence = `min(attempts / 8, 1)`; skills below 4 attempts show as "not enough data" rather than a misleading percentage.
- Display as a 5-band label (Not started / Weak / Developing / Solid / Strong) mapped to the token colour ramp, never a false-precision decimal.

### Acceptance criteria
- A student can start a 10-question drill on a chosen skill in ≤3 interactions from the dashboard.
- Drill sessions do not appear in, or affect, full-test score history.
- Review queue schedules correctly across timezones and respects the test date cap.
- Mastery never shows a percentage for a skill with <4 attempts.

---

# Phase 8 — Goals, nudges & notifications

**Effort: L (1.5–2 weeks)**

**Goal.** Bring students back without being manipulative about it.

**Why.** You have Resend wired up and send exactly one kind of email (password reset). The onboarding data from Phase 3 makes genuinely useful, non-spammy messages possible.

### 8.1 Goals

- Target score + test date from onboarding, editable in `/account`.
- Dashboard countdown: `31 days to your test` in mono. Below 14 days the copy shifts from encouragement to prioritisation (`Focus your remaining time on Algebra and Craft & Structure`).
- Weekly target: sessions or questions per week, set by the student, shown as a ring. **Not a daily streak.** Daily streaks punish the student who studies hard on weekends and creates guilt-driven churn when broken; a weekly ring that resets cleanly is kinder and retains better for a study product where a 90-minute test is one "session".

### 8.2 Email (Resend)

Four templates, all with a one-click unsubscribe and a preference centre in `/account`:
1. **Attempt completed** — score, delta, top 2 weak areas, link to the report. Send immediately; this is the highest-open email you'll ever have.
2. **Weekly progress** — trend sparkline as a static image, questions practised, mastery movement, one recommended next action.
3. **Re-engagement** — after 10 days inactive, once, with a specific hook (`14 questions are due for review`). Never more than one per fortnight.
4. **Tutor digest** *(if groups are used)* — weekly per-group summary to the group owner: who practised, score movements, who's stalled.

Design the templates in the same visual language (mono numerals, score band). Plain-text alternates for all.

### 8.3 In-app notifications

Modest scope: a bell in `StudentNav` with a dropdown listing scored attempts, due reviews, newly assigned tests, and tutor comments (if you add those). Server-rendered list, mark-as-read, no websockets needed.

### 8.4 Optional: group leaderboard

Only inside a group, opt-in per student, showing rank by *improvement* rather than by absolute score. Ranking by absolute score in a tutoring cohort demoralises exactly the students who need the most help; ranking by points gained rewards effort and is fairer.

### Acceptance criteria
- Preference centre honours every category; unsubscribe works in one click.
- No student receives more than 2 emails in any 7-day window (excluding transactional).
- Weekly ring never displays a "streak broken" state.
- Leaderboard is opt-in and improvement-ranked.

---

# Phase 9 — Admin v2 & analytics

**Effort: XL (3–4 weeks)**

**Goal.** Give tutors the analytics the tables are currently hiding, and give you the tooling to find bad questions.

**Why.** Admin has counts and tables and nothing else. You have per-question response data for every attempt sitting in the database and no way to see that question 14 is broken, or that everyone picks distractor C.

### 9.1 `/admin/analytics`

- Attempts over time (started / completed / abandoned), stacked area.
- Completion funnel: started → module 1 done → module 2 done → submitted. **Abandon rate by module is the number that tells you where the product is failing.**
- Score distribution histogram, filterable by test and group.
- Average score by test — identifies mis-calibrated tests.
- Median time per module vs allotted time.
- Device / viewport breakdown (you already log some telemetry) — settles the "does mobile matter" question with data.

### 9.2 Question quality analytics — the highest-value admin feature

Per question, computed nightly:
- **p-value** (proportion correct) — flags questions everyone gets right (worthless) or nobody does (broken or mis-keyed).
- **Discrimination index** — correlation between getting this question right and total score. **A negative discrimination index almost always means the answer key is wrong.** Surface these at the top of a "Needs attention" list.
- **Distractor analysis** — pick rate per choice. A distractor nobody chooses is dead weight; a distractor chosen more than the key is a mis-key or a genuinely misleading stem.
- **Median time** — outliers indicate ambiguity.
- **Authored difficulty vs actual** — flags where your `EASY` tag disagrees with a 34% correct rate, with a one-click "apply suggested difficulty".
- The `Report a problem` queue from Phase 6.

Surface as a `Needs attention` tab on `/admin/questions` with the count in the tab label.

### 9.3 Question bank workflow

- Bulk select → bulk tag / bulk difficulty / bulk assign to module / bulk delete / bulk publish.
- **Preview in test chrome** — see the question exactly as a student will, including the split view and KaTeX, from the editor.
- Duplicate detection on stem similarity at import and save time.
- Draft / published states so half-written questions can't reach a student.
- Version history on edits (questions get corrected; you want to know when).
- Saved filter views (`My drafts`, `Missing explanation`, `Negative discrimination`).
- A `Missing explanation` filter specifically — an unexplained question is a dead end in review.

### 9.4 Groups & roster

- CSV roster import; invite links with expiry; bulk assign tests to a group.
- **Group detail → per-student progress table**: last active, attempts, best, average, delta, weakest domain, with sparklines. This is the screen a tutor will open every single day — it deserves the most design attention in the admin panel.
- Per-group report export (PDF/CSV).
- Assign a *drill set* to a group (depends on Phase 7).

### 9.5 Import & attempts

- Import: dry-run diff preview (`12 new, 3 updated, 2 conflicts`), per-line error mapping with jump-to-line, downloadable JSON schema + template, image URL ingestion into Cloudinary.
- Attempts: side-by-side compare of two attempts by the same student; flagged-behaviour review with a sensible threshold (a single blur event is someone checking the time, not cheating — only surface patterns).

### 9.6 Admin UI polish

- All tables on `DataTable` with sticky headers, column visibility, and saved views.
- Mobile: tables become card lists below `md` (a tutor checking a student on a phone is a real scenario).
- The navy nav is good — keep it. Add a breadcrumb row under it for the `[id]` detail pages, which currently have no sense of place.

### Acceptance criteria
- Every question has p-value, discrimination, and distractor data after one nightly job.
- Negative-discrimination questions are surfaced automatically, not hunted for.
- A tutor can see one student's full trajectory in one screen.
- Import failures identify the exact line and field.

---

# Phase 10 — Mobile, performance & accessibility hardening

**Effort: L (1.5–2 weeks)**

**Goal.** Meet a quality floor everywhere, and decide honestly what "mobile support" means per surface.

### 10.1 Responsive policy (decide and document per surface)

| Surface | Target |
|---|---|
| Landing, auth, FAQ, content pages | Full support, 360px up |
| Dashboard, progress, results, review, account | Full support, 360px up |
| Practice/drill runner | Full support — **this is the mobile use case**; a 10-question drill on a phone is the daily habit |
| Full test interface | Tablet-first; phone gets a supported-but-warned experience |
| Admin | Read on mobile (card lists), edit on desktop |

Document this in the repo. Half-supporting everything is how you get four surfaces that are all slightly broken.

### 10.2 Performance

- **Desmos** — lazy-load on calculator open, not on module mount. It's likely your single largest payload.
- **KaTeX** — subset fonts to the glyph set your bank actually uses; audit whether `react-katex` is needed or whether server-side rendering of math into static HTML at save time is better (it is, for a question bank that changes rarely — render once in the admin, store the HTML, ship zero KaTeX JS to students).
- Font subsetting for Plus Jakarta Sans and Plex Mono; `display: swap`; preload only the weights above the fold.
- Route-level code splitting; `next/dynamic` for the navigator, modals, Desmos, and charts.
- Image pipeline: AVIF/WebP, explicit dimensions, `sizes`, Cloudinary transforms on question images.
- Targets: LCP < 2.0s, INP < 200ms, CLS < 0.05 on 4G mobile for `/`, `/dashboard`, `/results/[id]`.

### 10.3 Accessibility — WCAG 2.2 AA pass

- Contrast audit: white/muted text on the gradient panels and hero — several current combinations will fail. Muted-on-gradient is the likeliest failure.
- Focus visible on every interactive element including gradient-filled buttons and the test interface's icon buttons.
- Heading order per page (currently multiple pages jump levels).
- All icon-only buttons labelled; all decorative SVG `aria-hidden`.
- Forms: programmatic label association, error announcement, no colour-only status (the history table's status badges need text, which they have — keep it that way).
- Keyboard traversal of: landing demo, dashboard cards, review filters, test interface, admin tables.
- Screen-reader pass with VoiceOver + NVDA on the three core flows.

### 10.4 Optional: localisation

Given your context, an Azerbaijani and/or Russian UI (with English question content, since the SAT is in English) may be worth real money. If so, do the `next-intl` extraction now while the surface area is small — retrofitting i18n after Phase 7 costs 3× more.

### Acceptance criteria
- Zero critical/serious axe violations across all routes.
- Core Web Vitals targets met on 4G mobile.
- No horizontal scroll at 360px on any full-support surface.
- Responsive policy documented and enforced in review.

---

# Appendix A — Quick wins (ship this week)

Ordered by value ÷ effort. All are ≤ half a day each.

1. **Fix `Digital SAT Practice ,`** — stray whitespace before the comma in the hero H1.
2. **Fix section-only score display** — never show `430` implying `/1600` for a Math-only attempt. (Correctness bug, real psychological cost.)
3. **Make landing stats real** — one Prisma query, `revalidate: 3600`. Currently "4 tests" vs 5 on the dashboard.
4. **Remove or fix the adaptive claim** — every test is `LINEAR`; the landing page's headline feature is adaptive.
5. **Demote the dashboard `Start test` buttons** to `variant="soft"`; keep the gradient only on a resume/next-action card.
6. **Collapse abandoned rows** in the history table behind a disclosure.
7. **Add `prefers-reduced-motion` global block.**
8. **Fix the `∞` baseline** in the stats strip (or use the word).
9. **Add mono numerals** (`font-variant-numeric: tabular-nums`) to every score, timer, count and table figure — 10 minutes, immediately looks more considered.
10. **Fix the account page's disabled-looking Save buttons** — helper text or an enabled-until-submit pattern.
11. **Add `loading.tsx` to the four heaviest routes.**
12. **Add a `Tooltip` on the `LINEAR`/`ADAPTIVE` badge** explaining what it means.
13. **Unify the two blues** on the login page (panel gradient vs button solid).
14. **Add `privacy`, `terms`, `contact` links to the footer.**

---

# Appendix B — Landing page copy deck

Student-first positioning (see §2.4). Every claim below is checkable — replace anything that isn't true of your build.

**Eyebrow (mono, uppercase)**
`BLUEBOOK-STYLE DIGITAL SAT PRACTICE`

**H1**
> Practice the Digital SAT the way you'll actually take it.

*(Tutor-first alternative: "Run full-length Digital SAT practice for your students." — then the demo becomes "See what your students see.")*

**Sub-copy**
> Full-length, timed, adaptive practice tests in the same interface as the real exam — same timer, same eliminator, same highlighter. You get a 200–800 score per section, a breakdown of every domain you missed, and an explanation for every question.

**Hero CTAs**
`Try a question →` (primary) · `Create free account` (secondary)

**Demo component labels**
- Before start: `Answer a real question. No account needed.`
- Running: `MODULE 1 · MATH` / mono timer / `QUESTION 1 OF 3`
- Correct: `Correct.` + explanation + `Next question`
- Incorrect: `Not quite — the answer is B.` + explanation
- After last: `That's the loop. A full test gives you all of this across 98 questions, plus a scored report.` → `Create free account`

**Stats strip labels** (mono figures, sentence-case labels)
`250+ questions in the bank` · `5 full-length tests` · `{n} tests completed by students` · `Free — no card`

**Screenshot section**
> **See it before you sign up.**
> These are real screens, not mockups.
> Tabs: `Test interface` · `Score report` · `Answer review` · `For tutors`

**Bento tiles**
- *Adaptive routing* — "Your Module 2 difficulty is set by how you did in Module 1 — the same routing the real Digital SAT uses."
- *Bluebook-accurate interface* — "Answer eliminator, passage highlighting with notes, Desmos graphing calculator, reference sheet, keyboard shortcuts, and a timer anchored to our server so it can't drift."
- *A report that tells you what to do* — "200–800 per section, accuracy by domain and difficulty, pacing against target times, and the three things to work on next."
- *Works on iPad* — "Same interface, touch-ready, with the passage split you can drag."

**Tutor band**
> **Running a class or a tutoring practice?**
> Build your own question bank, assemble tests, group your students, assign tests to a cohort, and export every attempt as CSV. Import questions in bulk as JSON.
> `See tutor features →`

**How it works** (numbering justified — real sequence)
`01` Create a free account → `02` Pick a full-length or section test → `03` Get your score and review every question

**Scoring honesty block**
> **How the score is calculated.**
> Raw correct answers are converted to a 200–800 scaled score per section using a published conversion table, then summed for a total out of 1600. It's an estimate, not an official score — here's exactly how it works. `Read the scoring method →`

**Closing CTA** (one button only)
> **Start with one test.**
> Ninety minutes tells you more than any diagnostic quiz.
> `Create free account`

**Footer columns**
`Product` (Practice tests, Drill mode, Score reports, For tutors) · `Learn` (Digital SAT format, How scoring works, FAQ) · `Account` (Sign in, Sign up) · `Legal` (Privacy, Terms, Contact)

---

# Appendix C — Component build list

New components introduced across the plan, with the phase that needs them.

| Component | Phase | Notes |
|---|---|---|
| `Skeleton` | 0 | Layout-matched, not generic bars |
| `Select` | 1 | Retires every `SELECT_CLS` |
| `Table` / `DataTable` | 1 | Retires 5 hand-rolled tables |
| `Modal` | 1 | Radix Dialog wrapper |
| `Tabs` | 1 | `underline` + `pill` variants |
| `Tooltip` | 1 | Domain, mode, disabled-reason explanations |
| `Progress` | 1 | Includes the `scoreBand` variant |
| `Alert` | 1 | 4 semantic variants |
| `SegmentedControl` | 1 | Chart ranges, mode switches |
| `Sheet` | 1 | Mobile drawer for tables + passage |
| `Pagination`, `Avatar`, `Field`, `Separator` | 1 | |
| `ScoreDial` | 1 | Extracted from results page |
| `DomainBar` | 1 | Shared: results, progress, admin |
| `ThemeToggle` | 1 | Tri-state, iconified |
| `LiveQuestionDemo` | 2 | **The signature element** |
| `ScreenshotTabs` | 2 | Device frame + annotations |
| `Accordion` (FAQ) | 2 | Radix, JSON-LD paired |
| `AdaptiveRoutingDiagram` | 2 | 6s looping SVG |
| `PasswordStrength` | 3 | |
| `OnboardingStepper` | 3 | |
| `NextActionCard` | 4 | Priority-ranked |
| `ScoreTrendChart` | 4 | Hand-rolled SVG |
| `DomainHeatmap` | 4 | Domains × attempts |
| `Sparkline` | 4 | Reused in email + admin |
| `QuestionMap` | 5 | Reuses navigator language |
| `ReviewFilterBar` | 5 | URL-synced |
| `AIExplanation` | 5 | Streaming + cached + follow-ups |
| `TextSizeControl` | 6 | Accommodation parity |
| `PracticeBuilder` | 7 | Cascading filters + live count |
| `MasteryBadge` | 7 | 5-band, no false precision |
| `GoalRing` | 8 | Weekly, not daily-streak |
| `NotificationBell` | 8 | |
| `QuestionQualityTable` | 9 | p-value, discrimination, distractors |
| `StudentProgressTable` | 9 | The tutor's daily screen |

---

# Appendix D — Metrics

Track these from Phase 0 so each phase can be judged.

**Acquisition (Phase 2)**
- Landing → signup conversion
- % of visitors who interact with the hero demo
- Demo-interactors → signup conversion vs non-interactors *(the number that justifies the whole phase)*
- Organic sessions to `/sat-format` and `/scoring`

**Activation (Phases 3–4)**
- Signup → first attempt started (target: >60%)
- First attempt started → completed (target: >70%)
- Onboarding completion rate

**Retention (Phases 4, 7, 8)**
- D7 / D30 return rate
- Attempts per active student per month
- Practice sessions per week (post-Phase 7)
- Weekly-goal completion rate
- Email open and click-through by template

**Quality (Phases 5–6, 9)**
- Module abandon rate (by module — the diagnostic that matters)
- Save-failure rate
- Duplicate-tab lock triggers
- Share of reviewed questions that have an authored explanation
- Count of questions with negative discrimination *(should trend to zero)*
- axe violations, Lighthouse, Core Web Vitals per route

---

# Appendix E — Open decisions

Resolve these before the phase in brackets; each one changes downstream work materially.

1. **Primary audience — student or tutor?** [before Phase 2] Determines the H1, the demo framing, and whether `/for-tutors` is a band or the front door.
2. **Does adaptive mode actually ship?** [before Phase 2] Every visible test is `LINEAR`. Either publish an adaptive test or stop leading with the claim.
3. **Will there ever be paid tiers?** [before Phase 2] "Free to use" is repeated four times on the current page. If a paid tier is coming, "free" becomes a trap; say "free plan" now.
4. **Test-content licensing.** [before Phase 2] The bank references "Official SAT Practice Test 4." If any content is College Board's, the public landing page and any public demo question are the wrong place for it — the demo must use originally-authored questions.
5. **Chart library or hand-rolled?** [before Phase 4] Four charts don't justify 90kB. Recommend hand-rolled SVG reusing the score-band motif; revisit if Phase 9 needs a dozen more.
6. **zustand: use it or drop it.** [Phase 1]
7. **Mobile test-taking: support or warn?** [before Phase 6] Both are defensible; drifting between them is not.
8. ~~**AI explanations: cache and cost ceiling.**~~ **Resolved 2026-08-06 — feature removed.** No model is called anywhere in the product. Superseded question: how is authored-explanation coverage raised, and what does review show for a question that has none?
9. **Localisation.** [before Phase 7] Cheap now, expensive later.

---

## Closing note on sequencing

The plan is deliberately front-loaded on *credibility* (Phases 0–2) rather than *features* (Phases 7–9). The reason is in the diagnosis: the app's quality is real and its marketing is not, which is the reverse of the usual problem. A visitor is currently told about adaptive testing that doesn't exist and shown a fake screenshot of a genuinely excellent interface. Fixing that costs two weeks and no new backend work.

The single highest-leverage item in the whole document is `<LiveQuestionDemo />` in Phase 2 — it converts, it demos, it proves, and it's the only thing here that a competitor can't copy from a screenshot.
