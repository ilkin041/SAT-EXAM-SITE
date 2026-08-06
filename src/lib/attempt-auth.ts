import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasAnonymousAttemptCookie } from "@/lib/anonymous-attempt";

export async function canAccessAttempt(
  user: { id?: string; role?: string } | null | undefined,
  attempt: { id: string; userId: string | null; test: { isPublic: boolean } },
) {
  if (user?.role === "ADMIN") return true;
  if (attempt.userId) return user?.id === attempt.userId;
  return attempt.test.isPublic && hasAnonymousAttemptCookie(attempt.id);
}

/**
 * Authorize a request to mutate an attempt: must be the attempt's owner,
 * an admin, or the holder of the signed cookie for an anonymous public attempt.
 */
export async function authorizeAttemptMutation(attemptId: string) {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: { test: true },
  });
  if (!attempt) return { ok: false as const, status: 404, error: "Not found" };

  const session = await auth();
  if (!(await canAccessAttempt(session?.user, attempt))) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }
  return { ok: true as const, attempt };
}
