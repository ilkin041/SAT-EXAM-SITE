import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startAttempt } from "@/lib/attempt-engine";

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
  if (!session?.user && !test.isPublic) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  // `fresh` may come from query string or JSON body — accept both so the
  // client doesn't need to know about the HTTP nuance.
  const url = new URL(req.url);
  let fresh = url.searchParams.get("fresh") === "1";
  if (!fresh) {
    try {
      const body = (await req.json().catch(() => null)) as { fresh?: boolean } | null;
      if (body?.fresh === true) fresh = true;
    } catch {
      /* no body — fine */
    }
  }

  const userId = session?.user?.id ?? null;

  // Look for an existing in-progress attempt for this exact user + test.
  if (userId) {
    const existing = await prisma.testAttempt.findFirst({
      where: { userId, testId: id, status: "IN_PROGRESS" },
      orderBy: { startedAt: "desc" },
      select: { id: true },
    });
    if (existing) {
      if (fresh) {
        await prisma.testAttempt.update({
          where: { id: existing.id },
          data: { status: "ABANDONED", completedAt: new Date() },
        });
      } else {
        // Resume.
        return NextResponse.json({ ok: true, attemptId: existing.id, resumed: true });
      }
    }
  }

  try {
    const attempt = await startAttempt({ testId: id, userId });
    return NextResponse.json({ ok: true, attemptId: attempt.id, resumed: false });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
