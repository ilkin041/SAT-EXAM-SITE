import { describe, expect, it } from "vitest";
import {
  ANALYTICS_EVENTS,
  FUNNEL_STEPS,
  sanitizeProps,
} from "@/lib/analytics-events";
import {
  deviceTypeFromUserAgent,
  normalizeViewportWidth,
  truncateUserAgent,
  USER_AGENT_MAX_LENGTH,
} from "@/lib/device";
import {
  TEST_TAKING_CHAIN,
  computeFunnel,
  parseWindow,
  windowStart,
} from "@/lib/funnel";

describe("event catalogue", () => {
  it("holds the eleven funnel events the roadmap asks for", () => {
    expect(ANALYTICS_EVENTS).toHaveLength(11);
    expect(new Set(ANALYTICS_EVENTS).size).toBe(11);
  });

  it("shows every catalogued event on the admin page", () => {
    expect(FUNNEL_STEPS.map((step) => step.name).sort()).toEqual(
      [...ANALYTICS_EVENTS].sort(),
    );
  });

  it("only names events that exist in the catalogue in the funnel chain", () => {
    for (const step of TEST_TAKING_CHAIN) {
      expect(ANALYTICS_EVENTS).toContain(step.name);
    }
  });
});

describe("sanitizeProps", () => {
  it("keeps scalar labels", () => {
    const { props, dropped } = sanitizeProps({
      attemptId: "abc",
      anonymous: true,
      moduleNumber: 2,
      routedTo: null,
    });
    expect(props).toEqual({
      attemptId: "abc",
      anonymous: true,
      moduleNumber: 2,
      routedTo: null,
    });
    expect(dropped).toEqual([]);
  });

  it("drops identifying keys", () => {
    const { props, dropped } = sanitizeProps({
      email: "a@b.com",
      name: "Ada",
      userAgent: "Mozilla/5.0",
      response: "3/4",
      ip: "1.2.3.4",
      testId: "t1",
    });
    expect(props).toEqual({ testId: "t1" });
    expect(dropped.sort()).toEqual(["email", "ip", "name", "response", "userAgent"]);
  });

  it("drops a value that looks like an email whatever the key is called", () => {
    const { props, dropped } = sanitizeProps({ label: "student@example.com" });
    expect(props).toBeNull();
    expect(dropped).toEqual(["label"]);
  });

  // `ip` is inside `skipped` and `name` is inside `domainName` — the guard
  // matches those two as whole keys precisely so these survive.
  it("does not eat innocent keys that merely contain a forbidden word", () => {
    const { props, dropped } = sanitizeProps({
      skipped: true,
      domainName: "Algebra",
      description: "linear",
    });
    expect(dropped).toEqual([]);
    expect(props).toEqual({
      skipped: true,
      domainName: "Algebra",
      description: "linear",
    });
  });

  it("refuses nested objects and arrays rather than serializing them", () => {
    const { props, dropped } = sanitizeProps({ nested: { a: 1 }, list: [1, 2] });
    expect(props).toBeNull();
    expect(dropped.sort()).toEqual(["list", "nested"]);
  });

  it("caps free text and normalizes non-finite numbers", () => {
    const { props } = sanitizeProps({ label: "x".repeat(500), ratio: Number.NaN });
    expect((props?.label as string).length).toBe(120);
    expect(props?.ratio).toBeNull();
  });

  it("returns null props for a non-object", () => {
    expect(sanitizeProps(undefined).props).toBeNull();
    expect(sanitizeProps([1, 2]).props).toBeNull();
  });
});

describe("deviceTypeFromUserAgent", () => {
  const cases: [string, string][] = [
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
      "MOBILE",
    ],
    [
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
      "MOBILE",
    ],
    [
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
      "TABLET",
    ],
    [
      "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "TABLET",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "DESKTOP",
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
      "DESKTOP",
    ],
    ["Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", "BOT"],
    ["curl/8.4.0", "BOT"],
    ["something entirely unfamiliar", "UNKNOWN"],
  ];

  it.each(cases)("classifies %s", (ua, expected) => {
    expect(deviceTypeFromUserAgent(ua)).toBe(expected);
  });

  it("is UNKNOWN with no user agent", () => {
    expect(deviceTypeFromUserAgent(null)).toBe("UNKNOWN");
    expect(deviceTypeFromUserAgent(undefined)).toBe("UNKNOWN");
  });

  // A mobile-shaped UA that is really a crawler must not inflate the mobile
  // share — that number is the whole reason the column exists.
  it("prefers BOT over MOBILE when a crawler advertises a phone", () => {
    expect(
      deviceTypeFromUserAgent(
        "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X) AppleWebKit/537.36 (compatible; Googlebot/2.1)",
      ),
    ).toBe("BOT");
  });
});

describe("user agent and viewport normalization", () => {
  it("truncates a long user agent and nulls an empty one", () => {
    expect(truncateUserAgent("a".repeat(1000))?.length).toBe(USER_AGENT_MAX_LENGTH);
    expect(truncateUserAgent("   ")).toBeNull();
    expect(truncateUserAgent(null)).toBeNull();
  });

  it("accepts plausible widths and rejects the rest", () => {
    expect(normalizeViewportWidth(390)).toBe(390);
    expect(normalizeViewportWidth(1279.6)).toBe(1280);
    expect(normalizeViewportWidth(0)).toBeNull();
    expect(normalizeViewportWidth(99_999)).toBeNull();
    expect(normalizeViewportWidth("1280")).toBeNull();
    expect(normalizeViewportWidth(undefined)).toBeNull();
  });
});

describe("computeFunnel", () => {
  it("computes share of first and share of previous", () => {
    const rows = computeFunnel(TEST_TAKING_CHAIN, {
      attempt_started: 200,
      attempt_submitted: 150,
      results_viewed: 120,
      review_opened: 30,
    });
    expect(rows.map((row) => [row.count, row.shareOfFirst, row.shareOfPrevious])).toEqual([
      [200, 100, null],
      [150, 75, 75],
      [120, 60, 80],
      [30, 15, 25],
    ]);
  });

  it("reports nulls rather than dividing by zero on an empty table", () => {
    const rows = computeFunnel(TEST_TAKING_CHAIN, {});
    expect(rows.every((row) => row.count === 0)).toBe(true);
    expect(rows.every((row) => row.shareOfFirst === null)).toBe(true);
    expect(rows.every((row) => row.shareOfPrevious === null)).toBe(true);
  });

  it("treats a missing event name as zero", () => {
    const rows = computeFunnel(TEST_TAKING_CHAIN, { attempt_started: 4 });
    expect(rows[1]).toMatchObject({ count: 0, shareOfFirst: 0 });
  });

  it("rounds to one decimal", () => {
    const rows = computeFunnel(TEST_TAKING_CHAIN, {
      attempt_started: 3,
      attempt_submitted: 1,
    });
    expect(rows[1].shareOfFirst).toBe(33.3);
  });
});

describe("window parsing", () => {
  it("accepts the offered windows and defaults everything else to 30", () => {
    expect(parseWindow("7")).toBe(7);
    expect(parseWindow("90")).toBe(90);
    expect(parseWindow("1")).toBe(30);
    expect(parseWindow("__proto__")).toBe(30);
    expect(parseWindow(undefined)).toBe(30);
  });

  it("subtracts whole days in UTC", () => {
    const now = new Date("2026-08-08T12:00:00.000Z");
    expect(windowStart(7, now).toISOString()).toBe("2026-08-01T12:00:00.000Z");
  });
});
