# Prompts C — Student experience (Phases 5–7)

**Phase 7 gate: nothing starts before T7.1 is green.**

Key constraint throughout: **no score is persisted anywhere.** Every scaled score is recomputed from
`ModuleResult` on each render. Deltas and trend charts are N+1 by construction — measure.

---

## T5.1 — Dashboard restructure and next-action card

> Recon confirmed 6 gradients above the fold and no answer to "what should I do right now".
>
> **Do:** restructure to:
> ```
> 1. Header strip     Welcome back, {name} · {countdown}      ← compact, not a 200px banner
> 2. NextActionCard   the ONLY gradient above the fold
> 3. Your progress    extend score-trend.tsx + Best / Avg / change since first
> 4. Weakest areas    3 domain chips + Drill CTA (stub → /drill)
> 5. Practice tests   richer cards, quieter buttons
> 6. Recent activity  history table, abandoned collapsed
> ```
>
> 1. Shrink the `bg-gradient-hero` banner (`:91`); move the three stat tiles out of its cramped right
>    edge into the progress block.
> 2. `NextActionCard`, deterministic priority:
>    1. In-progress attempt → **Resume** (`--gradient-warm`; data already at `dashboard/page.tsx:63`
>       via `inProgressByTest`)
>    2. Completed attempt with unreviewed incorrect answers → **Review N missed questions**
>    3. Untaken test → **Start {recommended}**
>    4. All taken → **Drill your weakest skill** (stub until Phase 8) or **Retake**
>    Show context: `Practice Test 3 · Module 2 · 18:42 remaining` in `.tabular`.
> 3. Countdown from `StudentProfile` (T4.3). Below 14 days, copy shifts from encouragement to
>    prioritisation.
> 4. Sections 3–4 read from T5.4; render shells with loading state if T5.4 hasn't shipped.
>
> **Acceptance:** exactly one gradient above the fold · card picks correctly in all four cases
> (unit-test the selection) · zero-attempt student sees a coherent first-run dashboard, not four empty
> states · TTI no worse than baseline.

---

## T5.2 — Test card rebuild

> `test-card.tsx` (159 LOC): no history, no duration, no section mix, full-width gradient button, no
> mode explanation.
>
> **Do:**
> - Section mix chips (`R&W 27` · `Math 22`) instead of `2 sections · 46 questions`
> - Estimated duration in `.tabular` (`~1h 34m`) — `Section.module1TimeLimit` / `module2TimeLimit`
>   carry the seconds
> - Student's own history: `Best 1130 · Taken 2×` or `Not taken yet` — **fetch in one aggregate, not
>   per card**
> - Mode badge with a real `Tooltip` explaining adaptive vs linear
> - Description clamped to two lines so heights match
> - Action → `variant="soft"` with arrow; keep the left-edge accent strip (`:61`) and hover lift
> - Migrate the embedded confirm dialog onto `Modal`
>
> **Acceptance:** equal card heights at every breakpoint · no N+1 for history · tooltip works on touch.

---

## T5.3 — History table upgrade

> **Do:** migrate `dashboard/page.tsx:218` to `DataTable` and add:
> - Score column — **it already respects `ScoreFidelity`; keep that behaviour**
> - A `Δ` column vs the previous `FULL_LENGTH` attempt, `.tabular`, emerald/red, blank where not
>   comparable. **Scores aren't stored, so every delta recomputes from `ModuleResult` — measure the
>   query and cache per request.**
> - Abandoned rows collapsed behind `Show N abandoned attempts`
> - Status and test filters
> - Row action → `DropdownMenu`: View results · Review answers · Compare with previous · Delete
> - Empty state: `No attempts yet. Your first practice test takes about 90 minutes — or start with a
>   single section.` + two CTAs
> - Confirm `py-4.5` was fixed in T0.2
>
> **Acceptance:** deltas never compare an `ESTIMATE`/`INCOMPLETE` attempt to a `FULL_LENGTH` one ·
> abandoned rows not in the default view · card list below `md` with no horizontal scroll.

---

## T5.4 — Progress data layer

