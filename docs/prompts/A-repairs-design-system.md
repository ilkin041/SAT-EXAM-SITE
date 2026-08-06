# Prompts A — Repairs & design system (Phases 0–1)

Read `docs/recon.md` §0 before any task. Paths are `src/app/`, package manager is npm.

---

## T0.1 — Restore focus indicators and add reduced motion

> `globals.css:148` sets `:focus-visible { outline: none }` globally with no replacement. `Button`
> re-adds its own ring, so **every raw `<button>`, `<a>`, `<select>` and `<input>` outside a
> primitive has no visible keyboard focus indicator today.** That is a live WCAG 2.4.7 failure
> app-wide. Separately, `float`, `pulse-glow`, `gradient-shift` and `shimmer` are infinite loops
> running for everyone.
>
> **Do:**
> 1. Remove the blanket `outline: none` at `globals.css:148`. Add a base-layer `:focus-visible` ring
>    using existing tokens, with `ring-offset-2 ring-offset-background` so it stays visible on filled
>    and gradient surfaces.
> 2. Verify a visible ring at ≥3:1 contrast on: links, inputs, native selects, table sort headers,
>    dialog close buttons, nav items, the dashboard test cards, and the test interface's icon
>    buttons, answer choices and eliminator toggles.
> 3. Add the global reduced-motion block:
>    ```css
>    @media (prefers-reduced-motion: reduce) {
>      *, *::before, *::after {
>        animation-duration: .01ms !important;
>        animation-iteration-count: 1 !important;
>        transition-duration: .01ms !important;
>        scroll-behavior: auto !important;
>      }
>    }
>    ```
> 4. Confirm the four infinite animations stop under reduced motion, including
>    `animated-gradient-bg` on `/` and `timer-critical-pulse` in the test interface. **The timer
>    critical state must remain perceivable without animation** — if the pulse is the only signal,
>    add a static one.
> 5. Report every element fixed and any you could not.
>
> **Out of scope:** the type scale, `--ink`/`--paper`, `.tabular` — those are T1.1.
>
> **Acceptance:** no interactive element anywhere lacks a visible focus ring · nothing animates
> perceptibly under reduced motion · timer-critical is still obvious without motion.

---

## T0.2 — Repair dead Tailwind classes and config gaps

