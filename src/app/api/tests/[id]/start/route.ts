import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { reconcileAttemptLifecycle, startAttempt } from "@/lib/attempt-engine";
import { canAccessTest } from "@/lib/test-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { abandonAttempt } from "@/lib/attempt-transitions";
import { track } from "@/lib/track";
import {
  ANONYMOUS_ATTEMPT_COOKIE,
  anonymousAttemptCookieOptions,
  createAnonymousAttemptToken,
} from "@/lib/anonymous-attempt";

/**
 * Start (or resume) an attempt for a given test.
 *
 *  - Anonymous users on public tests get a new attempt every click.
 *  - Logged-in users with an existing IN_PROGRESS attempt for this test:
 *      - With `?fresh=1` (or `{ fresh: true }` in the body): the existing
 *        attempt is marked ABANDONED and a new one is started.
 *      - Without `fresh`: returns `{ ok: true, attemptId, resumed: true }`
 *        pointing at the existing attempt so the client can route directly
 *        to it.
 *  - Logged-in users with no existing attempt: new attempt as normal.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await auth();
  const test = await prisma.test.findUnique({ where: { id } });
  if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });
  if (!(await canAccessTest(session?.user, test))) {
    return NextResponse.json(
      { error: session?.user ? "Forbidden" : "Login required" },
      { status: session?.user ? 403 : 401 },
    );
  }

  // `fresh` may come from query string or JSON body — accept both so the
  // client doesn't need to know about the HTTP nuance.
  //
  // The body also carries `viewportWidth`. It is the one thing the server
  // cannot observe about the device, and T10.1 has to answer "does mobile
  // matter" — so it is captured here, on the request that starts an attempt,
  // rather than by a tracking beacon on every page.
  const url = new URL(req.url);
  let fresh = url.searchParams.get("fresh") === "1";
  const body = (await req.json().catch(() => null)) as {
    fresh?: boolean;
    viewportWidth?: number;
  } | null;
  if (!fresh && body?.fresh === true) fresh = true;
  const viewportWidth =
    typeof body?.viewportWidth === "number" ? body.viewportWidth : null;

  const userId = session?.user?.id ?? null;
  let existingToAbandon: string | null = null;

  // Look for an existing in-progress attempt for this exact user + test.
  if (userId) {
    const existing = await prisma.testAttempt.findFirst({
      where: { userId, testId: id, status: "IN_PROGRESS" },
      orderBy: { startedAt: "desc" },
      select: { id: true },
    });
    if (existing) {
      await reconcileAttemptLifecycle(existing.id);
      const stillOpen = await prisma.testAttempt.findUnique({
        where: { id: existing.id },
        select: { status: true },
      });
      if (stillOpen?.status !== "IN_PROGRESS") {
        // Expiry closed it; continue to create a replacement attempt.
      } else if (fresh) {
        existingToAbandon = existing.id;
      } else {
        // Resume.
        return NextResponse.json({ ok: true, attemptId: existing.id, resumed: true });
      }
    }
  }

  // Only creations consume the limit; ordinary resume requests do not.
  const rateLimit = checkRateLimit(req, "attempt-start", {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  if (existingToAbandon) {
    const abandoned = await abandonAttempt(existingToAbandon);
    if (abandoned) {
      void track("attempt_abandoned", {
        userId,
        viewportWidth,
        props: { attemptId: existingToAbandon, testId: id, reason: "restarted" },
      });
    }
  }

  try {
    const attempt = await startAttempt({ testId: id, userId });
    void track("attempt_started", {
      userId,
      viewportWidth,
      props: {
        attemptId: attempt.id,
        testId: id,
        mode: test.mode,
        isPublic: test.isPublic,
        anonymous: userId === null,
      },
    });
    const response = NextResponse.json({ ok: true, attemptId: attempt.id, resumed: false });
    if (!userId) {
      response.cookies.set(
        ANONYMOUS_ATTEMPT_COOKIE,
        createAnonymousAttemptToken(attempt.id),
        anonymousAttemptCookieOptions,
      );
    }
    return response;
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