> **Do:** build the aggregations Phases 5, 6 and 9 depend on, in `src/lib/queries/progress.ts`.
>
> 1. `getScoreTrend(userId)` — `FULL_LENGTH` attempts in order: total, RW, Math, date, attempt id.
> 2. `getDomainMastery(userId)` — per domain per attempt: correct, total, accuracy, shaped for a
>    domains × attempts heatmap. **This is the expensive one** — it needs `Answer` → `Question.domain`
>    per attempt and no aggregate exists. Measure at 10 attempts before shipping; add a materialised
>    summary if it's slow.
> 3. `getDifficultyTrend(userId)` — accuracy by Easy/Medium/Hard per attempt.
> 4. `getPacingTrend(userId)` — mean seconds/question per section per attempt (`Answer.timeSpent`),
>    plus counts over 1:10 R&W / 1:35 Math and over 3 minutes.
> 5. `getWeakestDomains(userId, limit)` — **weighted by question count** so a 0/1 domain doesn't
>    outrank a 4/12 one. Return the weighting so the UI can explain itself.
> 6. `getGapToTarget(userId)` — best vs `StudentProfile` targets, per section.
>
> Rules: exclude non-`FULL_LENGTH` from trend lines or label them separately — **never mix scales**.
> Handle 0 and 1 attempts without throwing. Aggregate in SQL; no N+1. Unit-test against a fixture with
> 0, 1, 3 and 10 attempts including an `INCOMPLETE` one.
>
> **Acceptance:** all six tested · none over 150ms at 20 attempts (report actual numbers) ·
> section-only attempts never pollute a /1600 trend.

---

## T5.5 — `/progress`

> **`src/components/score-trend.tsx` (88 LOC, hand-rolled SVG, server component) already renders the
> score trend on the dashboard. Extend it — do not start over.** Charting stays hand-rolled; that
> decision is ratified (no charting dep installed).
>
> **Do:**
> 1. **Score over time** — extend `score-trend.tsx`: RW/Math series toggleable via `SegmentedControl`,
>    the `StudentProfile` target as a dashed rule, test date on the x-axis, hover detail, click →
>    that score report.
> 2. **Domain mastery heatmap** — domains × attempts, graded cells. Highest value for a tutor looking
>    over a student's shoulder; give it the most space.
> 3. **Accuracy by difficulty** — three sparklines. Reveals grinding hard questions while dropping
>    easy ones.
> 4. **Pacing** — seconds/question per attempt against target bands, plus over-3-minute counts.
> 5. **Gap to target** — `Progress variant="scoreBand"`: current best, target, per-section deltas.
>    `You're 140 points from your target. 90 of those are available in Math.`
>
> Requirements: **empty states matter** — at 0–1 attempts show the shell with a real explanation and a
> CTA, not a spinner. Every chart accessible: visually-hidden data table, `role="img"` with a
> descriptive label. Lazy-load below the fold.
>
> **Acceptance:** meaningful at 1, 2 and 10 attempts · zero new charting deps · screen reader can
> access every chart's data · legible at 360px (reflow, don't shrink).

---

## T6.1 — Results hero: deltas, gap to target, remove `tierLabel()`

> **Do:**
> 1. Refactor the inline gauge onto `ScoreDial` (T1.7), including the `scorePct` floor fix — a 400
>    currently renders as an empty ring.
> 2. **Delta vs the previous `FULL_LENGTH` attempt**: `+60 from your last full test`, `.tabular`,
>    emerald/red. Most-wanted number on the page and it's absent.
> 3. **Gap to target** from `StudentProfile`.
> 4. **Delete `tierLabel()` (`results/[attemptId]/page.tsx:316`).** It returns "Above Average Score" /
>    "Room to Grow" from a raw `total/1600` ratio against **no distribution at all**. It violates
>    CLAUDE.md's "never state a number the product cannot back" and is still live for every
>    `FULL_LENGTH` attempt. Replace with self-comparison: your best, your average, your target.
>    (This also resolves the dead `text-emerald-350` pills from T0.2 by removing their container — if
>    T0.2 already fixed them, remove them here anyway.)
> 5. Section cards show fidelity-aware scales and per-section deltas.
>
> **Acceptance:** no claim implies comparison to other students · deltas correct across mixed
> fidelity histories and absent where not comparable · `ScoreDial` announces its value.

---

## T6.2 — Labelled section score for `INCOMPLETE` attempts

