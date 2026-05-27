import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadAttemptState } from "@/lib/attempt-engine";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await auth();

  const attempt = await prisma.testAttempt.findUnique({
    where: { id },
    include: { test: true },
  });
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Authorization: owner OR admin OR public+anonymous attempt.
  const isOwner = attempt.userId && session?.user?.id === attempt.userId;
  const isAdmin = session?.user?.role === "ADMIN";
  const isAnonymousPublic = !attempt.userId && attempt.test.isPublic;
  if (!isOwner && !isAdmin && !isAnonymousPublic) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (attempt.status === "COMPLETED") {
    return NextResponse.json({ ok: true, completed: true, attemptId: attempt.id });
  }

  const state = await loadAttemptState(id);
  if (!state) return NextResponse.json({ ok: true, completed: true, attemptId: attempt.id });
  return NextResponse.json({ ok: true, state });
}
