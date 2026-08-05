import { describe, expect, it } from "vitest";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

describe("IP rate limiting", () => {
  it("uses the first forwarded client address", () => {
    const request = new Request("https://example.test", {
      headers: { "x-forwarded-for": "203.0.113.4, 10.0.0.1" },
    });

    expect(getRequestIp(request)).toBe("203.0.113.4");
  });

  it("rejects requests after the configured limit", () => {
    const request = new Request("https://example.test", {
      headers: { "x-real-ip": "198.51.100.22" },
    });
    const scope = `test-${Math.random()}`;
    const options = { limit: 2, windowMs: 60_000 };

    expect(checkRateLimit(request, scope, options).allowed).toBe(true);
    expect(checkRateLimit(request, scope, options).allowed).toBe(true);
    const blocked = checkRateLimit(request, scope, options);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