> **This is a product decision, not the correctness fix the plan described.** Recon: `getScoreFidelity()`
> already returns `INCOMPLETE` for section-only attempts, and every consumer suppresses the score
> entirely — the results page replaces the hero with *"a 400–1600 total would be misleading"*, the
> dashboard and admin render `—`, `computeAttemptScorePoint` returns null.
>
> That is correct but arguably too conservative: **a student who takes a math-only test currently gets
> zero score feedback.**
>
> **Do:**
> 1. **Do not add a `scoreScope` enum.** It would be a second, conflicting policy alongside
>    `ScoreFidelity`. Extend the existing enum's *presentation*, not the model.
> 2. For `INCOMPLETE` attempts where exactly one section has questions, show that section's scaled
>    score with an explicit scale and label: `430 /800 · Math only`. Keep the "no 1600 total"
>    explanation.
> 3. Keep them excluded from avg/best and from the trend (`dashboard/page.tsx:75`,
>    `analytics.ts:190`) — showing a section score is not the same as counting it.
> 4. Apply consistently: results hero, dashboard history, `admin/users/[id]:165`,
>    `admin/attempts` (which already prefixes `Est.` for `ESTIMATE`), and the CSV export.
> 5. Update `docs/scoring-policy.md` and the `/scoring` page to describe the new presentation.
> 6. Extend `tests/scoring.test.ts` to cover the presentation rule.
>
> **Acceptance:** a math-only attempt shows a labelled `/800` score and no 1600 total · avg/best and
> trend unchanged · `ScoreFidelity` remains the single policy · scoring tests pass.

---

## T6.3 — "What to work on next"

> `computeDomainBreakdown` (`scoring.ts:305`) already returns the needed shape — this is cheap.
>
> **Do:** a block under the score hero, above the section cards:
> 1. Top three weakest domains from `getWeakestDomains` (weighted, per T5.4).
> 2. Each with a plain-language diagnosis, `Drill this` (stub → `/drill` until Phase 8) and
>    `Review these N questions` (deep-links into filtered review — works after T6.5).
> 3. One pacing insight when supported: `You spent over 3 minutes on 6 questions, all in Module 2.
>    Practice skipping and returning.`
> 4. **No percentage for a domain with fewer than 4 answered questions** — say so instead.
>
> **Acceptance:** recommendations reproducible and explainable · no small-sample percentages · every
> CTA leads somewhere real.

---

## T6.4 — `QuestionMap`

> **Do:** a strip of squares per module — correct / incorrect / skipped, flag marker, mono-numbered,
> clickable to jump into review. `Answer.isMarkedForReview` + `response` + `isCorrect` give all four
> states today.
>
> **Reuse the in-test navigator's visual language** — students already learned it during the test.
>
> Keyboard-navigable as a grid; each square labelled (`Question 14, incorrect, flagged`); legend above.
>
> **Acceptance:** matches the navigator visually · clicking lands on that exact question · operable by
> keyboard and announced.

---

## T6.5 — Review filters with URL state

> **Highest-value item in the phase.** `review-client.tsx` (563 LOC) has a single `index` state, no
> filters, no URL sync — reviewing 12 wrong answers means clicking through 44 questions.
>
> **Do:**
> 1. Filter bar: `All` · `Incorrect (12)` · `Flagged (5)` · `Skipped (2)` · `Slow (>2min)`, plus
>    domain and difficulty `Select`s (domains from the T2.2 tables).
> 2. **Default to `Incorrect`** when arriving from the results page's "review missed" CTA.
> 3. All state in the URL: `?filter=incorrect&domain=algebra#q7`.
> 4. Navigation and existing keyboard shortcuts move within the filtered set; counter reads
>    `3 of 12 incorrect`, not `7 of 44`.
> 5. Empty case: `No incorrect answers in this module. Nice.` + clear-filters link.
>
> **Acceptance:** one click from score report to incorrect-only review · state fully restorable from a
> pasted URL · keyboard nav respects the filter.

---

## T6.6 — Review sidebar and annotations

> **Do:**
> 1. Persistent left rail on `lg`+: every question in the current filter with status icon, number in
>    `.tabular`, domain, time spent. Current item highlighted and scrolled into view.
> 2. Below `lg`: same list in a `Sheet` behind `Questions (12)`.
> 3. Preserve the R&W two-pane resizable layout and its saved split percentage — the rail sits outside
>    it.
> 4. **Surface the student's own annotations.** `Annotation` rows exist per attempt+question with
>    offsets, colour and note, and `annotated-passage.tsx` (433 LOC) can already render them — they're
>    just invisible in review. Render them, with a note indicator in the sidebar.
>
> **Acceptance:** sidebar doesn't break the split · annotations and notes appear in review · sheet
> dismissible by drag and Esc.

