import { describe, expect, it } from "vitest";
import {
  DEFAULT_MATH_TABLE,
  DEFAULT_RW_TABLE,
  EASY_ROUTE_CAP,
  FULL_LENGTH_MATH_QUESTIONS,
  FULL_LENGTH_RW_QUESTIONS,
  SCALED_MAX,
  SCALED_MIN,
  computeScaledScores,
  getScoreFidelity,
  scaleScore,
} from "@/lib/scoring";
import {
  FIDELITY_FACTS,
  MATH_CONVERSION_SAMPLE,
  MATH_MAX_RAW,
  MATH_TABLE_ENTRIES,
  RW_CONVERSION_SAMPLE,
  RW_MAX_RAW,
  RW_TABLE_ENTRIES,
  SHORT_TEST_EXAMPLE,
  TOTAL_MAX,
  TOTAL_MIN,
  sampleConversion,
} from "@/lib/scoring-facts";

/**
 * T3.8. `/scoring` has one acceptance criterion — it matches what
 * `src/lib/scoring.ts` actually does — and the way a page like that goes wrong
 * is silently: a conversion table is edited, the page keeps rendering the old
 * numbers, and nothing fails. `scoring-facts.ts` exists so that cannot happen,
 * because the page reads the tables rather than quoting them. These tests pin
 * the reading.
 */

describe("sampleConversion", () => {
  it("always includes raw 0 and the table's last row", () => {
    for (const table of [DEFAULT_RW_TABLE, DEFAULT_MATH_TABLE]) {
      const rows = sampleConversion(table, 8);
      expect(rows[0].raw).toBe(0);
      expect(rows[rows.length - 1].raw).toBe(table.length - 1);
    }
  });

  it("reads every scaled value out of the table itself", () => {
    for (const row of sampleConversion(DEFAULT_RW_TABLE, 8)) {
      expect(row.scaled).toBe(DEFAULT_RW_TABLE[row.raw]);
    }
    for (const row of sampleConversion(DEFAULT_MATH_TABLE, 8)) {
      expect(row.scaled).toBe(DEFAULT_MATH_TABLE[row.raw]);
    }
  });

  it("never repeats a raw score, even asking for more rows than the table has", () => {
    const rows = sampleConversion([200, 400, 800], 8);
    expect(rows.map((r) => r.raw)).toEqual([0, 1, 2]);
  });

  it("rises monotonically, because both tables do", () => {
    for (const table of [DEFAULT_RW_TABLE, DEFAULT_MATH_TABLE]) {
      const rows = sampleConversion(table, 8);
      for (let i = 1; i < rows.length; i += 1) {
        expect(rows[i].raw).toBeGreaterThan(rows[i - 1].raw);
        expect(rows[i].scaled).toBeGreaterThanOrEqual(rows[i - 1].scaled);
      }
    }
  });

  it("returns nothing it cannot sample", () => {
    expect(sampleConversion([], 8)).toEqual([]);
    expect(sampleConversion(DEFAULT_RW_TABLE, 1)).toEqual([]);
  });
});

