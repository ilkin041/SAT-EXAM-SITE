import { NextResponse } from "next/server";
import { sweepStaleAttempts } from "@/lib/attempt-engine";
import { SYSTEM_SESSION_ID } from "@/lib/analytics-events";
import { track } from "@/lib/track";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { expiredAttempts, ...result } = await sweepStaleAttempts();

  // An attempt the student walked away from and one the clock closed are the
  // same fact for the funnel — a test that was started and never submitted — so
  // both are `attempt_abandoned`, separated by `reason`. There is no browser
  // here, so these rows belong to the system session rather than to whichever
  // request happened to trigger the cron.
  for (const attempt of expiredAttempts) {
    void track("attempt_abandoned", {
      sessionId: SYSTEM_SESSION_ID,
      userId: attempt.userId,
      props: { attemptId: attempt.id, testId: attempt.testId, reason: "expired" },
    });
  }

  return NextResponse.json({ ok: true, ...result });
}
