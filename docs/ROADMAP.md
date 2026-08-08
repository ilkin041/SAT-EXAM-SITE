# Roadmap v2 — corrected against `docs/recon.md`

65 tasks, 12 phases. One task per Claude Code session (`+` for a new chat, or `/clear`).

## Setup

```
your-repo/
├── CLAUDE.md                    ← repo root
└── docs/
    ├── improvement-plan.md      ← rationale (already there, AI items struck)
    ├── recon.md                 ← ground truth (already there)
    ├── baselines.md             ← (already there)
    ├── ROADMAP.md               ← this file
    └── prompts/                 ← the four prompt files
```

Put the prompt files in `docs/prompts/` so a task can reference another task by ID.

## What changed from v1

Recon found twelve errors. The corrections:

- **Paths:** `src/app/`, no route groups. Every v1 path was wrong.
- **npm**, not pnpm. No `typecheck` script. No ESLint config at all. No Playwright.
- **Score bug does not exist.** `getScoreFidelity()` already suppresses section-only scores. The old
  T0.2 is deleted and replaced by a *product* decision task (T6.2) about labelling them.
- **`/practice` is taken** — public logged-out sample tests. Drill mode moves to `/drill`.
- **Adaptive routing is implemented.** The LINEAR badges are seeded data, not a capability gap.
- **AI explanation feature removed.** That task is deleted; `--gradient-accent` is now unassigned.
- **13 hand-rolled tables**, not 5. Two are on student surfaces.
- **KaTeX is the perf outlier** (288–320 kB First Load on 4 routes), not Desmos. Promoted from
  Phase 11 to Phase 2.
- **New Phase 0** for things that are broken right now: dead `focus-visible`, dead Tailwind classes,
  missing `fontFamily.mono`, theme flash.
- **New Phase 2** for foundations that block later phases: KaTeX, skill-taxonomy normalisation, and
  an event pipeline (product metrics are currently unmeasurable).
- **`/admin/analytics/items` already ships** p-value, distractor rates and 3 flags. Only the
  discrimination index and three other pieces are missing.

## Order

Phase 0 → 1 → 2, then 3–11 roughly in order. Phase 7 cannot start before T7.1 is green.
Phase 8 cannot start before T2.2.

## Progress

A task is done when it is committed on `master`, so the `Done` column carries the commit — the
roadmap and `git log` cannot drift apart that way. Only phases with completed work have the column.
**24 of 65 done:** Phase 0, Phase 1 and Phase 2 complete; Phase 3 started.

---

## Phase 0 — Repairs · `prompts/A-repairs-design-system.md`

Things producing no styles or failing WCAG **today**.

| ID | Task | Done |
|---|---|---|
| T0.1 | Restore `:focus-visible` + add global `prefers-reduced-motion` | `f68569c` |
| T0.2 | Repair dead Tailwind classes, add `fontFamily.mono`, map accent tokens | `2037478` |
| T0.3 | Theme-flash blocking script + tri-state `ThemeToggle` | `ba4389c` |
| T0.4 | Create ESLint config + guardrails (with test-dir exemption) | `c9b6a26` |
| T0.5 | `loading.tsx` / `error.tsx` / `not-found.tsx` + `Skeleton` | `97f86ee` |
| T0.6 | Shared-chrome gradient fix — biggest single budget win | `8e1cfe2` |
| T0.7 | Remaining quick wins | `40245f3` |

## Phase 1 — Design system · `prompts/A-repairs-design-system.md`

| ID | Task | Done |
|---|---|---|
| T1.1 | Tokens, type scale, IBM Plex Mono, `.tabular` / `.eyebrow` | `6f6974a` |
| T1.2 | `/ui` gallery (needs a middleware whitelist entry) | `f90f278` |
| T1.3 | `Select` + retire 3 `SELECT_CLS` declarations | `04ab3f9` |
| T1.4 | `Table` + `DataTable` | `5a092b1` |
| T1.5 | `Modal`, `Tabs`, `Tooltip`, `Alert`, `SegmentedControl`, `Sheet` | `fdc84f6` |
| T1.6 | `Pagination`, `Avatar`, `Field`, `Separator`, `Accordion` | `4b2906b` |
| T1.7 | `Progress`, `ScoreDial`, `DomainBar` | `d8c3dd6` |
| T1.8 | `Button` soft/xs + page-level gradient sweep | `317fc4d` |
| T1.9 | Migrate 13 tables to `DataTable`; resolve zustand (removed) | `40ad293` |

## Phase 2 — Foundations that unblock · `prompts/B-foundations-landing-auth.md`

| ID | Task | Done |
|---|---|---|
| T2.1 | KaTeX → static HTML at save time (−180 kB review, −179 kB test interface) | `e0f1594` |
| T2.2 | Normalise `Question.skill` / `domain` into a controlled vocabulary (8 domains, 29 skills; 240 mapped, 40 queued for review) | `d8e7181` |
| T2.3 | Event pipeline so product metrics become measurable (11 events catalogued, 7 live; device per attempt; `/admin/analytics` funnel) | `1dcf105` |

## Phase 3 — Landing · `prompts/B-foundations-landing-auth.md`

