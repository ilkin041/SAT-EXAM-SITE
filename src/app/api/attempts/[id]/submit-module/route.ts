import { NextResponse } from "next/server";
import { AttemptMutationError, submitCurrentModule } from "@/lib/attempt-engine";
import { authorizeAttemptMutation } from "@/lib/attempt-auth";
import { track } from "@/lib/track";
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
    // A repeat request for a module the attempt has already left is a
    // deliberate no-op inside `submitCurrentModule` — it returns the winner's
    // result rather than scoring anything. The engine does not report which of
    // the two happened, so read the state we already loaded: this request only
    // advances the attempt if the module it names is still the current one.
    //
    // Two genuinely simultaneous first submissions can both pass this check and
    // both record; one of them loses the transaction. That is a rare
    // over-count, and it is the direction to err in — the alternative is a
    // read-modify-write on the analytics table inside the request.
    const advances = auth.attempt.currentModuleId === parsed.data.moduleId;
    const result = await submitCurrentModule(id, parsed.data.moduleId);

    if (advances) {
      void track("module_completed", {
        userId: auth.attempt.userId,
        props: {
          attemptId: id,
          moduleId: parsed.data.moduleId,
          testId: auth.attempt.testId,
          outcome: result.status,
        },
      });
      if (result.status === "completed") {
        void track("attempt_submitted", {
          userId: auth.attempt.userId,
          props: { attemptId: id, testId: auth.attempt.testId },
        });
      }
    }

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
