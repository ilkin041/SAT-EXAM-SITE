import { NextResponse } from "next/server";
import { endBreakAndStartModule } from "@/lib/attempt-engine";
import { authorizeAttemptMutation } from "@/lib/attempt-auth";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await authorizeAttemptMutation(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    await endBreakAndStartModule(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
