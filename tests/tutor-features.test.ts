import { describe, expect, it } from "vitest";
import { TUTOR_BAND_FEATURES, TUTOR_FEATURES } from "@/lib/tutor-features";

/**
 * T3.8. The tutor band and `/for-tutors` read the same array, so the only way
 * they can lie is by the array claiming something the admin product does not
 * do. Every entry carries the route it lives at for exactly that reason: it
 * makes the claim checkable by whoever edits the file next.
 */

describe("TUTOR_FEATURES", () => {
  it("points every claim at an admin route", () => {
    for (const feature of TUTOR_FEATURES) {
      expect(
        feature.route.startsWith("/admin") || feature.route.startsWith("/api/admin"),
        `${feature.id} points at ${feature.route}`,
      ).toBe(true);
    }
  });

  it("has unique ids", () => {
    const ids = TUTOR_FEATURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives the band the six the section has room for, in page order", () => {
    expect(TUTOR_BAND_FEATURES).toHaveLength(6);
    expect(TUTOR_BAND_FEATURES.map((f) => f.id)).toEqual([
      "question-bank",
      "test-assembly",
      "groups",
      "assignment",
      "csv-export",
      "json-import",
    ]);
    // The band is a prefix of the full list, so `/for-tutors` cannot drop one
    // the landing page is already showing.
    expect(TUTOR_FEATURES.slice(0, 6)).toEqual(TUTOR_BAND_FEATURES);
  });

  it("keeps the copy to plain claims — no numbers nobody can check", () => {
    // Same rule as the stats strip: a figure on a marketing surface has to come
    // from a query. These lines describe capability, so they carry no figures.
    for (const feature of TUTOR_FEATURES) {
      expect(feature.description).not.toMatch(/\d/);
      expect(feature.title.length).toBeLessThanOrEqual(40);
    }
  });
});
