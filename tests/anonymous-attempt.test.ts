import { beforeEach, describe, expect, it } from "vitest";
import {
  createAnonymousAttemptToken,
  verifyAnonymousAttemptToken,
} from "@/lib/anonymous-attempt";

describe("anonymous attempt capability cookie", () => {
  beforeEach(() => {
    process.env.ANONYMOUS_ATTEMPT_SECRET = "test-secret-with-enough-entropy";
  });

  it("binds the signed token to one attempt id", () => {
    const now = 1_800_000_000_000;
    const token = createAnonymousAttemptToken("attempt-a", now);
    expect(verifyAnonymousAttemptToken(token, "attempt-a", now)).toBe(true);
    expect(verifyAnonymousAttemptToken(token, "attempt-b", now)).toBe(false);
  });

  it("rejects tampering and expiry", () => {
    const now = 1_800_000_000_000;
    const token = createAnonymousAttemptToken("attempt-a", now);
    expect(verifyAnonymousAttemptToken(`${token}x`, "attempt-a", now)).toBe(false);
    expect(verifyAnonymousAttemptToken(token, "attempt-a", now + 31 * 24 * 60 * 60 * 1000)).toBe(false);
  });
});
