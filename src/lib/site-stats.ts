/**
 * The landing page's figure strip, as data (T3.2).
 *
 * Before this the four tiles were hardcoded — `236+ Practice Questions` against
 * a bank of 280, and `4 Full-Length Tests` counting seeded rows. Both were
 * copy-rule violations ("never state a number the product cannot back"), and
 * one of them was wrong in the direction that matters: it undersold the bank
 * while looking precise enough to be trusted.
 *
 * This module is pure — no Prisma, no React — so the rounding rule and the
 * hide-a-weak-tile rule are pinned by `tests/site-stats.test.ts` rather than by
 * looking at the page. `stats-banner.tsx` supplies the counts.
 */

/**
 * Steps a figure may be rounded down to. Round numbers a reader recognises as
 * approximate; nothing like 260 or 275, which read as exact.
 */
const ROUND_STEPS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000] as const;

/**
 * How many discrete steps the displayed figure must be worth. The step is at
 * most `value / 5`, so what rounding discards is under a fifth of the truth and
 * the number on screen is always more than 80% of it. Raise this and the tiles
 * get more precise and go stale faster; lower it and `280` becomes `200+`.
 */
const MIN_RESOLUTION_STEPS = 5;

/**
 * Below this, "tests completed by students" is a number that argues against the
 * product. The tile is removed rather than dressed up — the prompt's rule, and
 * the honest one: there is no wording that makes a small number impressive.
 */
export const MIN_COMPLETED_ATTEMPTS = 50;

/**
 * Grouping is pinned to `en-GB` for the same reason `format-date.ts` pins it:
 * with no locale argument `toLocaleString` reads the *runtime's* default, this
 * Node process resolves to `az`, and a server-rendered `1 200` against a
 * browser-rendered `1,200` is a hydration error.
 */
const groupDigits = new Intl.NumberFormat("en-GB");

export interface RoundedStat {
  /** The rounded figure. Never greater than the input. */
  value: number;
  /** True when rounding discarded something — that is what earns the `+`. */
  approximate: boolean;
  /** What goes on screen: `250+`, or `5` when the count is already round. */
  display: string;
}

/**
 * Rounds a count **down** to a round number, never up.
 *
 * A figure that is already at a step keeps its exact value and takes no `+`:
 * five public tests is `5`, not `5+`, because inventing imprecision is its own
 * kind of dishonesty. 280 questions becomes `250+`.
 */
export function roundDownStat(input: number): RoundedStat {
  const value = Number.isFinite(input) ? Math.max(0, Math.floor(input)) : 0;

  const step =
    ROUND_STEPS.filter((candidate) => candidate <= value / MIN_RESOLUTION_STEPS).pop() ?? 1;
  const rounded = Math.floor(value / step) * step;
  const approximate = rounded < value;

  return {
    value: rounded,
    approximate,
    display: `${groupDigits.format(rounded)}${approximate ? "+" : ""}`,
  };
}

/** Which icon the banner draws. The tile data stays free of React. */
export type SiteStatKey = "questions" | "tests" | "completed" | "free";

export interface SiteStatTile {
  key: SiteStatKey;
  /** Already rounded and formatted. */
  value: string;
  label: string;
  /** Numeric tiles take `.tabular`; the "Free" tile is a word, not a figure. */
  numeric: boolean;
}

export interface SiteStatCounts {
  /** Every question in the bank. */
  questions: number;
  /** Public tests a logged-out visitor can actually start — see the banner. */
  publicTests: number;
  /** Attempts in `COMPLETED`. */
  completedAttempts: number;
}

/**
 * Assembles the strip. Every tile traces to a count except `free`, which states
 * a fact about the product rather than a figure: there is no billing code, no
 * payment provider and no plan model anywhere in the app.
 *
 * A count of zero removes its tile. "0 practice tests" is true, and it is also
 * the sentence a visitor stops reading at.
 */
export function buildSiteStatTiles(counts: SiteStatCounts): SiteStatTile[] {
  const tiles: SiteStatTile[] = [];

  const questions = roundDownStat(counts.questions);
  if (questions.value > 0) {
    tiles.push({
      key: "questions",
      value: questions.display,
      label: "Practice questions",
      numeric: true,
    });
  }

  const tests = roundDownStat(counts.publicTests);
  if (tests.value > 0) {
    tiles.push({
      key: "tests",
      value: tests.display,
      label: tests.value === 1 ? "Free practice test" : "Free practice tests",
      numeric: true,
    });
  }

  const completed = roundDownStat(counts.completedAttempts);
  if (counts.completedAttempts >= MIN_COMPLETED_ATTEMPTS && completed.value > 0) {
    tiles.push({
      key: "completed",
      value: completed.display,
      label: "Tests completed",
      numeric: true,
    });
  }

  tiles.push({
    key: "free",
    value: "Free",
    label: "No card required",
    numeric: false,
  });

  return tiles;
}
