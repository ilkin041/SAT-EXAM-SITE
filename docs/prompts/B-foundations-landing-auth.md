# Prompts B — Foundations, landing, auth (Phases 2–4)

Phase 3 needs open decisions #1 (audience), #3 (paid tiers), #4 (licensing) resolved.
Decision #2 (adaptive) is answered in code — but **query `Test.mode` where `isPublic` before writing
landing copy**, because the badges you see are seeded data.

---

## T2.1 — Render KaTeX to static HTML at save time

> Recon corrected the plan: Desmos is an external script loaded on calculator open and is **not in
> the bundle**. The real outlier is **KaTeX / `react-katex` at 288–320 kB First Load** on
> `/admin/questions/[id]`, `/admin/questions/new`, `/results/[attemptId]/review` and
> `/test/attempt/[attemptId]`. Two of those are student routes.
>
> The question bank changes rarely, so rendering math once at authoring time and storing the HTML is
> strictly better than shipping a math renderer to every student.
>
> **Do:**
> 1. Add nullable `stemHtml` / `passageHtml` / `explanationHtml` columns (or one `renderedHtml` Json)
>    to `Question`, populated server-side on save with KaTeX `renderToString`.
> 2. Backfill all 280 questions in a migration script. Report any that fail to render.
> 3. Student surfaces (`review-client.tsx`, the test interface, `/drill` later) consume the stored
>    HTML through the existing `sanitize-html` config — **KaTeX JS stops shipping to students.**
> 4. Keep a client-side fallback for records with null rendered HTML so nothing breaks mid-migration.
> 5. Admin keeps live client-side rendering for the editor preview — that route can afford it.
> 6. Ship KaTeX's CSS and subset its fonts to the glyphs the bank actually uses.
> 7. Report First Load JS before and after for all four routes against `docs/baselines.md`.
>
> **Acceptance:** review and test-interface First Load drops by ≥180 kB · all 280 render identically
> before/after (spot-check 20 including the most math-heavy) · null-rendered records still display.

---

## T2.2 — Normalise the skill and domain taxonomy

> **Blocks all of Phase 8.** `Question.domain` is free-text String (indexed); `Question.skill` is
> nullable free-text, **not indexed**, with no controlled vocabulary. Today `"Linear equations"`,
> `"Linear Equations"` and `"linear equations "` are three different skills. `SkillMastery` keyed on
> `skillId` and per-skill drilling silently degrade without this.
>
> **Do:**
> 1. Audit first: list every distinct `domain` and `skill` value with counts and flag near-duplicates
>    (case, whitespace, punctuation, singular/plural). **Show me this before migrating.**
> 2. Introduce `Domain` and `Skill` tables with stable ids, canonical names, and a `sectionType`.
>    Seed from `src/lib/question-taxonomy.ts` (42 LOC) plus whatever the audit found.
> 3. Migrate `Question.domain` / `Question.skill` to FKs. Map every existing value; anything
>    unmappable goes to a review list rather than being silently dropped.
> 4. Update the admin question form to a `Select` over the controlled vocabulary, with an
>    add-new-skill path that goes through the table.
> 5. Update the import path (`lib/import-schema.ts`, `api/admin/import`) to resolve names to ids and
>    reject unknown ones with a clear message.
> 6. Update `computeDomainBreakdown` and `lib/analytics.ts` to join through the new tables.
>
> **Out of scope:** `SkillMastery` itself — T8.1.
>
> **Acceptance:** zero free-text skill/domain writes remain possible · every existing question mapped
> or on the review list · domain breakdown output unchanged for existing attempts · import rejects
> unknown taxonomy with a usable error.

---

## T2.3 — Event pipeline

> Recon: **product metrics are not measurable at all — there is no event pipeline.** The plan's
> Phase 0 treated this as a measurement task; it is a build task. `AttemptEvent` records only
> BLUR/FOCUS/FULLSCREEN_ENTER/EXIT — no device, viewport or user agent, so T10.1's device breakdown
> is impossible today.
>
> **Do:**
> 1. Add a minimal server-side event table: `userId?`, `sessionId`, `name`, `props` (Json),
>    `createdAt`, plus `deviceType` / `viewportWidth` / `userAgent` captured once per session.
> 2. Instrument the funnel metrics the roadmap needs: `signup_completed`, `onboarding_completed`,
>    `onboarding_skipped`, `attempt_started`, `module_completed`, `attempt_submitted`,
>    `attempt_abandoned`, `results_viewed`, `review_opened`, `drill_started`, `drill_completed`.
> 3. Capture device/viewport on attempt start so T10.1 can answer "does mobile matter" with data.
> 4. Keep it first-party and privacy-respecting — no third-party analytics, no PII in `props`. Note
>    what you store; it feeds the `/privacy` page in T3.8.
> 5. Add a simple `/admin/analytics` funnel query on top (the full page is T10.1).
>
> **Acceptance:** all eleven events fire correctly in a manual walkthrough · device captured per
> attempt · no PII in `props` · writes are non-blocking and never fail a user action.

