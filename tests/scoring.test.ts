import { describe, it, expect } from "vitest";
import {
  scaleScore,
  computeRawScores,
  computeScaledScores,
  computeDomainBreakdown,
  DEFAULT_RW_TABLE,
  DEFAULT_MATH_TABLE,
  SCALED_MIN,
  SCALED_MAX,
} from "@/lib/scoring";

describe("scaleScore", () => {
  it("returns 200 for 0/max with default linear mapping", () => {
    expect(scaleScore(0, 54)).toBe(200);
  });

  it("returns 800 for max/max with default linear mapping", () => {
    expect(scaleScore(54, 54)).toBe(800);
  });

  it("linearly interpolates for partial scores", () => {
    // 27 / 54 = 0.5 → 200 + 0.5*600 = 500
    expect(scaleScore(27, 54)).toBe(500);
  });

  it("clamps negative or overflow raw scores", () => {
    expect(scaleScore(-5, 54)).toBe(200);
    expect(scaleScore(999, 54)).toBe(800);
  });

  it("falls back to 200 when max is 0", () => {
    expect(scaleScore(0, 0)).toBe(200);
  });

  it("reads from a lookup table when provided", () => {
    const table = [200, 230, 260, 320, 410, 540, 800];
    expect(scaleScore(0, 6, table)).toBe(200);
    expect(scaleScore(3, 6, table)).toBe(320);
    expect(scaleScore(6, 6, table)).toBe(800);
  });

  it("clamps to table bounds when raw is out of range", () => {
    const table = [200, 400, 800];
    expect(scaleScore(-1, 2, table)).toBe(200);
    expect(scaleScore(5, 2, table)).toBe(800);
  });

  it("always returns a value within 200–800", () => {
    expect(scaleScore(10, 27)).toBeGreaterThanOrEqual(SCALED_MIN);
    expect(scaleScore(27, 27)).toBeLessThanOrEqual(SCALED_MAX);
  });
});

describe("computeRawScores", () => {
  it("sums correct and total per section across modules", () => {
    const raw = computeRawScores([
      { sectionType: "READING_WRITING", correctCount: 20, totalCount: 27 },
      { sectionType: "READING_WRITING", correctCount: 18, totalCount: 27 },
      { sectionType: "MATH", correctCount: 15, totalCount: 22 },
      { sectionType: "MATH", correctCount: 12, totalCount: 22 },
    ]);
    expect(raw).toEqual({
      readingWriting: { correct: 38, total: 54 },
      math: { correct: 27, total: 44 },
    });
  });

  it("returns zeros when there are no results", () => {
    expect(computeRawScores([])).toEqual({
      readingWriting: { correct: 0, total: 0 },
      math: { correct: 0, total: 0 },
    });
  });
});

describe("computeScaledScores", () => {
  it("uses the real SAT default tables (proportional index lookup)", () => {
    // 27/54 R&W → proportionalIdx=27 → DEFAULT_RW_TABLE[27] = 570
    // 22/44 Math → proportionalIdx=22 → DEFAULT_MATH_TABLE[22] = 600
    const scaled = computeScaledScores({
      readingWriting: { correct: 27, total: 54 },
      math: { correct: 22, total: 44 },
    });
    expect(scaled.readingWriting).toBe(DEFAULT_RW_TABLE[27]);
    expect(scaled.math).toBe(DEFAULT_MATH_TABLE[22]);
    expect(scaled.total).toBe(DEFAULT_RW_TABLE[27] + DEFAULT_MATH_TABLE[22]);
  });

  it("proportionally maps a smaller test against the default tables", () => {
    // 10-question R&W: 5 correct → proportionalIdx = round(5/10 * 54) = 27 → 570
    // 10-question Math: 5 correct → proportionalIdx = round(5/10 * 44) = 22 → 600
    const scaled = computeScaledScores({
      readingWriting: { correct: 5, total: 10 },
      math: { correct: 5, total: 10 },
    });
    expect(scaled.readingWriting).toBe(DEFAULT_RW_TABLE[27]);
    expect(scaled.math).toBe(DEFAULT_MATH_TABLE[22]);
  });

  it("uses per-section tables when provided", () => {
    const scaled = computeScaledScores(
      { readingWriting: { correct: 2, total: 4 }, math: { correct: 4, total: 4 } },
      {
        readingWriting: [200, 300, 500, 700, 800],
        math: [200, 250, 500, 750, 800],
      },
    );
    expect(scaled.readingWriting).toBe(500);
    expect(scaled.math).toBe(800);
    expect(scaled.total).toBe(1300);
  });

  it("ranges 400–1600 across the extremes", () => {
    const zero = computeScaledScores({
      readingWriting: { correct: 0, total: 54 },
      math: { correct: 0, total: 44 },
    });
    const perfect = computeScaledScores({
      readingWriting: { correct: 54, total: 54 },
      math: { correct: 44, total: 44 },
    });
    expect(zero.total).toBe(400);
    expect(perfect.total).toBe(1600);
  });
});

describe("computeDomainBreakdown", () => {
  it("buckets by section and domain", () => {
    const b = computeDomainBreakdown([
      { sectionType: "READING_WRITING", domain: "Information and Ideas", isCorrect: true },
      { sectionType: "READING_WRITING", domain: "Information and Ideas", isCorrect: false },
      { sectionType: "READING_WRITING", domain: "Craft and Structure", isCorrect: true },
      { sectionType: "MATH", domain: "Algebra", isCorrect: true },
      { sectionType: "MATH", domain: "Algebra", isCorrect: true },
      { sectionType: "MATH", domain: "Advanced Math", isCorrect: false },
    ]);
    expect(b.readingWriting).toEqual([
      { domain: "Craft and Structure", correct: 1, total: 1 },
      { domain: "Information and Ideas", correct: 1, total: 2 },
    ]);
    expect(b.math).toEqual([
      { domain: "Advanced Math", correct: 0, total: 1 },
      { domain: "Algebra", correct: 2, total: 2 },
    ]);
  });

  it("returns empty arrays when there are no items", () => {
    expect(computeDomainBreakdown([])).toEqual({ readingWriting: [], math: [] });
  });
});
