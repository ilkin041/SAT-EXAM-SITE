import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startAttempt } from "@/lib/attempt-engine";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await auth();
  const test = await prisma.test.findUnique({ where: { id } });
  if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });
  if (!session?.user && !test.isPublic) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    const attempt = await startAttempt({
      testId: id,
      userId: session?.user?.id ?? null,
    });
    return NextResponse.json({ ok: true, attemptId: attempt.id });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