---

## T6.7 — Score report PDF export

> **Do:** `Download score report (PDF)` — print stylesheet + `window.print()`, or server-side
> generation. Include total, section scores, domain breakdown, difficulty breakdown, pacing, date.
> Respect `ScoreFidelity` and the T6.2 presentation rule.
>
> **Acceptance:** legible in greyscale · paginates without cutting a chart in half · `INCOMPLETE`
> attempts export correctly labelled.

---

## T6.8 — Read-only share link

> Split out from PDF export — recon flagged it as its own feature: it needs a signed-token table,
> revocation UI, and a public path through `middleware.ts`.
>
> **Do:**
> 1. A token table with expiry and revocation.
> 2. A read-only score-report view (**not** the review page, **not** the answers), `noindex`, excluded
>    from the sitemap, showing no personal data beyond the display name.
> 3. Whitelist the path in `middleware.ts` alongside the existing `/practice`, `/test/`, `/results/`
>    entries — **and make sure the share path cannot be walked back into an authenticated
>    `/results/[attemptId]`.**
> 4. Revocation UI in `/account`.
>
> **Acceptance:** revoked links return a clear message, not a 500 · expiry enforced server-side · no
> path from a share token to authenticated data.

---

## T7.1 — Playwright coverage

> **Gate for all of Phase 7. Nothing else starts until this is green.**
>
> There is **no Playwright at all** — no dep, no config, no `test:e2e` script. Existing coverage is 12
> vitest files including `test-interface.test.tsx` and an integration `attempt-lifecycle.test.ts`.
> The plan treated "add tests" as a bullet; it is the whole first week.
>
> **Do:** set up Playwright and cover six flows against a seeded DB:
> 1. **Answer persistence across reload** — answer 5, hard reload mid-module, verify answers,
>    `eliminatedChoices`, flags and annotations all survive.
> 2. **Module submit and adaptive routing** — complete Module 1, verify the review screen's
>    answered/unanswered/flagged states, submit, verify Module 2 loads and `ModuleResult.routedTo`
>    points at the correct difficulty variant.
> 3. **Auto-submit at zero** — mock the server clock against `moduleDeadlineAt`; verify the 1-minute
>    warning, the critical pulse, the "Time's up" overlay, and that answers submit.
> 4. **Duplicate-tab lock** — second browser context; stale tab locks, active tab unaffected.
> 5. **Break screen** — 10-minute timer, resume, correct next module.
> 6. **Resume mid-attempt** — leave, return via dashboard, verify the resuming splash, question
>    position, and remaining time from the server clock.
>
> Plus a deterministic seed script and CI wiring on every PR touching the test interface.
>
> **Acceptance:** all six pass 10× with no flakes · CI under 5 minutes · a deliberately introduced
> persistence bug fails the suite.

---

## T7.2 — Refactor and state store

