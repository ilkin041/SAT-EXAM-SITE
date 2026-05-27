import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorizeAttemptMutation } from "@/lib/attempt-auth";

const patchSchema = z.object({
  color: z.enum(["YELLOW", "BLUE", "PINK"]).optional(),
  note: z.string().max(2000).nullable().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; annotationId: string }> },
) {
  const { id, annotationId } = await ctx.params;
  const auth = await authorizeAttemptMutation(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await prisma.annotation.findUnique({ where: { id: annotationId } });
  if (!existing || existing.attemptId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.annotation.update({
    where: { id: annotationId },
    data: parsed.data,
  });
  return NextResponse.json({ ok: true, annotation: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; annotationId: string }> },
) {
  const { id, annotationId } = await ctx.params;
  const auth = await authorizeAttemptMutation(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const existing = await prisma.annotation.findUnique({ where: { id: annotationId } });
  if (!existing || existing.attemptId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.annotation.delete({ where: { id: annotationId } });
  return NextResponse.json({ ok: true });
}
