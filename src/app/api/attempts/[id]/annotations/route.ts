import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorizeAttemptMutation } from "@/lib/attempt-auth";

const createSchema = z.object({
  questionId: z.string().min(1),
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(1),
  text: z.string().min(1).max(2000),
  color: z.enum(["YELLOW", "BLUE", "PINK"]),
  note: z.string().max(2000).optional().nullable(),
});

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorizeAttemptMutation(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const questionId = url.searchParams.get("questionId");
  const annotations = await prisma.annotation.findMany({
    where: questionId ? { attemptId: id, questionId } : { attemptId: id },
    orderBy: { startOffset: "asc" },
  });
  return NextResponse.json({ ok: true, annotations });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorizeAttemptMutation(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (parsed.data.endOffset <= parsed.data.startOffset) {
    return NextResponse.json(
      { error: "endOffset must be greater than startOffset" },
      { status: 400 },
    );
  }

  const annotation = await prisma.annotation.create({
    data: { attemptId: id, ...parsed.data },
  });
  return NextResponse.json({ ok: true, annotation });
}
