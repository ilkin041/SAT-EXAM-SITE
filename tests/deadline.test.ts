import { describe, expect, it } from "vitest";
import {
  calculateModuleDeadline,
  DEADLINE_GRACE_SECONDS,
  isModuleDeadlineExpired,
} from "@/lib/attempt-engine";

describe("authoritative module deadline", () => {
  it("includes the module time limit and grace period", () => {
    const startedAt = new Date("2026-08-06T10:00:00.000Z");
    const deadline = calculateModuleDeadline(startedAt, 32 * 60);

    expect(deadline.toISOString()).toBe("2026-08-06T10:32:10.000Z");
    expect(DEADLINE_GRACE_SECONDS).toBe(10);
  });

  it("accepts a mutation exactly at the deadline and rejects it afterward", () => {
    const deadline = new Date("2026-08-06T10:32:10.000Z");

    expect(isModuleDeadlineExpired(deadline, deadline.getTime())).toBe(false);
    expect(isModuleDeadlineExpired(deadline, deadline.getTime() + 1)).toBe(true);
  });
});
