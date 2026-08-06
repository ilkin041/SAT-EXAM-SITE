import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class AttemptTransitionConflict extends Error {
  constructor() {
    super("Attempt state changed before this transition completed");
    this.name = "AttemptTransitionConflict";
  }
}

/** Serialize lifecycle decisions for one attempt inside an interactive transaction. */
export async function lockAttempt(tx: Prisma.TransactionClient, attemptId: string) {
  // Transaction-scoped advisory locks work through Neon/PgBouncer without
  // relying on a connection's search_path for an unqualified table name.
  await tx.$queryRaw<Array<{ locked: string }>>`
    SELECT pg_advisory_xact_lock(hashtext(${attemptId}))::text AS "locked"
  `;
}

/**
 * The single guarded writer for an existing attempt's lifecycle fields.
 * `expectedModuleId` doubles as submit's idempotency/version token.
 */
export async function transitionAttempt(
  tx: Prisma.TransactionClient,
  params: {
    attemptId: string;
    expectedStatus: "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "EXPIRED";
    expectedModuleId?: string | null;
    data: Prisma.TestAttemptUpdateManyMutationInput;
  },
) {
  const result = await tx.testAttempt.updateMany({
    where: {
      id: params.attemptId,
      status: params.expectedStatus,
      ...(params.expectedModuleId !== undefined
        ? { currentModuleId: params.expectedModuleId }
        : {}),
    },
    data: params.data,
  });
  if (result.count !== 1) throw new AttemptTransitionConflict();
}

export async function abandonAttempt(attemptId: string) {
  return prisma.$transaction(async (tx) => {
    await lockAttempt(tx, attemptId);
    const attempt = await tx.testAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.status !== "IN_PROGRESS") return false;
    await transitionAttempt(tx, {
      attemptId,
      expectedStatus: "IN_PROGRESS",
      expectedModuleId: attempt.currentModuleId,
      data: {
        status: "ABANDONED",
        completedAt: new Date(),
        currentSectionId: null,
        currentModuleId: null,
        moduleStartedAt: null,
        moduleDeadlineAt: null,
        breakStartedAt: null,
      },
    });
    return true;
  });
}