describe("the figures the page prints", () => {
  it("derives the table sizes from the tables", () => {
    expect(RW_TABLE_ENTRIES).toBe(DEFAULT_RW_TABLE.length);
    expect(MATH_TABLE_ENTRIES).toBe(DEFAULT_MATH_TABLE.length);
    expect(RW_MAX_RAW).toBe(DEFAULT_RW_TABLE.length - 1);
    expect(MATH_MAX_RAW).toBe(DEFAULT_MATH_TABLE.length - 1);
  });

  it("covers the full-length raw range of each section", () => {
    // If a table ever stopped indexing a full-length raw score, the page would
    // be describing a lookup the results page could not perform.
    expect(RW_MAX_RAW).toBe(FULL_LENGTH_RW_QUESTIONS);
    expect(MATH_MAX_RAW).toBe(FULL_LENGTH_MATH_QUESTIONS);
  });

  it("derives the total range from the section range", () => {
    expect(TOTAL_MIN).toBe(SCALED_MIN * 2);
    expect(TOTAL_MAX).toBe(SCALED_MAX * 2);
    expect(computeScaledScores({
      readingWriting: { correct: FULL_LENGTH_RW_QUESTIONS, total: FULL_LENGTH_RW_QUESTIONS },
      math: { correct: FULL_LENGTH_MATH_QUESTIONS, total: FULL_LENGTH_MATH_QUESTIONS },
    }).total).toBe(TOTAL_MAX);
  });

  it("computes the worked example with the same call the report makes", () => {
    expect(SHORT_TEST_EXAMPLE.scaled).toBe(
      scaleScore(SHORT_TEST_EXAMPLE.correct, SHORT_TEST_EXAMPLE.total, DEFAULT_RW_TABLE),
    );
    // And the index it shows is the row that value came from.
    expect(DEFAULT_RW_TABLE[SHORT_TEST_EXAMPLE.tableIndex]).toBe(SHORT_TEST_EXAMPLE.scaled);
  });

  it("keeps the sampled excerpts pointing at their own table", () => {
    expect(RW_CONVERSION_SAMPLE).toEqual(sampleConversion(DEFAULT_RW_TABLE, 8));
    expect(MATH_CONVERSION_SAMPLE).toEqual(sampleConversion(DEFAULT_MATH_TABLE, 8));
  });
});

describe("the three fidelity states", () => {
  it("names every ScoreFidelity value exactly once", () => {
    expect(FIDELITY_FACTS.map((f) => f.id).sort()).toEqual([
      "ESTIMATE",
      "FULL_LENGTH",
      "INCOMPLETE",
    ]);
  });

  it("describes the branch `getScoreFidelity` actually takes", () => {
    expect(
      getScoreFidelity({
        readingWriting: { correct: 30, total: FULL_LENGTH_RW_QUESTIONS },
        math: { correct: 20, total: FULL_LENGTH_MATH_QUESTIONS },
      }),
    ).toBe("FULL_LENGTH");

    expect(
      getScoreFidelity({
        readingWriting: { correct: 5, total: 10 },
        math: { correct: 4, total: 8 },
      }),
    ).toBe("ESTIMATE");

    // The page says an incomplete attempt is one section having no scored
    // questions, and that it shows no total. Both halves are checked here.
    expect(
      getScoreFidelity({
        readingWriting: { correct: 5, total: 10 },
        math: { correct: 0, total: 0 },
      }),
    ).toBe("INCOMPLETE");
  });

  it("says nothing about a performance tier", () => {
    // `tierLabel()` on the results page is a copy-rule violation T6.1 removes.
    // Documenting it here would tie this page to something on its way out.
    for (const fact of FIDELITY_FACTS) {
      expect(`${fact.condition} ${fact.shown}`.toLowerCase()).not.toContain("tier");
    }
  });
});

describe("the cap the page quotes", () => {
  it("is applied after the lookup, not instead of it", () => {
    const raw = {
      readingWriting: { correct: FULL_LENGTH_RW_QUESTIONS, total: FULL_LENGTH_RW_QUESTIONS },
      math: { correct: FULL_LENGTH_MATH_QUESTIONS, total: FULL_LENGTH_MATH_QUESTIONS },
    };
    const capped = computeScaledScores(raw, { math: "EASY" });
    expect(capped.math).toBe(EASY_ROUTE_CAP);
    expect(capped.readingWriting).toBe(SCALED_MAX);

    // A section that would convert below the cap is untouched by it.
    const low = computeScaledScores(
      { ...raw, math: { correct: 0, total: FULL_LENGTH_MATH_QUESTIONS } },
      { math: "EASY" },
    );
    expect(low.math).toBe(SCALED_MIN);
  });
});