---

## T3.1 — Marketing chrome, metadata, sitemap, OG

> Note: **25 of 27 pages already export `metadata`** — only `/` and `/admin/groups/[id]` don't, so
> the landing page inherits the root's generic title. That part is cheaper than the plan assumed.
> Genuinely absent: `sitemap.ts`, `robots.ts`, OG images, canonicals, all JSON-LD.
>
> **Do:**
> 1. **There are no route groups and `src/app/page.tsx` is one 460-line file with every section
>    inline.** Split it into `src/components/marketing/*.tsx` — do not create an `app/(marketing)/`
>    group.
> 2. Shared marketing header and footer components. Header: sticky, **solid + border past 40px**
>    (glass over the hero fails contrast), nav = Product · For tutors · Scoring · FAQ, then Sign in /
>    Sign up, or `Go to dashboard` when authed. Mobile nav in a `Sheet`.
> 3. Footer: four columns — Product, Learn, Account, Legal.
> 4. `metadata` for `/` and `/admin/groups/[id]`; canonicals everywhere.
> 5. Dynamic OG images via `next/og`, one template parameterised by title.
> 6. `src/app/sitemap.ts` and `src/app/robots.ts` — exclude authenticated routes.
> 7. `Organization` + `WebApplication` JSON-LD.
>
> **Acceptance:** header contrast passes AA at every scroll position · OG verified in a preview
> debugger · sitemap excludes authed routes · `/` no longer inherits the root title.

---

## T3.2 — Real stats strip

> The plan's snippet **will not compile**: `Question.published` and `Test.visibility` do not exist.
> Use `prisma.question.count()` and `prisma.test.count({ where: { isPublic: true } })`.
> The `∞` glyph and the stray comma are already fixed.
>
> **Do:**
> 1. Query real figures in the RSC with `export const revalidate = 3600`.
> 2. **Round down, never up** (280 → `250+`). Add a helper enforcing it.
> 3. Drop `1600 Max SAT Score` — a fact about the SAT, not a statistic about this product.
> 4. Four tiles: questions in the bank · public tests · tests completed by students · Free, no card.
>    If a figure is unimpressive, **remove the tile rather than inflate the number**; below ~50
>    completed attempts, hide that tile.
> 5. All figures in `.tabular`.
>
> **Acceptance:** every number traces to a query or is removed · adding a test in admin changes the
> figure within the revalidation window · nothing rounded up.

---

## T3.3 — `LiveQuestionDemo`

> **Cheaper than the plan assumed.** Recon found `/practice` already gives logged-out visitors a
> full real test with HMAC-cookie-bound anonymous attempts. So this is an *entry point*, not the only
> unauthenticated path — and it should hand off to `/practice`, not compete with it.
>
> **Blocked on open decision #4 (licensing): demo questions must be originally authored, not College
> Board content.**
>
> **Do:**
> 1. Add a `publicDemo: Boolean` flag to `Question` with a migration and an admin toggle. There is no
>    `published`/`PUBLIC_DEMO` field today — the plan listed this as free and it isn't.
>    **Coordinate with T10.3's draft/published state — do the publish-state work once, in whichever
>    task runs first.**
> 2. `src/components/marketing/live-question-demo.tsx`:
>    - Server-render the shell (no LCP cost), hydrate interactions
>    - Three curated questions: one R&W with a short passage, two Math
>    - **Timer starts on first interaction, not page load**
>    - Real answer-choice geometry, real A/B/C/D letters, **working ABC eliminator** — your most
>      distinctive interaction and nobody knows it exists
>    - On submit: correct/incorrect, the authored explanation, time taken in `.tabular`
>    - After the third: honest mini-summary (`2 of 3 · 1m 12s`), **no fabricated score projection**,
>      then two CTAs — `Take a full sample test` → `/practice` (no signup needed) and
>      `Create free account`
>    - Anonymous, `sessionStorage` only, no attempt row, nothing migrated on signup
> 3. Chrome matches the real test: `MODULE 1 · MATH` eyebrow, mono timer, `QUESTION 1 OF 3`.
> 4. **Must be fully responsive to 360px** — stack passage above question, eliminator as an explicit
>    toggle on touch.
> 5. Rate-limit the demo API by IP (`lib/rate-limit.ts` exists).
>
> **Acceptance:** logged-out visitor answers a real question and reads a real explanation · eliminator
> works on desktop and touch · ≤15 kB gzipped, doesn't block LCP · keyboard-operable · 360px clean.

