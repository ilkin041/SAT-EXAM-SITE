# Prompts D — Drill mode, goals, admin, hardening (Phases 8–11)

**Phase 8 blocker: T2.2 (taxonomy normalisation) must ship first.** Per-skill mastery on free-text
skill strings silently degrades.

**Route collision: `/practice` is taken** — it's the public logged-out sample-test list, whitelisted
in `middleware.ts:21`. Drill mode goes at **`/drill`**.

---

## T8.1 — Drill schema and services

> Full-length tests are a high-friction, low-frequency loop — a student takes four tests and runs out
> of product. Drill mode makes this a daily habit.
>
> **Requires T2.2.** `SkillMastery` keys on `skillId`; before T2.2 that's a nullable, unindexed,
> free-text column where `"Linear equations"` and `"Linear Equations"` are different skills.
>
> **Do:**
> 1. Migration:
>    ```prisma
>    model DrillSession {
>      id String @id @default(cuid())
>      userId String
>      mode DrillMode           // DRILL | REVIEW_QUEUE | WEAKNESS | TIMED_SET
>      filters Json
>      timed Boolean
>      feedback FeedbackMode    // IMMEDIATE | END
>      status SessionStatus
>      startedAt DateTime
>      completedAt DateTime?
>      items DrillItem[]
>    }
>    model DrillItem {
>      id String @id @default(cuid())
>      sessionId String
>      questionId String
>      order Int
>      answer String?
>      correct Boolean?
>      timeMs Int?
>      flagged Boolean @default(false)
>    }
>    model SkillMastery {
>      userId String
>      skillId String           // FK to the Skill table from T2.2
>      attempts Int
>      correct Int
>      ewma Float               // alpha 0.3
>      lastSeenAt DateTime
>      @@id([userId, skillId])
>    }
>    model ReviewQueueItem {
>      id String @id @default(cuid())
>      userId String
>      questionId String
>      reason QueueReason       // MISSED | FLAGGED | MANUAL | SLOW
>      dueAt DateTime
>      interval Int
>      ease Float @default(2.5)
>      reps Int @default(0)
>      @@unique([userId, questionId])
>    }
>    ```
> 2. `src/lib/drill/`: `build-session(filters)` with exclude-recently-seen, `record-answer`,
>    `update-mastery`, `enqueue-for-review`.
> 3. Mastery: EWMA alpha 0.3 so recent performance dominates; confidence `min(attempts/8, 1)`;
>    **fewer than 4 attempts returns "not enough data", never a percentage.**
> 4. Backfill `SkillMastery` from existing `Answer` rows joined through the new `Skill` table.
> 5. **Drill sessions are fully isolated from `TestAttempt`** — they never appear in or affect the
>    score trend.
>
> **Acceptance:** migration reversible, backfill correct against a fixture · selection never silently
> returns fewer than requested · no percentage below the confidence threshold · unit tests for
> mastery updates and selection.

---

## T8.2 — `/drill` builder

> **Route is `/drill`, not `/practice`.** `/practice` is the public sample-test list and is
> whitelisted in middleware; building authenticated features there would break the anonymous path and
> the landing page's sample-test CTA.
>
> **Do:**
> 1. **Three quick starts** covering ~90% of intent:
>    - `Drill my weakest skill` — from `SkillMastery`
>    - `Review queue (14 due)` — hidden when empty
>    - `Timed set — 10 questions, 12 minutes`
> 2. **Custom set:** cascading section → domain → skill from the T2.2 tables, difficulty mix, count
>    (5/10/20/custom), timed toggle, feedback timing.
> 3. **Live match count as filters change**, with an honest warning when the bank is thin:
>    `Only 8 questions match. Widen the difficulty range to get 20.` Never silently under-deliver.
> 4. `Exclude questions I've seen in the last 30 days`, on by default.
> 5. **Fully usable on mobile — this is the mobile use case for the whole product.** Filters in a
>    `Sheet`.
> 6. Fire `drill_started` from T2.3.
>
> **Acceptance:** ≤3 interactions from dashboard to a started drill · live count accurate and
> debounced · thin-bank warning before committing · fully operable at 360px.

---

## T8.3 — `/drill/[sessionId]` runner

> **Do:**
> 1. **Reuse `question-pane` from T7.2** — KaTeX (now static HTML from T2.1), images, SPR input,
>    eliminator, R&W split. Do not fork it; students should recognise the interface immediately.
> 2. Lighter chrome: progress dots instead of the navigator, optional per-question timer, no modules,
>    no break screen.
> 3. **Immediate feedback is the default here** — answer → correct/incorrect → explanation inline →
>    `Next`. This is a different learning loop from exam mode and it's why drill mode works. All 280
>    questions have an authored explanation; there is no AI fallback (feature removed).
> 4. `Add to review queue` and `Report this question` per item.
> 5. Autosave per answer using the same debounced pattern as the test interface.
> 6. Resumable — leaving and returning restores position.
>
> **Acceptance:** rendering visually identical to the test interface · a dropped connection loses at
> most one answer · fully operable at 360px and by keyboard.

