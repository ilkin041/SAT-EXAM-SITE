import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatDayMonth } from "@/lib/format-date";

/**
 * These outputs are pinned, not merely asserted to be non-empty. The whole
 * point of the module is that the *runtime's* locale and time zone must not
 * reach the output: when they did, a server component rendered "5 avq 2026",
 * a client component "8/6/2026", and React reported a hydration mismatch on
 * `/admin/questions`. A test that only checked "some string came back" would
 * have passed throughout.
 *
 * If one of these fails, someone dropped `locale` or `timeZone` — or made the
 * localisation decision that `CLAUDE.md` still lists as open, in which case
 * update the expectations deliberately.
 */

describe("formatDate", () => {
  it("renders day, short month and year", () => {
    expect(formatDate(new Date("2026-08-06T12:00:00Z"))).toBe("6 Aug 2026");
  });

  it("accepts an ISO string and a millisecond timestamp", () => {
    expect(formatDate("2026-08-06T12:00:00Z")).toBe("6 Aug 2026");
    expect(formatDate(Date.UTC(2026, 7, 6, 12))).toBe("6 Aug 2026");
  });

  it("reads the instant in UTC, not the runtime's zone", () => {
    // 23:30 UTC is already the 7th in Baku (+04) and still the 6th in New
    // York (-04). Both must render the 6th, or two readers comparing the same
    // attempt row are looking at different days.
    expect(formatDate(new Date("2026-08-06T23:30:00Z"))).toBe("6 Aug 2026");
    expect(formatDate(new Date("2026-08-07T00:30:00Z"))).toBe("7 Aug 2026");
  });
});

describe("formatDateTime", () => {
  it("renders a 24-hour clock and says which zone it is", () => {
    expect(formatDateTime(new Date("2026-08-06T08:14:00Z"))).toBe(
      "6 Aug 2026, 08:14 UTC",
    );
  });

  it("does not wrap past noon into a 12-hour clock", () => {
    expect(formatDateTime(new Date("2026-08-06T20:05:00Z"))).toBe(
      "6 Aug 2026, 20:05 UTC",
    );
  });

  it("renders midnight as 00:xx, not 24:xx", () => {
    expect(formatDateTime(new Date("2026-08-06T00:05:00Z"))).toBe(
      "6 Aug 2026, 00:05 UTC",
    );
  });
});

describe("formatDayMonth", () => {
  it("drops the year", () => {
    expect(formatDayMonth(new Date("2026-08-06T12:00:00Z"))).toBe("6 Aug");
  });
});