> **Prerequisite: T7.1 green.**
>
> Recon corrected the plan: it's **1,589 lines across two files** (`test-interface.tsx` 715 +
> `test-interface-components.tsx` 874) plus 5 extracted islands — already partially split, but far
> from the target.
>
> **Do:**
> 1. `src/stores/use-test-store.ts` (zustand — this also resolves open decision #6): `phase`,
>    `currentIndex`, `answers`, `eliminations`, `flags`, `annotations`, `saveStatus`, `timer`,
>    `splitPercentage`.
> 2. Split into `src/components/test/`: `top-bar`, `bottom-bar`, `question-pane`, `passage-pane`,
>    `resizable-split`, `navigator`, `module-review`, `break-screen`, `modals`, and hooks
>    `use-server-clock`, `use-autosave`, `use-connectivity`, `use-duplicate-tab`,
>    `use-keyboard-shortcuts`. **kebab-case, per repo convention.**
> 3. **No behaviour or visual changes.** The Bluebook chrome and its four hardcoded colours stay.
> 4. Timing authority stays server-side on `moduleDeadlineAt`.
> 5. `question-pane` must be reusable by `/drill` in T8.3 — design its props for that now.
> 6. Run T7.1 after every extraction step, not just at the end.
>
> **Acceptance:** every file under 300 lines · T7.1 passes unchanged, no test modified to accommodate
> the refactor · empty visual diff at 1280px and 768px · no client-side timing authority introduced.

---

## T7.3 — Test interface accessibility

> The real Digital SAT offers zoom, high contrast and screen-reader support as accommodations. A
> student who needs those cannot practise here.
>
> **Do:**
> 1. **Text size stepper** in the More menu (100/125/150/200%), persisted per user, applied via a CSS
>    custom property on the test root so passage, stem and choices scale together without breaking the
>    split.
> 2. **High-contrast mode** — a token set scoped to the test interface. The interface correctly opts
>    out of app dark mode for Bluebook realism; this is an *accessibility* mode, the justified
>    exception.
> 3. `aria-live="polite"` for question changes, save status, and timer milestones (5 min, 1 min);
>    `role="radiogroup"` on choices; eliminator as a labelled toggle per choice; focus management on
>    every modal.
> 4. **Keyboard path for annotations** — highlighting is mouse-only today (select → popup). Add a
>    per-paragraph menu or `Shift+H` for the current sentence.
> 5. Add `?` to open the existing `keyboard-shortcuts-modal.tsx`. Verify no shortcut collides with
>    screen-reader keys.
>
> **Acceptance:** zero critical axe violations in `in_module`, `review` and `break` · usable at 200%
> text on a 1024px viewport with nothing clipped · a full question answerable, eliminable, flaggable
> and highlightable by keyboard alone · VoiceOver and NVDA can complete a module.

---

## T7.4 — Tablet and mobile

> **Resolve open decision #7 first.**
>
> **Do:**
> 1. iPad is a primary device here. Audit `h-screen` and the existing visualViewport SPR keyboard
>    handling in portrait, landscape and split keyboard. The top bar must never be pushed off-screen.
> 2. Below `md`: passage into a `Sheet` with a persistent `Passage` toggle; top bar collapses section
>    and timer to one line; navigator full-screen.
> 3. Add a device check to `/test/[testId]/start` — screen size, fullscreen capability, connection.
>    It has a fullscreen explanation but **no device check**. Warn, don't block.
> 4. Verify Desmos and the reference sheet modal at tablet sizes.
>
> **Acceptance:** no breakage on iPad portrait, iPad landscape or a 390px phone · soft keyboard never
> hides the timer or current input · T7.1 passes at tablet viewport too.

---

## T7.5 — Practice-mode modifiers

> **Needs a migration the plan didn't mention:** there is nowhere on `TestAttempt` to record that an
> attempt was untimed or had extended time.
>
> **Do:**
> 1. Add columns to `TestAttempt`: `timingMode` (REAL / EXTENDED_50 / EXTENDED_100 / UNTIMED),
>    `feedbackMode` (END / IMMEDIATE), `pauseAllowed`.
> 2. Offer all three on `/test/[testId]/start`, defaults REAL / END / off.
> 3. **The results page and every trend must label modified attempts, and an untimed attempt must
>    never silently pollute the score trend.** Decide and document: exclude from trends, or mark
>    distinctly. State which. Coordinate with `getScoreFidelity` — a modifier is orthogonal to
>    fidelity, so don't overload the enum.
> 4. `IMMEDIATE` feedback reuses the review-page correctness rendering inline.
> 5. Note `PracticeBanner` already renders "THIS IS A PRACTICE TEST" — extend it to show active
>    modifiers.
>
> **Acceptance:** modifiers recorded, surfaced on results, honoured by the timer · trends never mix
> modified and unmodified without labelling · the default path is byte-identical to today's behaviour.

---

## T7.6 — Navigator, save retry, report question, telemetry disclosure

> 1. **Navigator states** — add eliminated-only (choices eliminated, no answer selected — a strong
>    "come back to me" signal) and an annotation indicator. Update the legend.
> 2. **Save-failure recovery** — the status pill reports failure with no action. Add explicit `Retry`
>    and a blocking warning before module submit naming the unsaved question numbers.
> 3. **Report a problem with this question** — More-menu action writing to a queue with question id,
>    attempt id and an optional note. Feeds T10.2.
> 4. **Disclose the telemetry.** `AttemptEvent` logs BLUR/FOCUS/FULLSCREEN_ENTER/EXIT. Say so once,
>    plainly, on the pre-test page: `While you're testing, we record when the test window loses focus,
>    so you and your tutor can see whether the attempt was uninterrupted.` Silent monitoring
>    discovered later destroys trust; disclosed monitoring is just proctoring.
>
> **Acceptance:** no module submits with an unsaved answer without an explicit warning · report queue
> receives full context · disclosure appears before the first attempt, not buried in terms.
