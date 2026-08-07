import { describe, expect, it } from "vitest";
import { hueIndex } from "@/components/ui/avatar";
import { pageItems } from "@/components/ui/pagination";

/**
 * The two pure functions behind T1.6's primitives. Both are the kind of thing
 * that is invisible when it drifts: an avatar that changes colour after a
 * deploy still renders, and a pager that elides the wrong run still paginates.
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
