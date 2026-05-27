import { NextResponse } from "next/server";
import { z } from "zod";
import { saveAnswer } from "@/lib/attempt-engine";
import { authorizeAttemptMutation } from "@/lib/attempt-auth";

const schema = z.object({
  questionId: z.string(),
  response: z.string().default(""),
  isMarkedForReview: z.boolean().default(false),
  eliminatedChoices: z.array(z.enum(["A", "B", "C", "D"])).default([]),
  timeSpent: z.number().int().min(0).max(60 * 60 * 4).default(0),
  currentQuestionIndex: z.number().int().min(0).optional(),
});

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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await saveAnswer({ attemptId: id, ...parsed.data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
