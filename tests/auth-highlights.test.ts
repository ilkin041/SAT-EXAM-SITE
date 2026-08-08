import { describe, expect, it } from "vitest";
import { AUTH_HIGHLIGHTS } from "@/lib/auth-highlights";

/**
 * T4.1. The auth panel is half the screen on four pages and reads from one
 * array, so the only way those four can lie is by the array claiming something
 * the product does not do. Every entry carries the route it lives at for
 * exactly that reason.
 */

/** Routes that exist. A claim pointing anywhere else is aspirational. */
const REAL_ROUTES = new Set([
  "/dashboard",
  "/results/[attemptId]",
  "/results/[attemptId]/review",
  "/test/attempt/[attemptId]",
]);

describe("AUTH_HIGHLIGHTS", () => {
  it("points every claim at a route the app serves", () => {
    for (const highlight of AUTH_HIGHLIGHTS) {
      expect(
        REAL_ROUTES.has(highlight.route),
        `${highlight.id} points at ${highlight.route}`,
      ).toBe(true);
    }
  });

  it("has unique ids", () => {
    const ids = AUTH_HIGHLIGHTS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps the copy to plain claims — no numbers nobody can check", () => {
    // Same rule as the stats strip and the tutor band: a figure on a marketing
    // surface has to come from a query. These lines describe capability.
    for (const highlight of AUTH_HIGHLIGHTS) {
      expect(highlight.detail).not.toMatch(/\d/);
      expect(highlight.label).not.toMatch(/\d/);
    }
  });

  it("keeps the labels short enough to be mono eyebrows", () => {
    // `.eyebrow` is mono and uppercase with 0.08em tracking. Past ~24 chars it
    // wraps in the panel's column at `lg`, where the list is widest it gets.
    for (const highlight of AUTH_HIGHLIGHTS) {
      expect(highlight.label.length, highlight.id).toBeLessThanOrEqual(24);
    }
  });

  it("fills the panel without overflowing it", () => {
    // Four is too few to earn half a screen; six starts scrolling at 1280x800,
    // which is the laptop size the screenshots are taken at.
    expect(AUTH_HIGHLIGHTS.length).toBeGreaterThanOrEqual(4);
    expect(AUTH_HIGHLIGHTS.length).toBeLessThanOrEqual(5);
  });
});
