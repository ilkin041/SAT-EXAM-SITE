import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorizeAttemptMutation } from "@/lib/attempt-auth";

const eventSchema = z.object({
  type: z.enum(["blur", "focus", "fullscreen_exit", "fullscreen_enter"]),
  at: z.number().int().positive().max(8_640_000_000_000_000),
});

const EVENT_TYPE = {
  blur: "BLUR",
  focus: "FOCUS",
  fullscreen_exit: "FULLSCREEN_EXIT",
  fullscreen_enter: "FULLSCREEN_ENTER",
} as const;

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

  await prisma.attemptEvent.create({
    data: {
      attemptId: id,
      type: EVENT_TYPE[parsed.data.type],
      occurredAt: new Date(parsed.data.at),
    },
  });

  return NextResponse.json({ ok: true });
}