| ID | Task | Done |
|---|---|---|
| T3.1 | Marketing chrome + SEO: landing split into `components/marketing/`, shared header/footer, canonicals on all 33 pages, `sitemap.ts`, `robots.ts`, dynamic OG, Organization + WebApplication JSON-LD | `c7fde63` |
| T3.2 | Real stats strip: four hardcoded tiles → live counts rounded down (`250+` questions, `5` free tests); `1600 Max SAT Score` and the sub-threshold completed tile removed | `efcaded` |
| T3.3 | `LiveQuestionDemo`: `Question.publicDemo` + admin toggle, three originally-authored demo questions, `/api/demo/answer` (IP rate-limited), real eliminator geometry, hands off to `/practice` | `28eda2f` |
| T3.4 | Hero rebuild: demo folded into the hero as the signature (and the page's one gradient, off the CTA), student-first Appendix B copy minus the unbacked "adaptive", `MockTestCard` + green-check items deleted, answer-bubble lattice, `.hero-rise` 60ms stagger | `d90fd17` |
| T3.5 | `ScreenshotTabs`: four real screens (`gen:screenshots`, hand-rolled CDP) in one fixed-ratio frame, three original R&W questions + a seeded fixture so no licensed content is published, AVIF+WebP, callout labels in `lib/product-screens.ts` | `bff5be9` |
| T3.6 | Capability bento: `Capabilities` replaces `Features`, five tiles where area encodes importance, a 6s two-pass routing diagram in inline SVG (two orientations so it reads at 360px), and `db:seed-adaptive-test` — the public bank was 5 LINEAR / 0 ADAPTIVE, so the claim was seeded rather than written | `529c9fd` |
| T3.7 | FAQ + JSON-LD: eight items in `lib/faq.ts` feeding the accordion, `/faq` and the `FAQPage` graph from one array; `<details>` rather than the `Accordion` primitive because Radix omits a closed panel from the DOM and a crawler does not click; `/faq` added to the middleware whitelist, which `sitemap.ts` now has a test for | `726efbf` |
| T3.8 | Scoring block ("We show our work" — the conversion tables printed on the page, rendered from `DEFAULT_RW_TABLE`/`DEFAULT_MATH_TABLE` so they cannot drift), navy tutor band, closing CTA cut from three buttons to one, and six content pages: `/scoring`, `/sat-format`, `/for-tutors` plus real `/privacy`, `/terms` and `/contact` — the last was not in the five, but a privacy policy routing a deletion request at a placeholder answers nobody | |

## Phase 4 — Auth & onboarding · `prompts/B-foundations-landing-auth.md`

| ID | Task |
|---|---|
| T4.1 | Auth visual unification + mobile brand band |
| T4.2 | Form quality + error copy |
| T4.3 | `StudentProfile` + `/welcome` |

## Phase 5 — Dashboard & progress · `prompts/C-student.md`

| ID | Task |
|---|---|
| T5.1 | Dashboard restructure + next-action card |
| T5.2 | Test card rebuild |
| T5.3 | History table upgrade |
| T5.4 | Progress data layer (mind the N+1) |
| T5.5 | `/progress` — extend `score-trend.tsx` |

## Phase 6 — Results & review · `prompts/C-student.md`

| ID | Task |
|---|---|
| T6.1 | Results hero: deltas, gap to target, **remove `tierLabel()`** |
| T6.2 | Labelled section score for `INCOMPLETE` attempts (product decision) |
| T6.3 | "What to work on next" |
| T6.4 | `QuestionMap` |
| T6.5 | Review filters + URL state |
| T6.6 | Review sidebar + annotations surfaced |
| T6.7 | PDF export |
| T6.8 | Share link (own task — needs a token table + middleware path) |

## Phase 7 — Test interface · `prompts/C-student.md`

| ID | Task |
|---|---|
| T7.1 | **Playwright — gates the whole phase** |
| T7.2 | Refactor + zustand store |
| T7.3 | Accessibility parity |
| T7.4 | Tablet & mobile |
| T7.5 | Practice-mode modifiers (needs a migration) |
| T7.6 | Navigator states, save retry, report-a-question, telemetry disclosure |

## Phase 8 — Drill mode · `prompts/D-features-admin.md`

| ID | Task |
|---|---|
| T8.1 | Schema (requires T2.2) |
| T8.2 | `/drill` builder — **not `/practice`** |
| T8.3 | `/drill/[sessionId]` runner |
| T8.4 | Summary + mastery |
| T8.5 | Spaced repetition |

## Phase 9 — Goals & notifications · `prompts/D-features-admin.md`

| ID | Task |
|---|---|
| T9.1 | Goals, countdown, weekly ring |
| T9.2 | Email templates + preference centre |
| T9.3 | Notification centre |

## Phase 10 — Admin v2 · `prompts/D-features-admin.md`

| ID | Task |
|---|---|
| T10.1 | `/admin/analytics` index — T2.3 shipped the funnel + device breakdown; this is the full page |
| T10.2 | Discrimination index + Needs-attention tab |
| T10.3 | Bank workflow: bulk, preview, draft/published, versions |
| T10.4 | Groups, roster, student progress table |
| T10.5 | Import dry-run + attempt comparison |
| T10.6 | Admin mobile + breadcrumbs |

## Phase 11 — Hardening · `prompts/D-features-admin.md`

| ID | Task |
|---|---|
| T11.1 | Responsive audit |
| T11.2 | Remaining performance |
| T11.3 | WCAG 2.2 AA pass |
| T11.4 | Localisation (optional) |

---

## Fastest valuable path

`T0.1` → `T0.2` → `T0.6` → `T1.1` → `T1.3` → `T1.4` → `T2.1` → `T3.2` → `T3.4` → `T5.1` → `T5.4` → `T5.5`

Fixes what's broken, builds the primitives that matter, removes 200 kB from a student route, makes
the landing page honest, and gives students a progress view.
