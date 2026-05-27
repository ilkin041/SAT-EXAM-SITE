import { describe, it, expect } from "vitest";
import { chooseModule2Difficulty } from "@/lib/adaptive-routing";

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