> These classes compile, produce no CSS, and make the UI subtly wrong for a reason nobody can find.
>
> **Do:**
> 1. `py-4.5` — `src/app/dashboard/page.tsx:248,249,269,278,285`. **Every history-table cell has zero
>    vertical padding.** Tailwind 3 has no `4.5` spacing step. Either add it to the scale or use
>    `py-4`/`py-5`; say which and why.
> 2. `text-emerald-350`, `text-blue-350` — `src/app/results/[attemptId]/page.tsx:324,325`. No `350`
>    shade exists, so **dark-mode performance-tier pills have no text colour** and inherit. Likely a
>    contrast failure. Fix with a real shade and check contrast in dark mode.
> 3. `shadow-xs` × 13 — Tailwind 3 has no `xs` shadow (that's v4). Either define it in
>    `tailwind.config.ts:62-78` or replace all 13 with `shadow-sm`.
> 4. `h-4.5 w-4.5` × 3 — `page.tsx:372`, `results/page.tsx:305`, `student-nav.tsx:24`. Icons render at
>    intrinsic size.
> 5. **Add `fontFamily.mono` to `tailwind.config.ts`.** There is none, so all 24 existing `font-mono`
>    usages fall back to browser default. Point it at a system mono stack for now; T1.1 swaps in the
>    real face.
> 6. **Map `--accent-pop` and `--accent-warm` into `tailwind.config.ts`.** They're defined in CSS but
>    unmapped, so `text-accent-warm` / `bg-accent-pop` don't exist.
> 7. Grep for any other class that doesn't resolve against the config and report what you find.
>
> **Acceptance:** every listed class produces CSS or is replaced · dashboard history rows have real
> vertical padding · dark-mode tier pills have readable text · `font-mono` renders mono.

---

## T0.3 — Theme flash and tri-state toggle

> `dark-mode-toggle.tsx` (43 LOC) applies the theme class in a `useEffect` and there is no blocking
> script in `layout.tsx`, so **every page loads light and flips on hydration.**
>
> **Do:**
> 1. Add an inline blocking script in the document head that reads localStorage and
>    `prefers-color-scheme` and sets the class before first paint.
> 2. Replace the bare `☀/☾` button with a `ThemeToggle` on Radix DropdownMenu (already installed):
>    System / Light / Dark. lucide `Sun`/`Moon`/`Monitor`; trigger shows the resolved icon;
>    `aria-label` reflects state (`Theme: system (dark)`).
> 3. In `system` mode, follow OS changes live via a media-query listener, not just on load.
> 4. Apply in both `StudentNav` and `AdminNav`.
>
> **Acceptance:** no flash on hard reload in any mode · OS theme change updates live in system mode ·
> keyboard-operable and announced.

---

## T0.4 — Create ESLint config and guardrails

> **There is no ESLint config at all** — no `.eslintrc*`, no `eslintConfig` in `package.json`.
> `npm run lint` drops into Next's interactive setup and lints nothing. The definition of done in
> CLAUDE.md has been unenforceable.
>
> **Do:**
> 1. Create a config extending `next/core-web-vitals` plus TypeScript rules. Make `npm run lint` run
>    non-interactively.
> 2. Add rules that fail on:
>    - Raw hex / `rgb()` / `hsla()` in `.tsx` — **with an override exempting `src/app/test/attempt/**`**,
>      whose four hardcoded Bluebook colours are correct
>    - `style={{ }}` containing a colour property (the four auth pages and `stat-card.tsx:52` violate
>      this; leave the legitimately-dynamic width/position styles alone)
>    - Module-level string constants named `*_CLS` / `*_CLASSES`
>    - `"use client"` in any `page.tsx` or `layout.tsx`
>    - **The dead-class patterns from T0.2** — a rule catching Tailwind classes that don't resolve is
>      higher value here than the hex rule
> 3. Existing violations get inline disables **with a TODO naming the task that removes them** (T1.3
>    for selects, T4.1 for the auth lattice), so the ratchet is visible.
> 4. Add `npm run analyze` with `@next/bundle-analyzer`.
> 5. Report the violation count per rule — it only goes down from here.
>
> **Acceptance:** `npm run lint` runs non-interactively and passes · a deliberate raw hex in a page
> fails · the same hex in the test interface does not.

---

## T0.5 — Loading, error and not-found boundaries

> Zero exist. No `loading.tsx`, `error.tsx`, `not-found.tsx` or `global-error.tsx` anywhere.
>
> **Do:**
> 1. Build `src/components/ui/skeleton.tsx` — token-driven, static under reduced motion.
> 2. `loading.tsx` for: `/dashboard`, `/results/[attemptId]`, `/results/[attemptId]/review`,
>    `/test/[testId]/start`, `/admin`, `/admin/questions`, `/admin/attempts`, `/admin/users`,
>    `/admin/tests`, `/admin/groups`, `/admin/analytics/items`.
>    **Skeletons match the real layout's box model** — the dashboard one is a hero band + card
>    outlines + table rows, not generic grey bars.
> 3. `error.tsx` per major section + `app/global-error.tsx` + `not-found.tsx` for the app and
>    `/admin`. Copy per the rules — say what happened, offer recovery, no apology:
>    > **This page didn't load.** Something failed on our side. Try again — your attempt data is safe.
>    > `[Try again]` `[Back to dashboard]`
>
> **Out of scope:** `/test/attempt/[attemptId]` — it has its own state machine.
>
> **Acceptance:** no listed route blank for >200ms throttled · every `error.tsx` recovers (verify by
> throwing) · CLS < 0.05 on skeleton→content.

---

## T0.6 — Shared-chrome gradient fix

> **The single biggest gradient-budget win in the codebase.** 17 of 30 routes are over budget, and
> most of the excess comes from shared chrome, not pages. Fixing three components fixes 17 routes.
>
> **Do:**
> 1. **`AdminNav`** carries 3 gradients (header bar `from-brand-navy via-[#1e305e]`, logo mark
>    `from-indigo-500 to-violet-600`, `ADMIN` badge) onto **all 15 admin routes**. Reduce to 1: keep
>    the navy header bar, make the logo mark and badge solid. Also replace the raw hex at
>    `admin-nav.tsx:20` with a token.
> 2. **Logo mark** in `StudentNav` (`from-primary to-primary/80`) → solid `--primary`. Removes one
>    from every student route.
> 3. **`UserMenu` avatar** (`bg-gradient-primary`) → solid. Removes another.
> 4. **`PageHeader`** decorative accent rule → solid or removed. Affects 9 admin routes.
> 5. Re-count gradients per route and write `docs/gradient-audit.md` with before/after.
>
> **Out of scope:** page-level gradients (dashboard test cards, landing hero) — T1.8.
>
> **Acceptance:** all 15 admin routes drop from 3–6 to ≤2 · student routes drop by 2 · audit doc
> committed with before/after counts.

---

## T0.7 — Remaining quick wins

> The stray comma space and the `∞` glyph are already fixed. These are what's left.
>
> 1. Dashboard test cards: `test-card.tsx:149` full-width `bg-gradient-primary` "Start test" ×5 →
>    `variant="secondary"` until `soft` exists (T1.8). Five identical gradient bars dominate the page.
> 2. Dashboard test cards: clamp descriptions to 2 lines so heights match — only one test has a
>    description and the grid is ragged.
> 3. Dashboard history table: collapse `Abandoned` rows behind `Show N abandoned attempts`.
> 4. `/account`: the Save and Update password buttons read as broken. Either keep enabled and validate
>    on submit, or add helper text explaining the disabled state.
> 5. Landing: remove the 15s `animated-gradient-bg` (`page.tsx:57`) and the two blurred orbs; replace
>    with a single static radial bloom.
> 6. Landing: raise marketing body copy to `1.0625rem` at `max-w-[52ch]`.
> 7. Landing header: solid background + border once scrolled past 40px — glass over a busy hero fails
>    contrast.
> 8. Footer: add Privacy, Terms, Contact links (stubs fine; real pages in T3.8).
> 9. Add `aria-label` to every icon-only button still lacking one.
> 10. Add a native `title` on the `LINEAR`/`ADAPTIVE` badge explaining the difference — no user knows
>     what `LINEAR` means. Replaced by a real `Tooltip` in T1.5.
> 11. Extract the four auth pages' copy-pasted `rgba(255,255,255,0.8)` dot lattice into one component.
> 12. `stat-card.tsx:52`: replace `hsla(228,60%,50%,0.03)` with a token.
> 13. Add `metadata` to `/` and `/admin/groups/[id]` — the only two of 27 pages missing it, so the
>     landing page currently inherits a generic root title.

---

## T1.1 — Tokens, type scale, mono

> **Do:**
> 1. Add IBM Plex Mono via `next/font/google` as `--font-mono` (400/500/600, latin subset). Wire into
>    `tailwind.config.ts` replacing the system stack from T0.2.
> 2. Add to `globals.css` (both themes): `--ink: 222 47% 11%`, `--paper: 228 33% 98%`,
>    `--paper-sunk: 228 20% 95%`.
> 3. Add the eight type-scale tokens from CLAUDE.md as CSS custom properties plus matching Tailwind
>    utilities, each carrying weight, tracking and line-height.
> 4. Add `.tabular` (`font-mono tabular-nums tracking-tight`) and `.eyebrow`.
> 5. **32 files hand-roll `tabular-nums` and 24 hand-roll `font-mono`** — migrate all of them to the
>    utilities.
> 6. Migrate headings and body copy off ad-hoc `text-3xl`/`text-sm` onto the scale.
> 7. Add the gradient-budget comment block to the top of `globals.css`.
>
> **Acceptance:** no raw text-size class outside the scale in page files · `.tabular` on every numeric
> display · font payload up by ≤30 kB after subsetting · both themes correct.

---

## T1.2 — `/ui` component gallery

> **Do:** build a dev-only gallery. Note two constraints recon found: there are **no route groups**,
> so put it at `src/app/ui/page.tsx`; and **`middleware.ts:17` will redirect `/ui` to `/login`** —
> add a whitelist entry.
>
> - `notFound()` when `NODE_ENV === "production"`
> - Every primitive × every variant × size × disabled / loading / error / focus-visible
> - Light and dark side by side
> - Viewport simulator (360 / 768 / 1280 iframes) for layout primitives
> - Anchor-linked sections with a sticky index; one `<GallerySection>` per primitive in
>   `src/app/ui/sections/` so Phase 1 can add to it easily
> - Seed it with the six existing primitives: `Button`, `Badge`, `Input`, `EmptyState`, `PageHeader`,
>   `StatCard`
>
> **Acceptance:** 404 in production build · reachable in dev without auth · zero console/hydration
> errors in both themes.

---

## T1.3 — `Select` and `SELECT_CLS` retirement

> **Install `@radix-ui/react-select` — it is not currently a dependency.**
>
> **Do:**
> 1. Build `src/components/ui/select.tsx`: trigger, content, item, group, label, separator. CVA
>    variants: sizes sm/default, states default/error/disabled, leading icon, placeholder, clearable.
>    Match `Input`'s radius, border, focus ring and height exactly.
> 2. Delete all three `SELECT_CLS` declarations and replace all 7 usages:
>    - `src/app/admin/questions/page.tsx:25` → used at 108, 113, 118, 125
>    - `src/app/admin/attempts/page.tsx:111` → used at 144, 151
>    - `src/app/admin/users/page.tsx:12` → used at 66
>    Search for any native `<select>` beyond these.
> 3. Remove the T0.4 lint disables for selects.
> 4. Add to `/ui`.
>
> **Acceptance:** zero `_CLS` constants · zero native `<select>` · keyboard complete (Enter/Space,
> type-ahead, arrows, Esc, focus returns) · correct inside admin navy chrome and in dark mode.

---

## T1.4 — `Table` and `DataTable`

> There are **13 hand-rolled tables**, each repeating its own thead/zebra/padding recipe. Two are on
> student surfaces (`dashboard/page.tsx:218`, `results/[attemptId]/page.tsx:400`).
>
> **Do:**
> 1. `src/components/ui/table.tsx`: `Table`, `THead`, `TBody`, `TR`, `TH`, `TD`, `TableCaption`,
>    `TableEmpty`, `TableSkeleton`. Sticky header, hover row, `divide-y`, uppercase muted head,
>    `.tabular` on cells marked numeric.
> 2. `src/components/ui/data-table.tsx` composing search, filter slot, sortable columns, pagination
>    footer, result count, empty and loading states:
>    ```ts
>    type Column<T> = {
>      key: string; header: string; numeric?: boolean; sortable?: boolean
>      width?: string; hideBelow?: "sm" | "md" | "lg"; cell: (row: T) => ReactNode
>    }
>    ```
> 3. Support **both** server-side pagination (the `/admin/questions` 100/page pattern) and
>    client-side, chosen by prop.
> 4. Filter/sort/page state syncs to the URL.
> 5. Add to `/ui` with a 3-column and a 9-column example.
>
> **Out of scope:** migrating the 13 tables — T1.9.
>
> **Acceptance:** sticky header works inside the admin layout's scroll container · all states render ·
> sortable headers are focusable buttons · `hideBelow` drops columns cleanly.

---

## T1.5 — `Modal`, `Tabs`, `Tooltip`, `Alert`, `SegmentedControl`, `Sheet`

> **Install `@radix-ui/react-tabs` and `@radix-ui/react-tooltip`** — not currently dependencies.
> Dialog is already installed.
>
> - **`Modal`** — Radix Dialog wrapper: sizes sm/default/lg/full, header/scroll-body/footer,
>   `destructive` variant. **Migrate the three hand-rolled dialogs:** `delete-question-modal.tsx`
>   (181 LOC), `admin-reset-password-modal.tsx` (183 LOC), and the one embedded in `test-card.tsx`.
> - **`Tabs`** — `underline` and `pill` variants; the pill variant should match the existing AdminNav
>   treatment so it can be reused there later.
> - **`Tooltip`** — sensible delay, **tap-to-toggle fallback on touch**, and a working
>   disabled-element pattern (wrap in a focusable span).
> - **`Alert`** — info/success/warning/destructive, icon + title + body + action slot.
> - **`SegmentedControl`** — 2–4 options, `role="radiogroup"`, arrow keys, indicator respects reduced
>   motion.
> - **`Sheet`** — Radix Dialog as a drawer, `side` bottom/right, drag-to-dismiss on touch, focus trap,
>   iOS safe-area padding.
>
> **Acceptance:** all keyboard-complete with focus trapped and restored · `Tooltip` usable on touch ·
> `Sheet` doesn't scroll the body behind it · all six in `/ui`.

---

## T1.6 — `Pagination`, `Avatar`, `Field`, `Separator`, `Accordion`

> **Install `@radix-ui/react-accordion`** — needed here and by T3.7.
>
> - **`Pagination`** — numbers with ellipsis, prev/next, page-size selector, result range
>   (`Showing 101–200 of 1,247` in `.tabular`), URL-synced.
> - **`Avatar`** — initials fallback, hue derived deterministically from user id. Replaces the
>   gradient avatar removed in T0.6.
> - **`Field`** — label + control + hint + error with correct `id`/`htmlFor`/`aria-describedby`/
>   `aria-invalid`. Refactor `account-forms.tsx` (277 LOC) and the four auth forms onto it.
> - **`Separator`** — horizontal/vertical, optional centred label.
> - **`Accordion`** — single and multiple modes.
>
> **Acceptance:** axe reports valid label association on `/account` and `/login` · avatar hue stable
> across sessions · all in `/ui`.

---

## T1.7 — `Progress`, `ScoreDial`, `DomainBar`

> These carry the product's core visual language; they're reused across results, progress and admin.
>
> 1. **`Progress`** — `value`, `max`, `size`, semantic grading (emerald ≥75, blue ≥50, amber ≥25, red
>    below, matching the current results page). Plus `variant="scoreBand"` rendering the scale as a
>    ruler with ticks and an optional target marker.
> 2. **`ScoreDial`** — extract the inline SVG gauge from `results/[attemptId]/page.tsx`. Props:
>    `value`, `max`, `size`, `label`, `sublabel`, `delta`. **Fix `scorePct` while extracting:** it
>    maps 400–1600 onto the ring, so a 400 renders as an empty circle. Animate `stroke-dashoffset`,
>    disabled under reduced motion. `role="img"` with a descriptive label.
> 3. **`DomainBar`** — label, `correct/total`, percent, graded bar, optional `Tooltip` slot.
>    `computeDomainBreakdown` (`scoring.ts:305`) already returns the right shape.
>
> **Acceptance:** results page renders identically after refactor except the fixed gauge floor ·
> `ScoreDial` announces its value · `scoreBand` handles 200–1600 and 200–800.

---

## T1.8 — Button variants and page-level gradient sweep

> T0.6 fixed shared chrome. This fixes the pages.
>
> **Do:**
> 1. Add `Button` `variant="soft"` (tinted surface, subtle border, no gradient) and `size="xs"`.
> 2. Sweep the remaining over-budget routes:
>    - **`/dashboard` (6 above fold):** `bg-gradient-hero` banner at `:91`, name gradient text `:109`,
>      avg-score gradient text `:127`, best-score gradient text `:134`, plus `test-card.tsx:61` accent
>      strip and `:149` button × 5 tests. Keep **one**. Recommendation: keep the warm resume gradient
>      (`dashboard:294`), make everything else solid; test-card buttons → `soft`, keep the left-edge
>      accent strip (cheap and good).
>    - **`/` (4 above fold):** H1 `text-gradient-primary` at `:81` → solid ink; keep one accent CTA at
>      `:109`, make `:263` secondary; feature icon tiles ×3 and step badges ×3 → solid.
>    - **`/results/[attemptId]` (4 above fold):** keep the `ScoreDial` gradient; `bg-gradient-hero`
>      `:162`, section bars `:223`/`:230` and CTA `:302` → solid or graded fills.
>    - **Auth pages (2 each):** panel gradient → solid `--primary` so panel and `Sign in` button are
>      the same blue. (Coordinated with T4.1 — do the colour unification here, the layout there.)
> 3. Update `docs/gradient-audit.md`.
>
> **Acceptance:** **no route exceeds one gradient element above the fold at 1280px or 360px** ·
> repeated list actions use `soft` · audit updated.

---

## T1.9 — Migrate tables; resolve zustand

> **Do:**
> 1. Migrate all 13 hand-rolled tables to `DataTable`, preserving every current behaviour — server
>    pagination on questions, CSV export on attempts, all existing filters:
>    `admin/analytics/items:204` · `admin/attempts:177` · `admin/groups:54` · `admin/groups/[id]:134,198`
>    · `admin/import/import-form:446` · `admin/page:62` · `admin/questions/_components/questions-table:234`
>    · `admin/tests:57` · `admin/users:94` · `admin/users/[id]:114` · `dashboard/page:218`
>    · `results/[attemptId]/page:400`
> 2. Move filter controls into the `DataTable` filter slot using `Select`.
> 3. Sync filter/sort/search/page to the URL on all of them.
> 4. **Resolve zustand** (`^5.0.2`, zero imports). Either create `src/stores/use-ui-store.ts` for
>    theme/toast/sheet state, or remove the dependency. Do not leave it installed and unused.
>
> **Out of scope:** new admin features — Phase 10.
>
> **Acceptance:** zero hand-rolled tables · every admin list shareable by URL with filters intact ·
> CSV export byte-identical · `/admin/questions` bundle up by ≤8 kB gzipped.