---

## T3.4 — Hero rebuild

> **Do:** rebuild around `LiveQuestionDemo` as the signature element.
>
> ```
> eyebrow (mono):  BLUEBOOK-STYLE DIGITAL SAT PRACTICE
> H1 (solid ink, --text-display, no gradient span)
> body-lg at max-w-[52ch]
> [Try a question →]  [Create free account]
> ▓ LiveQuestionDemo ▓   ← the page's one bold element
> ```
>
> - Delete the 15s `animated-gradient-bg` and the two blurred orbs if T0.7 hasn't; single static
>   radial bloom plus an answer-bubble lattice at 3%.
> - **H1 gradient span goes away** — the demo carries the page's one gradient.
> - Remove the three green-check items; they duplicate the stats strip at body weight.
> - `MockTestCard` is behind `lg:block` — **delete it**, the demo replaces it and works on mobile.
> - One orchestrated load sequence, 60ms stagger, off under reduced motion.
> - Hero height is content-driven; do not pad to fill a viewport.
>
> Copy: use Appendix B of the improvement plan, or its tutor variant if decision #1 resolves that way.
>
> **Acceptance:** exactly one gradient in the hero viewport · LCP < 2.0s throttled 4G · fully usable
> at 360px with no `lg:block`-only content.

---

## T3.5 — `ScreenshotTabs`

> **Do:** real screenshots, not mockups. `Tabs`: Test interface · Score report · Answer review ·
> For tutors.
>
> - Capture at 2× from a seeded account. **The test-interface shot must show a visible highlight and
>   an eliminated choice** — show what differentiates you.
> - Subtle device frame, `next/image`, AVIF+WebP, explicit dimensions, `sizes`, blur placeholder,
>   `priority={false}`.
> - Two or three short callout labels per tab. Labels, not paragraphs.
> - Heading: `See it before you sign up.` Sub: `These are real screens, not mockups.`
> - Mobile: scrollable pill row; allow pinch zoom.
>
> **Acceptance:** no layout shift on tab change · under 400 kB total · arrow-key navigable.

---

## T3.6 — Capability bento

> **Query the database first:** `SELECT mode, count(*) FROM "Test" WHERE "isPublic" GROUP BY mode`.
> Adaptive routing is fully implemented (`src/lib/adaptive-routing.ts`, `ModuleResult.routedTo`,
> 600-point EASY cap, tested), so the `LINEAR` badges are a *data* problem. **If no public test is
> ADAPTIVE, either seed one or demote the tile — do not claim it.** Tell me the query result.
>
> **Do:** asymmetric grid where size encodes importance:
> - **Large — adaptive module routing**, with a ~6s looping SVG: Module 1 → threshold → two Module 2
>   branches. Static final frame under reduced motion.
> - Medium — **Bluebook-accurate interface**: eliminator, passage highlighting with notes, Desmos,
>   reference sheet, keyboard shortcuts, server-anchored timer. Specificity is the proof.
> - Medium — **a report that tells you what to do**.
> - Small — **works on iPad**.
> - Small — **free, no card** (or a fourth capability; **do not use `--gradient-accent`, it is
>   unassigned since the AI feature was removed**).
>
> **Acceptance:** the adaptive claim matches what a new signup finds · diagram reads without the
> caption · reflows to one column at 360px with no orphan tiles.

---

## T3.7 — FAQ + JSON-LD

> Needs `@radix-ui/react-accordion` from T1.6.
>
> Eight items. **Q3 can be answered verbatim from `docs/scoring-policy.md`**, which already exists and
> is good honest work.
>
> 1. Is this the real SAT? — **answer plainly: no, practice built to the Digital SAT format.** The
>    plainness is the trust signal.
> 2. Where do the questions come from?
> 3. How is the 200–800 score calculated? → links `/scoring`
> 4. Is it really free? Card required?
> 5. Does it work on iPad / Chromebook?
> 6. Adaptive vs linear mode?
> 7. Can I use this with my students?
> 8. What happens to my data? (align with what T2.3 actually stores)
>
> `FAQPage` JSON-LD generated **from the same source array as the rendered accordion** so they cannot
> drift. Also render at `/faq` from the same data. First item open, rest collapsed.
>
> **Acceptance:** JSON-LD validates in Rich Results · structured data matches visible content exactly.

---

## T3.8 — Scoring block, tutor band, closing CTA, content pages

