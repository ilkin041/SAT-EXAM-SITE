import { describe, it, expect } from "vitest";
import {
  chooseModule2Difficulty,
  isRoutableAdaptiveTest,
  type RoutableModule,
} from "@/lib/adaptive-routing";

describe("chooseModule2Difficulty", () => {
  describe("linear mode", () => {
    it("always returns MIXED regardless of score", () => {
      expect(
        chooseModule2Difficulty({
          mode: "LINEAR",
          adaptiveThreshold: 0.6,
          correctCount: 0,
          totalCount: 27,
        }),
      ).toBe("MIXED");
      expect(
        chooseModule2Difficulty({
          mode: "LINEAR",
          adaptiveThreshold: 0.6,
          correctCount: 27,
          totalCount: 27,
        }),
      ).toBe("MIXED");
    });
  });

  describe("adaptive mode", () => {
    it("routes below threshold to EASY", () => {
      expect(
        chooseModule2Difficulty({
          mode: "ADAPTIVE",
          adaptiveThreshold: 0.6,
          correctCount: 10,
          totalCount: 27,
        }),
      ).toBe("EASY");
    });

    it("routes at or above threshold to HARD", () => {
      expect(
        chooseModule2Difficulty({
          mode: "ADAPTIVE",
          adaptiveThreshold: 0.6,
          correctCount: 17, // 17/27 ≈ 0.63
          totalCount: 27,
        }),
      ).toBe("HARD");
    });

    it("is inclusive at the threshold (≥)", () => {
      // 15/25 = 0.6 exactly
      expect(
        chooseModule2Difficulty({
          mode: "ADAPTIVE",
          adaptiveThreshold: 0.6,
          correctCount: 15,
          totalCount: 25,
        }),
      ).toBe("HARD");
    });

    it("respects custom thresholds", () => {
      const args = { mode: "ADAPTIVE" as const, correctCount: 14, totalCount: 27 }; // ≈0.52
      expect(chooseModule2Difficulty({ ...args, adaptiveThreshold: 0.5 })).toBe("HARD");
      expect(chooseModule2Difficulty({ ...args, adaptiveThreshold: 0.6 })).toBe("EASY");
      expect(chooseModule2Difficulty({ ...args, adaptiveThreshold: 0.7 })).toBe("EASY");
    });

    it("treats 0/0 as 0 (routes to EASY)", () => {
      expect(
        chooseModule2Difficulty({
          mode: "ADAPTIVE",
          adaptiveThreshold: 0.6,
          correctCount: 0,
          totalCount: 0,
        }),
      ).toBe("EASY");
    });

    it("routes a perfect score to HARD", () => {
      expect(
        chooseModule2Difficulty({
          mode: "ADAPTIVE",
          adaptiveThreshold: 0.6,
          correctCount: 27,
          totalCount: 27,
        }),
      ).toBe("HARD");
    });

    it("routes a zero score to EASY", () => {
      expect(
        chooseModule2Difficulty({
          mode: "ADAPTIVE",
          adaptiveThreshold: 0.6,
          correctCount: 0,
          totalCount: 27,
        }),
      ).toBe("EASY");
    });
  });
});

/**
 * The predicate the landing page's adaptive tile turns on (T3.6). The claim it
 * guards is about the *experience*, not the column: `pickNextModule` falls back
 * to any Module 2 when the difficulty it wants is missing, so an ADAPTIVE test
 * with one MIXED Module 2 routes nobody while running perfectly well.
 */
describe("isRoutableAdaptiveTest", () => {
  const m = (
    moduleNumber: number,
    difficulty: RoutableModule["difficulty"],
    questionCount = 22,
  ): RoutableModule => ({ moduleNumber, difficulty, questionCount });

  const routableSection = () => ({
    modules: [m(1, "MIXED"), m(2, "HARD"), m(2, "EASY")],
  });

  it("accepts an adaptive test whose every section has a filled M1, M2-hard and M2-easy", () => {
    expect(
      isRoutableAdaptiveTest({
        mode: "ADAPTIVE",
        sections: [routableSection(), routableSection()],
      }),
    ).toBe(true);
  });

  it("rejects a linear test even when it has both Module 2 branches", () => {
    expect(
      isRoutableAdaptiveTest({ mode: "LINEAR", sections: [routableSection()] }),
    ).toBe(false);
  });

  it("rejects an adaptive test with a single MIXED Module 2 — the shape that routes nobody", () => {
    expect(
      isRoutableAdaptiveTest({
        mode: "ADAPTIVE",
        sections: [{ modules: [m(1, "MIXED"), m(2, "MIXED")] }],
      }),
    ).toBe(false);
  });

  it("rejects a test missing one of the two branches", () => {
    expect(
      isRoutableAdaptiveTest({
        mode: "ADAPTIVE",
        sections: [{ modules: [m(1, "MIXED"), m(2, "HARD")] }],
      }),
    ).toBe(false);
    expect(
      isRoutableAdaptiveTest({
        mode: "ADAPTIVE",
        sections: [{ modules: [m(1, "MIXED"), m(2, "EASY")] }],
      }),
    ).toBe(false);
  });

  it("rejects an empty module — the engine can serve it and the student cannot answer it", () => {
    expect(
      isRoutableAdaptiveTest({
        mode: "ADAPTIVE",
        sections: [{ modules: [m(1, "MIXED"), m(2, "HARD"), m(2, "EASY", 0)] }],
      }),
    ).toBe(false);
    expect(
      isRoutableAdaptiveTest({
        mode: "ADAPTIVE",
        sections: [{ modules: [m(1, "MIXED", 0), m(2, "HARD"), m(2, "EASY")] }],
      }),
    ).toBe(false);
  });

  it("requires every section to route, not just one", () => {
    expect(
      isRoutableAdaptiveTest({
        mode: "ADAPTIVE",
        sections: [routableSection(), { modules: [m(1, "MIXED"), m(2, "MIXED")] }],
      }),
    ).toBe(false);
  });

  it("rejects a test with no sections", () => {
    expect(isRoutableAdaptiveTest({ mode: "ADAPTIVE", sections: [] })).toBe(false);
  });

  it("rejects a Module 1 that is not MIXED", () => {
    expect(
      isRoutableAdaptiveTest({
        mode: "ADAPTIVE",
        sections: [{ modules: [m(1, "HARD"), m(2, "HARD"), m(2, "EASY")] }],
      }),
    ).toBe(false);
  });
});
