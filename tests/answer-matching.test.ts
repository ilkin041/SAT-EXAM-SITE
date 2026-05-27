import { describe, it, expect } from "vitest";
import { normalizeSPR, sprMatches, isAnswerCorrect } from "@/lib/answer-matching";

describe("normalizeSPR", () => {
  it("strips whitespace", () => {
    expect(normalizeSPR("  1 / 2  ")).toBe("1/2");
    expect(normalizeSPR("\t-3\n")).toBe("-3");
  });

  it("strips trailing zeros after decimal", () => {
    expect(normalizeSPR("0.50")).toBe("0.5");
    expect(normalizeSPR("4.0")).toBe("4");
    expect(normalizeSPR("4.000")).toBe("4");
    expect(normalizeSPR("3.140")).toBe("3.14");
  });

  it("strips leading +", () => {
    expect(normalizeSPR("+4")).toBe("4");
  });

  it("keeps leading-zero-less decimals as written", () => {
    expect(normalizeSPR(".5")).toBe(".5");
    expect(normalizeSPR("0.5")).toBe("0.5");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeSPR("")).toBe("");
  });
});

describe("sprMatches", () => {
  it("matches across equivalent decimal forms", () => {
    expect(sprMatches("0.5", ["1/2", "0.5"])).toBe(true);
    expect(sprMatches("0.50", ["1/2", "0.5"])).toBe(true);
    expect(sprMatches(".5", ["1/2", ".5"])).toBe(true);
  });

  it("matches a fraction with whitespace", () => {
    expect(sprMatches(" 1 / 2 ", ["1/2"])).toBe(true);
  });

  it("matches integer with explicit decimal", () => {
    expect(sprMatches("4.0", ["4"])).toBe(true);
    expect(sprMatches("4", ["4.0"])).toBe(true);
  });

  it("rejects mismatched forms", () => {
    expect(sprMatches("0.6", ["1/2", "0.5"])).toBe(false);
    expect(sprMatches("1/3", ["1/2"])).toBe(false);
  });

  it("rejects empty response", () => {
    expect(sprMatches("", ["4"])).toBe(false);
  });

  it("handles negative numbers", () => {
    expect(sprMatches("-3", ["-3", "-3.0"])).toBe(true);
    expect(sprMatches(" -3.00 ", ["-3"])).toBe(true);
  });
});

describe("isAnswerCorrect", () => {
  it("compares MC by literal letter", () => {
    const q = { type: "MULTIPLE_CHOICE" as const, correctAnswer: "B", acceptedAnswers: null };
    expect(isAnswerCorrect(q, "B")).toBe(true);
    expect(isAnswerCorrect(q, "A")).toBe(false);
    expect(isAnswerCorrect(q, "")).toBe(false);
    expect(isAnswerCorrect(q, "b")).toBe(false); // case-sensitive — labels are uppercase
  });

  it("compares SPR via normalized accepted forms", () => {
    const q = {
      type: "STUDENT_PRODUCED_RESPONSE" as const,
      correctAnswer: "0.5",
      acceptedAnswers: ["0.5", "1/2", ".5"],
    };
    expect(isAnswerCorrect(q, "0.5")).toBe(true);
    expect(isAnswerCorrect(q, "0.50")).toBe(true);
    expect(isAnswerCorrect(q, "1/2")).toBe(true);
    expect(isAnswerCorrect(q, " 1 / 2 ")).toBe(true);
    expect(isAnswerCorrect(q, "0.6")).toBe(false);
  });

  it("falls back to correctAnswer when acceptedAnswers is missing", () => {
    const q = {
      type: "STUDENT_PRODUCED_RESPONSE" as const,
      correctAnswer: "4",
      acceptedAnswers: null,
    };
    expect(isAnswerCorrect(q, "4")).toBe(true);
    expect(isAnswerCorrect(q, "4.0")).toBe(true);
    expect(isAnswerCorrect(q, "5")).toBe(false);
  });

  it("returns false for empty responses", () => {
    expect(
      isAnswerCorrect(
        { type: "MULTIPLE_CHOICE", correctAnswer: "A", acceptedAnswers: null },
        "",
      ),
    ).toBe(false);
    expect(
      isAnswerCorrect(
        { type: "STUDENT_PRODUCED_RESPONSE", correctAnswer: "4", acceptedAnswers: ["4"] },
        "",
      ),
    ).toBe(false);
  });
});