---

## T8.4 — Session summary and mastery display

> **Do:**
> 1. `/drill/[sessionId]/summary`: accuracy, total and per-question time, per-skill breakdown, missed
>    questions with links, `Practise these again`.
> 2. **Mastery movement** — `Linear equations: 61% → 68%`, only above the confidence threshold.
> 3. `MasteryBadge`: five bands (Not started / Weak / Developing / Solid / Strong) on the token colour
>    ramp. **Never a false-precision decimal.** Below threshold: `Not enough data yet`.
> 4. Surface mastery on `/progress` as a sortable skill list; feed the dashboard's weakest-areas block
>    (T5.1 §4).
> 5. Missed questions auto-enqueue with reason `MISSED`.
>
> **Acceptance:** bands consistent everywhere · no skill under 4 attempts shows a number · summary
> under 300ms.

---

## T8.5 — Spaced repetition

> Trimmed SM-2. Keep it explainable — you must be able to tell a student why a question came back.
>
> **Do:**
> 1. Missed question enters at `dueAt = now + 1 day`.
> 2. Correct → `interval *= ease`, `ease` adjusted by response speed. Incorrect → reset to 1 day,
>    reduce `ease`.
> 3. **Cap intervals at `StudentProfile.testDate`** — no point scheduling past the exam. No test date
>    → cap at 60 days.
> 4. Retire after 3 consecutive correct reviews at interval > 21 days.
> 5. Surface due count on the dashboard `NextActionCard` and in `/drill` quick starts.
> 6. Timezone-correct: compare against the student's local day boundary, not UTC.
>
> **Acceptance:** correct across timezones and DST — unit-test this specifically · nothing scheduled
> past the test date · due counts agree between dashboard and `/drill`.

---

## T9.1 — Goals, countdown, weekly ring

> **Do:**
> 1. Surface `StudentProfile` targets and test date: dashboard countdown in `.tabular`. **Below 14
>    days the copy shifts from encouragement to prioritisation** — name specific domains rather than
>    cheering.
> 2. Editable in `/account`.
> 3. `GoalRing`: a **weekly** activity target set by the student.
>    **Explicitly not a daily streak.** A daily streak punishes the student who studies hard on
>    weekends, and a 90-minute practice test is one session, not one of seven. **No "streak broken"
>    state anywhere in the UI.**
> 4. Show on the dashboard progress block and in the weekly email.
>
> **Acceptance:** no streak-loss or guilt messaging in any state · countdown handles "no test date"
> without an empty slot · ring resets on the local week boundary.

---

## T9.2 — Email templates and preference centre

> `src/lib/email.ts` (136 LOC) is wired to Resend and sends exactly one template (password reset).
>
> **Do:** four templates, all with one-click unsubscribe and a preference centre in `/account`.
> 1. **Attempt completed** — score, delta, top two weak areas, link. Sent immediately; highest-open
>    email you'll have.
> 2. **Weekly progress** — trend sparkline as a static image, questions practised, mastery movement,
>    one recommended action.
> 3. **Re-engagement** — after 10 days inactive, **once**, with a specific hook (`14 questions are due
>    for review`). Never more than one per fortnight.
> 4. **Tutor digest** — weekly per-group summary to the group owner: who practised, score movements,
>    who has stalled.
>
> Requirements: same visual language (mono numerals, score band); table-based layout for client
> compatibility; plain-text alternates. **Hard cap: no student gets more than 2 non-transactional
> emails in any 7-day window — enforce in code, not by convention.** Needs an email-preferences table.
>
> **Acceptance:** the 2-per-week cap is enforced by a test · renders in Gmail, Outlook, Apple Mail ·
> unsubscribe works without login and takes effect immediately.

---

## T9.3 — Notification centre

> **Do:** a bell in `StudentNav` listing scored attempts, questions due for review, and newly assigned
> tests. Server-rendered list, unread count, mark-as-read, mark-all-read. **No websockets** — poll on
> navigation or revalidate on focus.
>
> **Acceptance:** unread count accurate and clears correctly · keyboard-operable and announced · no
> polling while the tab is backgrounded.

---

## T10.1 — `/admin/analytics` index

