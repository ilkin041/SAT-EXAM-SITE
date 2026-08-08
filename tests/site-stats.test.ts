import { describe, expect, it } from "vitest";
import {
  MIN_COMPLETED_ATTEMPTS,
  buildSiteStatTiles,
  roundDownStat,
} from "@/lib/site-stats";

/**
 * T3.2. The thing that can silently rot here is a figure that rounds *up* — a
 * landing page overstating the bank is the exact copy-rule violation this task
 * removed, and it would be one sign flip away from coming back.
 */

describe("roundDownStat", () => {
  it("never returns more than it was given", () => {
    for (let value = 0; value <= 3000; value += 1) {
      expect(roundDownStat(value).value).toBeLessThanOrEqual(value);
    }
  });

  it("keeps the figure above 80% of the truth", () => {
    for (let value = 1; value <= 3000; value += 1) {
      expect(roundDownStat(value).value).toBeGreaterThan(value * 0.8);
    }
  });

  it("rounds the bank of 280 questions to 250+", () => {
    expect(roundDownStat(280).display).toBe("250+");
  });

  it("leaves a figure that is already round exact, with no +", () => {
    expect(roundDownStat(5)).toMatchObject({ value: 5, approximate: false, display: "5" });
    expect(roundDownStat(250).display).toBe("250");
  });

  it("marks a rounded figure approximate and an exact one not", () => {
    expect(roundDownStat(281).approximate).toBe(true);
    expect(roundDownStat(300).approximate).toBe(false);
  });

  it("does not round small counts at all", () => {
    for (const value of [0, 1, 2, 3, 4]) {
      expect(roundDownStat(value).display).toBe(String(value));
    }
  });

  it("groups thousands with the pinned en-GB separator", () => {
    // Never the runtime default: `az` formats this as `1 200` and the mismatch
    // between a server and a client render is a hydration error.
    expect(roundDownStat(1234).display).toBe("1,200+");
  });

  it("survives a non-finite count instead of rendering NaN", () => {
    expect(roundDownStat(Number.NaN).display).toBe("0");
    expect(roundDownStat(-7).display).toBe("0");
  });
});

describe("buildSiteStatTiles", () => {
  const counts = { questions: 280, publicTests: 5, completedAttempts: 19 };

  it("hides the completed tile below the threshold", () => {
    const keys = buildSiteStatTiles(counts).map((tile) => tile.key);
    expect(keys).toEqual(["questions", "tests", "free"]);
  });

  it("shows the completed tile once it is worth showing", () => {
    const keys = buildSiteStatTiles({
      ...counts,
      completedAttempts: MIN_COMPLETED_ATTEMPTS,
    }).map((tile) => tile.key);
    expect(keys).toEqual(["questions", "tests", "completed", "free"]);
  });

  it("drops a tile whose count is zero rather than printing 0", () => {
    const keys = buildSiteStatTiles({
      questions: 0,
      publicTests: 0,
      completedAttempts: 0,
    }).map((tile) => tile.key);
    expect(keys).toEqual(["free"]);
  });

  it("always keeps the free tile, which is a fact and not a count", () => {
    const free = buildSiteStatTiles(counts).find((tile) => tile.key === "free");
    expect(free).toMatchObject({ value: "Free", numeric: false });
  });

  it("singularises the test tile at one", () => {
    const tests = buildSiteStatTiles({ ...counts, publicTests: 1 }).find(
      (tile) => tile.key === "tests",
    );
    expect(tests).toMatchObject({ value: "1", label: "Free practice test" });
  });

  it("marks every counted tile numeric so it takes .tabular", () => {
    for (const tile of buildSiteStatTiles({ ...counts, completedAttempts: 1200 })) {
      expect(tile.numeric).toBe(tile.key !== "free");
    }
  });

  it("never renders a figure the counts do not support", () => {
    for (const tile of buildSiteStatTiles(counts)) {
      if (!tile.numeric) continue;
      const shown = Number(tile.value.replace(/[,+]/g, ""));
      const source =
        tile.key === "questions"
          ? counts.questions
          : tile.key === "tests"
            ? counts.publicTests
            : counts.completedAttempts;
      expect(shown).toBeLessThanOrEqual(source);
    }
  });
});
