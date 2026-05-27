import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * Authorize a request to mutate an attempt: must be the attempt's owner,
 * an admin, or an anonymous attempt on a public test. Throws on failure.
 */
export async function authorizeAttemptMutation(attemptId: string) {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: { test: true },
  });
  if (!attempt) return { ok: false as const, status: 404, error: "Not found" };

  const session = await auth();
  const isOwner = attempt.userId && session?.user?.id === attempt.userId;
  const isAdmin = session?.user?.role === "ADMIN";
  const isAnonymousPublic = !attempt.userId && attempt.test.isPublic;

  if (!isOwner && !isAdmin && !isAnonymousPublic) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }
  return { ok: true as const, attempt };
}