> `/admin/analytics/items` exists with no index page. **Device/viewport breakdown is impossible until
> T2.3 ships** — `AttemptEvent` records only BLUR/FOCUS/FULLSCREEN_ENTER/EXIT, no device data. Either
> sequence after T2.3 or drop that view.
>
> **Do:** hand-rolled SVG charts, filterable by date range, test and group:
> 1. Attempts over time — started / completed / abandoned, stacked.
> 2. **Completion funnel** — started → module 1 → module 2 → submitted. **Abandon rate by module is
>    the single number that tells you where the product is failing.** Give it prominence. Uses T2.3's
>    events.
> 3. Score distribution histogram.
> 4. Average score by test — surfaces mis-calibrated tests.
> 5. Median time per module vs allotted.
> 6. Device/viewport breakdown **(only after T2.3)** — settles "does mobile matter" with data.
>
> **Acceptance:** every chart has a visually-hidden data table · aggregated in SQL, under 500ms at
> 10,000 attempts · filters sync to the URL.

---

## T10.2 — Discrimination index and Needs-attention

> **Mostly already built.** `/admin/analytics/items` + `computeItemAnalysis` (`lib/analytics.ts:43`)
> already ship p-value, distractor pick-rate, mean time, and `TOO_EASY` / `TOO_HARD` /
> `DISTRACTOR_OUTDRAWS_KEY` flags with a 5-exposure floor. **Do not rebuild these.**
>
> Four things are genuinely missing:
> 1. **Discrimination index** — correlation between getting a question right and total score.
>    **A negative value almost always means the answer key is wrong.** This is the highest-value
>    missing piece. Require ≥30 responses; below that show `Not enough responses yet`.
> 2. **Authored vs actual difficulty** — flag where an `EASY` tag disagrees with a 34% correct rate,
>    with one-click `Apply suggested difficulty`.
> 3. **The report queue** from T7.6.
> 4. **A `Needs attention` tab on `/admin/questions`** with the count in the label, sorted by
>    severity, merging all of the above plus the existing flags.
>
> **Acceptance:** the nightly job is idempotent and completes in its window · negative-discrimination
> questions surface automatically · no statistic below its minimum sample · deliberately mis-keying a
> seeded question makes it appear.

---

## T10.3 — Question bank workflow

> **Do:**
> 1. **Bulk actions:** select-all-matching-filter, bulk tag, bulk difficulty, bulk assign to module,
>    bulk publish/unpublish, bulk delete naming the count.
> 2. **Preview in test chrome** — the question exactly as a student sees it, including the R&W split
>    and rendered math, from the editor. Fastest way to catch a broken question.
> 3. **Draft / published state.** **Coordinate with T3.3's `publicDemo` flag — do the publish-state
>    work once, in whichever task ships first.** Default new questions to draft.
> 4. **Require an explanation to publish.** All 280 currently have one, but `Question.explanation` is
>    nullable and nothing enforces it — one bulk import from a dead end in review.
> 5. **Version history** — questions get corrected, and a correction can invalidate prior attempt
>    data. Record who, when, what.
> 6. **Saved filter views:** `My drafts`, `Missing explanation`, `Negative discrimination`,
>    `Never used`.
> 7. **Duplicate detection** — `contentHash` and `lib/question-content-hash.ts` already exist; wire
>    them into save-time as well as import.
>
> **Acceptance:** no draft can appear in a test or the public demo · no question publishes without an
> explanation · bulk actions operate on the full filtered set and say so · version history records
> who/when/what.

---

## T10.4 — Groups, roster, student progress table

> `Group` is n─m with both `User` and `Test` via implicit join tables with **no membership metadata**
> — no role, no `joinedAt`, no invite tokens. Confirmed greenfield.
>
> **Do:**
> 1. Add membership metadata; CSV roster import with dry-run preview; invite links with expiry.
> 2. **Group detail → per-student progress table.** A tutor opens this every day; give it the most
>    design attention in the admin panel. Columns: student, last active, attempts, best, average,
>    delta, weakest domain, score sparkline, drill-down. Sortable by all, especially "stalled" (no
>    activity in N days).
> 3. Per-group report export (CSV and PDF).
> 4. Assign a **drill set** to a group, not just a test (needs Phase 8).
> 5. Preserve the existing visibility rule: a test is visible if public, owned, or assigned to the
>    student's group.
>
> **Acceptance:** progress table under 500ms for a 40-student group with no N+1 · roster import
> reports per-row outcomes and never partially applies silently · invite links expire and are
> revocable.

---

## T10.5 — Import dry-run and attempt comparison

> `import-form.tsx` (506 LOC) + `api/admin/import` (304) + `lib/import-schema.ts` (212) exist.
> Dry-run diff, per-line jump and image ingestion are absent. Cloudinary is wired
> (`api/admin/upload-image`).
>
> **Do:**
> 1. **Dry-run:** parse and validate without writing, show `12 new, 3 updated, 2 conflicts` with
>    per-line error mapping and jump-to-line. Downloadable JSON schema + template. Ingest image URLs
>    into Cloudinary during import. Resolve taxonomy names to T2.2 ids and reject unknown ones clearly.
> 2. **Attempt comparison** — side by side for the same student: scores, domain accuracy, pacing, and
>    which questions flipped correct→incorrect or back. This is what a tutor wants when a score drops.
> 3. **Flagged-behaviour review** with a real threshold. A single blur event is someone checking the
>    time, not cheating. Surface only *patterns* — repeated long blurs, fullscreen exits clustered
>    near hard questions — worded as observations, never accusations.
>
> **Acceptance:** import failures identify exact line and field · no partial write on failure ·
> comparison handles attempts on different tests gracefully · behaviour flags threshold-based and
> neutrally worded.

