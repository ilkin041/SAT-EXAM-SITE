import { describe, expect, it } from "vitest";
import { computeItemAnalysis, summarizeFocusEvents } from "@/lib/analytics";

describe("computeItemAnalysis", () => {
  it("counts unanswered exposures in the p-value denominator", () => {
    const rows = computeItemAnalysis([
      { questionId: "q1", type: "MULTIPLE_CHOICE", correctAnswer: "A", response: "A", isCorrect: true, timeSpent: 20 },
      { questionId: "q1", type: "MULTIPLE_CHOICE", correctAnswer: "A", response: "", isCorrect: false, timeSpent: 0 },
    ]);
    expect(rows[0].pValue).toBe(0.5);
    expect(rows[0].responses).toContainEqual({
      response: "Unanswered",
      count: 1,
      percentage: 50,
      isKey: false,
      isUnanswered: true,
    });
    expect(rows[0].averageTimeSeconds).toBe(20);
  });

  it("flags extreme items and a distractor that outdraws the key after five exposures", () => {
    const rows = computeItemAnalysis([
      ...Array.from({ length: 4 }, () => ({ questionId: "q1", type: "MULTIPLE_CHOICE" as const, correctAnswer: "A", response: "B", isCorrect: false, timeSpent: 10 })),
      { questionId: "q1", type: "MULTIPLE_CHOICE", correctAnswer: "A", response: "A", isCorrect: true, timeSpent: 20 },
    ]);
    expect(rows[0].flags).toEqual(["TOO_HARD", "DISTRACTOR_OUTDRAWS_KEY"]);
  });
});

describe("summarizeFocusEvents", () => {
  it("counts focus signals and paired time away", () => {
    expect(
      summarizeFocusEvents([
        { type: "blur", at: 1_000 },
        { type: "focus", at: 6_000 },
        { type: "fullscreen_exit", at: 7_000 },
      ]),
    ).toEqual({ eventCount: 3, blurCount: 1, fullscreenExitCount: 1, outOfFocusSeconds: 5 });
  });
});