> **Do:**
> 1. **Scoring block** — raw counts convert to 200–800 per section via a published table; it's an
>    estimate, not an official score. Link `/scoring`. **You have no testimonials — do not invent
>    any.** "We show our work" is the stronger signal.
> 2. **Tutor band** — inverted, `--brand-navy` (the admin product's own colour). Question bank, test
>    assembly, groups, assignment, CSV export, bulk JSON import. CTA → `/for-tutors`.
> 3. **How it works** — keep the three numbered steps (a real sequence), tighten to `py-16`, raise the
>    connector line's contrast (`page.tsx:222` is nearly invisible).
> 4. **Closing CTA — one button.** Currently two competing CTAs in a ~280px band for one headline.
> 5. Five content pages: **`/scoring`** (port `docs/scoring-policy.md` — it's good and currently
>    invisible to students; include how `INCOMPLETE` attempts are handled), **`/sat-format`** (a real
>    Digital SAT guide worth reading on its own — this earns organic traffic), **`/for-tutors`**,
>    **`/privacy`**, **`/terms`** (cover what T2.3 stores, retention, Cloudinary and Resend; flag
>    anything you need me to confirm rather than inventing policy).
>
> **Acceptance:** no fabricated social proof anywhere · closing band has one CTA · `/scoring` matches
> what `src/lib/scoring.ts` actually does · no placeholder text ships.

---

## T4.1 — Auth visual unification and mobile brand band

> Four pages, same problems: gradient panel `hidden lg:block` so **the brand vanishes on mobile**;
> panel is a gradient while `Sign in` is solid `bg-primary`, so the page has two blues; the
> `rgba(255,255,255,0.8)` dot lattice is copy-pasted four times.
>
> **Do:**
> 1. Panel → **solid `--primary`** with the lattice and one soft bloom. Gradient moves to the submit
>    button only. (Coordinated with T1.8.)
> 2. **Make the panel earn 50% of the screen.** It currently holds an icon, two lines and a pill.
>    Replace with something substantive — a rotating real question stem with its answer revealed, or a
>    compact what-you-get list in mono eyebrows. Pick one and justify it.
> 3. **Below `lg`, a 96px solid branded band** (logo + one line) instead of dropping the panel.
> 4. Extract the lattice into one component used by all four (if T0.7 hasn't).
>
> **Acceptance:** panel and primary button sample the same base indigo · brand present from 360px ·
> one gradient per auth viewport.

---

## T4.2 — Auth form quality and error copy

> Note: `/forgot-password` **already returns a generic response** and `lib/rate-limit.ts` exists —
> that part is closer to done than the plan assumed.
>
> **Do:**
> 1. Refactor all four forms plus `account-forms.tsx` onto `Field`.
> 2. Add caps-lock warning, a `PasswordStrength` meter on signup and reset (rules-based, no heavy
>    dep), correct `autocomplete` (`email` / `current-password` / `new-password`), `inputMode`,
>    submit-on-Enter.
> 3. Error summary at the top on failure, linked via `aria-describedby`, focus moved to it.
> 4. **Rewrite every error string** — what happened and what to do, no apology, no vagueness:
>    - `That email and password don't match an account. Check the email, or reset your password.`
>    - `This email is already registered. Sign in instead, or reset your password.`
>    - `Your reset link has expired. Request a new one — links are valid for 1 hour.`
> 5. Confirm the login endpoint is rate-limited too, and that forgot-password can't be timed for
>    account enumeration.
>
> **Acceptance:** no vague or apologetic error in the flow · no enumeration via response or timing ·
> password managers fill and save on all four · axe clean on all four.

---

## T4.3 — `StudentProfile` and `/welcome`

> `StudentProfile` genuinely doesn't exist and blocks T5.1's countdown, T6.1's gap-to-target, T9.1's
> goals and T8.5's test-date interval cap.
>
> **Do:**
> 1. `StudentProfile`: `userId`, `testDate?`, `targetTotal`, `targetRW`, `targetMath`, `focusDomains`
>    (FK to the `Domain` table from T2.2, not free text), `onboardedAt`. Migration included.
> 2. `/welcome` — three screens, skippable, once after signup, progress rail, mono step counter
>    (`01 / 03`):
>    - **When's your test?** Date picker + `Not scheduled yet`
>    - **Target score?** 400–1600 slider **rendered on `Progress variant="scoreBand"`** so onboarding
>      uses the same motif as the results page. Per-section split.
>    - **Where to focus?** Multi-select over the real `Domain` table, not a hardcoded list.
> 3. Final screen: one CTA, `Take your first practice test`, deep-linked to a recommended test.
> 4. Redirect a user with no `onboardedAt` from `/dashboard` to `/welcome` **exactly once**. Skipping
>    sets `onboardedAt` with null targets — never loop.
> 5. Editable later in `/account`.
> 6. Fire `onboarding_completed` / `onboarding_skipped` from T2.3.
>
> **Acceptance:** median completion under 45s · skipping never re-triggers · domains queried, not
> hardcoded · slider has a numeric input fallback.
