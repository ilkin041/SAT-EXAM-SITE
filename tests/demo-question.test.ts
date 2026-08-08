import { describe, expect, it } from "vitest";
import {
  DEMO_QUESTION_COUNT,
  buildDemoSummary,
  demoModuleLabel,
  formatDemoDuration,
  parseDemoProgress,
  toggleEliminated,
  type DemoAnswerRecord,
} from "@/lib/demo-question";

const IDS = ["q1", "q2", "q3"];

function answer(over: Partial<DemoAnswerRecord> = {}): DemoAnswerRecord {
  return { questionId: "q1", response: "A", correct: true, elapsedMs: 1000, ...over };
}

describe("formatDemoDuration", () => {
  it("drops the minute component below a minute", () => {
    expect(formatDemoDuration(0)).toBe("0s");
    expect(formatDemoDuration(48_000)).toBe("48s");
    expect(formatDemoDuration(59_999)).toBe("59s");
  });

  it("reads minutes and seconds above a minute", () => {
    expect(formatDemoDuration(60_000)).toBe("1m 0s");
    expect(formatDemoDuration(72_000)).toBe("1m 12s");
    expect(formatDemoDuration(3_600_000)).toBe("60m 0s");
  });

  it("floors, so it never claims more time than was spent", () => {
    expect(formatDemoDuration(1_999)).toBe("1s");
    expect(formatDemoDuration(119_999)).toBe("1m 59s");
  });

  it("survives a negative or non-finite reading rather than rendering NaN", () => {
    expect(formatDemoDuration(-5_000)).toBe("0s");
    expect(formatDemoDuration(Number.NaN)).toBe("0s");
    expect(formatDemoDuration(Number.POSITIVE_INFINITY)).toBe("0s");
  });
});

describe("buildDemoSummary", () => {
  it("reports what happened and projects nothing", () => {
    const summary = buildDemoSummary([
      answer({ questionId: "q1", correct: true, elapsedMs: 30_000 }),
      answer({ questionId: "q2", correct: false, elapsedMs: 22_000 }),
      answer({ questionId: "q3", correct: true, elapsedMs: 20_000 }),
    ]);
    expect(summary.scoreText).toBe("2 of 3");
    expect(summary.durationText).toBe("1m 12s");
    expect(summary.correctCount).toBe(2);
    expect(summary.totalCount).toBe(3);
  });

  it("carries no score-shaped field a caller could render as a projection", () => {
    const summary = buildDemoSummary([answer()]);
    expect(Object.keys(summary).sort()).toEqual([
      "correctCount",
      "durationText",
      "scoreText",
      "totalCount",
    ]);
  });

  it("handles an empty run", () => {
    expect(buildDemoSummary([])).toMatchObject({ scoreText: "0 of 0", durationText: "0s" });
  });
});

describe("demoModuleLabel", () => {
  it("matches the real test interface's chrome", () => {
    expect(demoModuleLabel("MATH")).toBe("Module 1 · Math");
    expect(demoModuleLabel("READING_WRITING")).toBe("Module 1 · Reading and Writing");
  });
});

describe("toggleEliminated", () => {
  it("adds and removes", () => {
    expect(toggleEliminated([], "B")).toEqual(["B"]);
    expect(toggleEliminated(["B"], "B")).toEqual([]);
    expect(toggleEliminated(["B"], "D")).toEqual(["B", "D"]);
  });

  it("does not mutate the input", () => {
    const before: ("A" | "B" | "C" | "D")[] = ["A"];
    toggleEliminated(before, "C");
    expect(before).toEqual(["A"]);
  });
});

describe("parseDemoProgress", () => {
  it("returns a fresh demo for absent or unparseable storage", () => {
    expect(parseDemoProgress(null, IDS)).toEqual({ index: 0, answers: [] });
    expect(parseDemoProgress("not json", IDS)).toEqual({ index: 0, answers: [] });
    expect(parseDemoProgress("[]", IDS)).toEqual({ index: 0, answers: [] });
    expect(parseDemoProgress('"a string"', IDS)).toEqual({ index: 0, answers: [] });
  });

  it("derives the position from the answer count, not a stored index", () => {
    const raw = JSON.stringify({
      index: 99,
      answers: [answer({ questionId: "q1" }), answer({ questionId: "q2" })],
    });
    expect(parseDemoProgress(raw, IDS).index).toBe(2);
  });

  it("discards progress naming a question no longer served", () => {
    const raw = JSON.stringify({ answers: [answer({ questionId: "retired" })] });
    expect(parseDemoProgress(raw, IDS)).toEqual({ index: 0, answers: [] });
  });

  it("discards a hand-edited record rather than repairing it", () => {
    const badLabel = JSON.stringify({ answers: [{ ...answer(), response: "E" }] });
    const badCorrect = JSON.stringify({ answers: [{ ...answer(), correct: "yes" }] });
    const badElapsed = JSON.stringify({ answers: [{ ...answer(), elapsedMs: "12" }] });
    expect(parseDemoProgress(badLabel, IDS).answers).toEqual([]);
    expect(parseDemoProgress(badCorrect, IDS).answers).toEqual([]);
    expect(parseDemoProgress(badElapsed, IDS).answers).toEqual([]);
  });

  it("clamps a negative elapsed time so the summary cannot run backwards", () => {
    const raw = JSON.stringify({ answers: [answer({ elapsedMs: -1000 })] });
    expect(parseDemoProgress(raw, IDS).answers[0]?.elapsedMs).toBe(0);
  });

  it("discards more answers than there are questions", () => {
    const raw = JSON.stringify({
      answers: [
        answer({ questionId: "q1" }),
        answer({ questionId: "q2" }),
        answer({ questionId: "q3" }),
        answer({ questionId: "q1" }),
      ],
    });
    expect(parseDemoProgress(raw, IDS)).toEqual({ index: 0, answers: [] });
  });

  it("keeps the demo at three questions", () => {
    expect(DEMO_QUESTION_COUNT).toBe(3);
  });
});
