import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadAttemptState } from "@/lib/attempt-engine";
import { canAccessTest } from "@/lib/test-access";
import { canAccessAttempt } from "@/lib/attempt-auth";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await auth();

  const attempt = await prisma.testAttempt.findUnique({
    where: { id },
    include: { test: true },
  });
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await canAccessAttempt(session?.user, attempt))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await canAccessTest(session?.user, attempt.test))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (attempt.status === "COMPLETED") {
    return NextResponse.json({ ok: true, completed: true, attemptId: attempt.id });
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { ok: false, closed: true, status: attempt.status, attemptId: attempt.id },
      { status: 410 },
    );
  }

  const state = await loadAttemptState(id, session?.user);
  if (!state) {
    const closed = await prisma.testAttempt.findUnique({
      where: { id },
      select: { status: true },
    });
    if (closed?.status === "COMPLETED") {
      return NextResponse.json({ ok: true, completed: true, attemptId: attempt.id });
    }
    return NextResponse.json(
      { ok: false, closed: true, status: closed?.status, attemptId: attempt.id },
      { status: 410 },
    );
  }
  return NextResponse.json({ ok: true, state });
}