---

## T10.6 — Admin mobile and breadcrumbs

> **Do:**
> 1. Below `md`, every table becomes a card list. A tutor checking progress on a phone is real;
>    editing on a phone is not — read-only degradation is fine but must be **signposted, not silent**.
> 2. Breadcrumbs under the navy nav on all `[id]` detail pages — they have no sense of place today.
> 3. Keep the navy pill-tab nav; make it horizontally scrollable on narrow screens rather than
>    wrapping.
> 4. Filter panels into `Sheet` on mobile.
>
> **Acceptance:** no horizontal page scroll on any admin route at 360px · every detail page shows its
> path back · read-only degradation signposted.

---

## T11.1 — Responsive audit

> The policy table is already written down in `CLAUDE.md` — this is enforcement, not decision.
>
> **Do:** audit every route at 360, 390, 768, 1024 and 1440px. Produce
> `docs/audits/responsive-<date>.md` with a screenshot per route per breakpoint, pass/fail against the
> policy, then fix every failure.
>
> Known risk areas: landing hero at 360px, the 13 tables, the test interface on iPad portrait, the
> review two-pane split, `/progress` charts.
>
> **Acceptance:** zero horizontal scroll on full-support surfaces at 360px · every surface matches its
> declared target · audit committed.

---

## T11.2 — Remaining performance

> KaTeX was handled in T2.1. What's left:
>
> **Do:**
> 1. Confirm Desmos is still loaded on calculator open and not bundled (recon says it's an external
>    script — verify it hasn't regressed).
> 2. `next/dynamic` for the navigator, all modals, the reference sheet, and every chart.
> 3. Font subsetting for Plus Jakarta Sans and IBM Plex Mono; `display: swap`; preload only
>    above-the-fold weights.
> 4. Images: AVIF/WebP, explicit dimensions, `sizes`, Cloudinary transforms on question images.
> 5. **Address the recompute-on-every-render score problem** if `/progress` or the Δ column measured
>    slow in T5.3/T5.4 — either a persisted score column with a recompute path, or a cached
>    aggregate. Decide with the measurements, not in advance.
> 6. Re-run `npm run analyze` and diff every route against `docs/baselines.md`.
>
> **Targets:** LCP < 2.0s, INP < 200ms, CLS < 0.05 on throttled 4G for `/`, `/dashboard`,
> `/results/[attemptId]`, and the test interface.
>
> **Acceptance:** targets met and evidenced · per-route bundle deltas reported · T7.1 still passes.

---

## T11.3 — WCAG 2.2 AA pass

> T0.1 fixed the global focus failure and T0.2 the dead colour classes. This is the full sweep.
>
> **Do:**
> 1. Contrast on every text-over-colour combination. Likeliest remaining failures: muted text on the
>    tutor band and any surviving text over a gradient.
> 2. Focus visible everywhere, re-verified after all of Phase 1–10's new components.
> 3. Heading order; exactly one `h1` per page.
> 4. Forms: label association, error announcement, no colour-only status.
> 5. Keyboard traversal: landing demo, dashboard cards, review filters, test interface, admin tables,
>    drill runner.
> 6. Screen reader pass (VoiceOver + NVDA) on three core flows: take a test, read a score report,
>    review answers.
> 7. Target sizes: 24×24px minimum (WCAG 2.2 addition).
>
> Produce `docs/audits/a11y-<date>.md` with before/after violation counts and anything deferred with a
> reason.
>
> **Acceptance:** zero critical/serious axe violations on any route · all three flows completable by
> keyboard alone and by screen reader.

---

## T11.4 — Localisation (optional)

> **Only if an Azerbaijani and/or Russian UI has commercial value.** Cheap now; roughly 3× after
> Phase 8.
>
> **Do:**
> 1. `next-intl`. Extract every user-facing string into catalogues.
> 2. **UI chrome is localised; question content stays in English** — the SAT is an English exam and
>    translating stems would be actively harmful.
> 3. Locale-aware dates, numbers and durations; score figures stay `.tabular` regardless.
> 4. Locale switcher in the nav, persisted per user.
> 5. Verify layout at ~40% longer strings — both languages run longer than English and will break
>    tight buttons and table headers.
>
> **Acceptance:** zero hardcoded user-facing strings in components · no breakage at +40% string
> length · question content explicitly excluded.
