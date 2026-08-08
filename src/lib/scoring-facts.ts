/**
 * The scoring copy's numbers, derived from `src/lib/scoring.ts` (T3.8).
 *
 * **Nothing here is typed by hand.** The acceptance criterion for `/scoring` is
 * that it matches what `scoring.ts` actually does, and the way that breaks is
 * somebody changing a conversion table and leaving a page that quotes the old
 * one. So the page does not quote anything: it renders rows pulled out of
 * `DEFAULT_RW_TABLE` and `DEFAULT_MATH_TABLE` at build time, and its worked
 * example is computed by calling `scaleScore` itself. Edit a table and the page
 * changes with it; there is no second copy to forget.
 *
 * Same split as `site-stats.ts` against `stats-banner.tsx` and `faq.ts` against
 * `faq.tsx` — the rule lives in a pure module a test can read, the layout lives
 * in the component. `tests/scoring-facts.test.ts` pins the derivation.
 *
 * Pure: `scoring.ts` imports nothing, so this is safe on either side of the
 * server/client line.
 */

import {
  DEFAULT_MATH_TABLE,
  DEFAULT_RW_TABLE,
  FULL_LENGTH_MATH_QUESTIONS,
  FULL_LENGTH_RW_QUESTIONS,
  SCALED_MAX,
  SCALED_MIN,
  scaleScore,
} from "@/lib/scoring";

/** Highest raw score each table is indexed for — its length minus the zero row. */
export const RW_MAX_RAW = DEFAULT_RW_TABLE.length - 1;
export const MATH_MAX_RAW = DEFAULT_MATH_TABLE.length - 1;

/** Entry counts, as the tables' own lengths. 55 and 45 today. */
export const RW_TABLE_ENTRIES = DEFAULT_RW_TABLE.length;
export const MATH_TABLE_ENTRIES = DEFAULT_MATH_TABLE.length;

/** A total is the two section scores added together. */
export const TOTAL_MIN = SCALED_MIN * 2;
export const TOTAL_MAX = SCALED_MAX * 2;

export interface ConversionRow {
  raw: number;
  scaled: number;
}

/**
 * `count` evenly spaced rows out of a conversion table, always including raw 0
 * and the table's last entry. Evenly spaced rather than hand-picked so the
 * excerpt still spans the table after somebody changes its length — a fixed
 * list of raw scores would silently stop covering the top of a shorter one.
 */
export function sampleConversion(table: readonly number[], count: number): ConversionRow[] {
  const maxRaw = table.length - 1;
  if (maxRaw < 0 || count < 2) return [];

  const rows: ConversionRow[] = [];
  const steps = Math.min(count, table.length) - 1;
  let previousRaw = -1;

  for (let step = 0; step <= steps; step += 1) {
    const raw = Math.round((step / steps) * maxRaw);
    if (raw === previousRaw) continue;
    previousRaw = raw;
    rows.push({ raw, scaled: table[raw] });
  }

  return rows;
}

const SAMPLE_ROWS = 8;

export const RW_CONVERSION_SAMPLE = sampleConversion(DEFAULT_RW_TABLE, SAMPLE_ROWS);
export const MATH_CONVERSION_SAMPLE = sampleConversion(DEFAULT_MATH_TABLE, SAMPLE_ROWS);

export interface ShortTestExample {
  /** Questions answered correctly. */
  correct: number;
  /** Questions the section actually held. */
  total: number;
  /** The row of the R&W table the proportional map lands on. */
  tableIndex: number;
  /** What `scaleScore` returns for it. */
  scaled: number;
}

/**
 * The worked example on `/scoring`: a ten-question Reading and Writing section
 * with five correct. Both numbers below come out of the same call the results
 * page makes, so the page cannot show an arithmetic the app does not perform.
 */
const EXAMPLE_CORRECT = 5;
const EXAMPLE_TOTAL = 10;

export const SHORT_TEST_EXAMPLE: ShortTestExample = {
  correct: EXAMPLE_CORRECT,
  total: EXAMPLE_TOTAL,
  tableIndex: Math.round((EXAMPLE_CORRECT / EXAMPLE_TOTAL) * RW_MAX_RAW),
  scaled: scaleScore(EXAMPLE_CORRECT, EXAMPLE_TOTAL, DEFAULT_RW_TABLE),
};

/**
 * The three fidelity states, in the words the score report uses. `ScoreFidelity`
 * is the enum; this is what each value means to a reader, kept next to the
 * derivation so the page describes the branch the code actually takes.
 */
export interface FidelityFact {
  /** Matches a `ScoreFidelity` member. */
  id: "FULL_LENGTH" | "ESTIMATE" | "INCOMPLETE";
  label: string;
  condition: string;
  shown: string;
}

export const FIDELITY_FACTS: readonly FidelityFact[] = [
  {
    id: "FULL_LENGTH",
    label: "Full length",
    condition: `Exactly ${FULL_LENGTH_RW_QUESTIONS} Reading and Writing questions and exactly ${FULL_LENGTH_MATH_QUESTIONS} Math questions.`,
    shown: `Both section scores and a total out of ${TOTAL_MAX}, straight off the tables.`,
  },
  {
    id: "ESTIMATE",
    label: "Short-test estimate",
    condition:
      "Both sections have at least one scored question, but the counts are anything other than full length.",
    shown:
      "The same section scores and total, labelled as an estimate — a shorter test has fewer score points, so each question moves the number further.",
  },
  {
    id: "INCOMPLETE",
    label: "Incomplete",
    condition: "One of the two sections has no scored questions at all.",
    shown:
      "No section scores, no total, no score dial. The report says so in as many words, and the raw module counts stay available to whoever set the test.",
  },
];
