import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeAttemptMutation } from "@/lib/attempt-auth";

const eventSchema = z.object({
  type: z.enum(["blur", "focus", "fullscreen_exit", "fullscreen_enter"]),
  at: z.number().int().positive(),
});

type FocusEvent = z.infer<typeof eventSchema>;

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
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Append to focusEvents JSON array. Keep the last ~200 events to bound size.
  const existing = (auth.attempt.focusEvents as FocusEvent[] | null) ?? [];
  const next = [...existing, parsed.data].slice(-200);

  await prisma.testAttempt.update({
    where: { id },
    data: { focusEvents: next as unknown as Prisma.InputJsonValue },
  });

  return NextResponse.json({ ok: true });
}
