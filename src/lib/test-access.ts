import { prisma } from "@/lib/prisma";

export interface TestAccessUser {
  id: string;
}

export interface TestAccessTarget {
  id: string;
  isPublic: boolean;
  createdById: string | null;
}

/**
 * Product authorization boundary for tests. Visibility in a list is not
 * sufficient: every entry point must enforce this predicate server-side.
 */
export async function canAccessTest(
  user: TestAccessUser | null | undefined,
  test: TestAccessTarget,
): Promise<boolean> {
  if (test.isPublic) return true;
  if (!user) return false;
  if (test.createdById === user.id) return true;

  const assignment = await prisma.test.count({
    where: {
      id: test.id,
      groups: { some: { users: { some: { id: user.id } } } },
    },
  });
  return assignment > 0;
}
