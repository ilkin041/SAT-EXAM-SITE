import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ANONYMOUS_ATTEMPT_COOKIE = "sat_anonymous_attempt";
export const ANONYMOUS_ATTEMPT_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function signingSecret() {
  const secret = process.env.ANONYMOUS_ATTEMPT_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET or ANONYMOUS_ATTEMPT_SECRET is required");
  return secret;
}

function signature(payload: string) {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function createAnonymousAttemptToken(attemptId: string, now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + ANONYMOUS_ATTEMPT_MAX_AGE_SECONDS;
  const payload = `${attemptId}.${expiresAt}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyAnonymousAttemptToken(
  token: string | undefined,
  attemptId: string,
  now = Date.now(),
) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tokenAttemptId, expiresRaw, suppliedSignature] = parts;
  if (tokenAttemptId !== attemptId) return false;
  const expiresAt = Number(expiresRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return false;
  const expectedSignature = signature(`${tokenAttemptId}.${expiresRaw}`);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function hasAnonymousAttemptCookie(attemptId: string) {
  return verifyAnonymousAttemptToken(
    cookies().get(ANONYMOUS_ATTEMPT_COOKIE)?.value,
    attemptId,
  );
}

export const anonymousAttemptCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ANONYMOUS_ATTEMPT_MAX_AGE_SECONDS,
};
