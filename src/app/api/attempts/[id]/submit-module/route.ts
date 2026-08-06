import { NextResponse } from "next/server";
import { AttemptMutationError, submitCurrentModule } from "@/lib/attempt-engine";
import { authorizeAttemptMutation } from "@/lib/attempt-auth";
import { z } from "zod";

const bodySchema = z.object({ moduleId: z.string().min(1) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorizeAttemptMutation(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "moduleId is required" }, { status: 400 });
    }
    const result = await submitCurrentModule(id, parsed.data.moduleId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof AttemptMutationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
