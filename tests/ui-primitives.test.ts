import { describe, expect, it } from "vitest";
import { hueIndex } from "@/components/ui/avatar";
import { pageItems } from "@/components/ui/pagination";
import { gradeOf, percentOf, scoreBandTicks } from "@/components/ui/progress";
import { dialPercent } from "@/components/ui/score-dial";

/**
 * The pure functions behind the T1.6 and T1.7 primitives. All of them are the
 * kind of thing that is invisible when it drifts: an avatar that changes colour
 * after a deploy still renders, a pager that elides the wrong run still
 * paginates, and a gauge that maps the wrong range still draws a ring.
 */

describe("hueIndex", () => {
  it("is stable for a given seed", () => {
    // Pinned, not just self-consistent: a change to the hash is a change to
    // every avatar in the product, and it should have to be deliberate.
    expect(hueIndex("clv8x2a10000qw")).toBe(2);
    expect(hueIndex("clv8x2a10001qw")).toBe(3);
    expect(hueIndex("user_123")).toBe(1);
    expect(hueIndex("")).toBe(1);
  });

  it("stays inside the hue set", () => {
    for (let i = 0; i < 500; i++) {
      const hue = hueIndex(`clv8x2a1${i.toString().padStart(4, "0")}qw`);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThanOrEqual(5);
      expect(Number.isInteger(hue)).toBe(true);
    }
  });

  it("spreads across the set rather than favouring one hue", () => {
    const counts = new Map<number, number>();
    for (let i = 0; i < 600; i++) {
      const hue = hueIndex(`cuid${i}`);
      counts.set(hue, (counts.get(hue) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    for (const count of counts.values()) expect(count).toBeGreaterThan(50);
  });
});

describe("pageItems", () => {
  it("lists every page when they all fit", () => {
    expect(pageItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps the first and last page reachable from the middle", () => {
    expect(pageItems(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
  });

  it("elides on one side only at the ends", () => {
    expect(pageItems(1, 20)).toEqual([1, 2, "gap", 20]);
    expect(pageItems(20, 20)).toEqual([1, "gap", 19, 20]);
  });

  it("fills a one-page gap instead of hiding it behind an ellipsis", () => {
    // 1 … 3 4 5 costs the same width as 1 2 3 4 5 and says less.
    expect(pageItems(4, 20)).toEqual([1, 2, 3, 4, 5, "gap", 20]);
  });

  it("honours a wider sibling window", () => {
    expect(pageItems(10, 20, 2)).toEqual([1, "gap", 8, 9, 10, 11, 12, "gap", 20]);
  });

  it("handles a single page", () => {
    expect(pageItems(1, 1)).toEqual([1]);
  });
});

describe("gradeOf", () => {
  it("cuts at 75 / 50 / 25", () => {
    // These four bands are the product's grading scale, lifted from the
    // results page. Pinned because no score is stored: every bar in every
    // historical attempt is recomputed on render, so moving a cut re-colours
    // the past.
    expect(gradeOf(100)).toBe("high");
    expect(gradeOf(75)).toBe("high");
    expect(gradeOf(74)).toBe("mid");
    expect(gradeOf(50)).toBe("mid");
    expect(gradeOf(49)).toBe("low");
    expect(gradeOf(25)).toBe("low");
    expect(gradeOf(24)).toBe("critical");
    expect(gradeOf(0)).toBe("critical");
  });
});

describe("percentOf", () => {
  it("maps a value onto its band", () => {
    expect(percentOf(500, 200, 800)).toBe(50);
    expect(percentOf(900, 200, 1600)).toBe(50);
    expect(percentOf(12, 0, 20)).toBe(60);
  });

  it("clamps outside the band instead of returning a negative width", () => {
    expect(percentOf(150, 200, 800)).toBe(0);
    expect(percentOf(2000, 200, 1600)).toBe(100);
  });

  it("is 0 for a degenerate band rather than dividing by zero", () => {
    expect(percentOf(400, 400, 400)).toBe(0);
    expect(percentOf(400, 800, 200)).toBe(0);
  });
});

describe("scoreBandTicks", () => {
  it("rules a total score every 200", () => {
    expect(scoreBandTicks(200, 1600)).toEqual([
      200, 400, 600, 800, 1000, 1200, 1400, 1600,
    ]);
  });

  it("rules a section score every 100", () => {
    expect(scoreBandTicks(200, 800)).toEqual([
      200, 300, 400, 500, 600, 700, 800,
    ]);
  });

  it("never draws more than nine ticks, whatever the span", () => {
    for (const [min, max] of [
      [0, 10],
      [0, 100],
      [200, 800],
      [200, 1600],
      [0, 5000],
    ] as const) {
      expect(scoreBandTicks(min, max).length).toBeLessThanOrEqual(9);
    }
  });

  it("always ends on max, even when the step does not divide the span", () => {
    const ticks = scoreBandTicks(200, 1550);
    expect(ticks[0]).toBe(200);
    expect(ticks[ticks.length - 1]).toBe(1550);
  });

  it("degenerates to a single tick rather than looping forever", () => {
    expect(scoreBandTicks(800, 800)).toEqual([800]);
  });
});

describe("dialPercent", () => {
  it("fills the ring by the fraction of the scale, not by an SAT floor", () => {
    // The bug this replaced was `(value - 400) / 1200`, which drew a 400 — the
    // bottom of the scale, not an absent student — as an empty circle.
    expect(dialPercent(400, 1600)).toBe(25);
    expect(dialPercent(800, 1600)).toBe(50);
    expect(dialPercent(1200, 1600)).toBe(75);
    expect(dialPercent(1600, 1600)).toBe(100);
  });

  it("works on a section scale too", () => {
    expect(dialPercent(400, 800)).toBe(50);
    expect(dialPercent(640, 800)).toBe(80);
  });

  it("clamps and survives a zero max", () => {
    expect(dialPercent(-50, 1600)).toBe(0);
    expect(dialPercent(2000, 1600)).toBe(100);
    expect(dialPercent(400, 0)).toBe(0);
  });
});
