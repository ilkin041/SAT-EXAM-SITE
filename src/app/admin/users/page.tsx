import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format-date";
import { orderByFrom, readTableParams } from "@/lib/table-params";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { UsersTable, type UserRow } from "./_components/users-table";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({ title: "Users — Admin", path: "/admin/users", noindex: true });

const PAGE_SIZE = 25;

/** Whitelisted orderings for `?sort=` — see `orderByFrom`. */
const ORDERINGS: Record<
  string,
  (dir: "asc" | "desc") => Prisma.UserOrderByWithRelationInput
> = {
  name: (dir) => ({ name: dir }),
  email: (dir) => ({ email: dir }),
  role: (dir) => ({ role: dir }),
  joined: (dir) => ({ createdAt: dir }),
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { q, sort, dir, page: requestedPage } = readTableParams(sp);
  const role = sp.role === "ADMIN" || sp.role === "STUDENT" ? sp.role : undefined;

  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }
  if (role) where.role = role;

  // Count first, then clamp — a hand-edited `?page=` past the end would
  // otherwise return no rows while the table believed it was on the last page.
  const total = await prisma.user.count({ where });
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));

  const users = await prisma.user.findMany({
    where,
    orderBy: orderByFrom(sort, dir, ORDERINGS, "joined"),
    include: { _count: { select: { attempts: true } } },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const rows: UserRow[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    attemptCount: user._count.attempts,
    joined: formatDate(user.createdAt),
  }));

  return (
    <>
      <PageHeader
        title="Users"
        description="All registered students and administrators."
      />

      <UsersTable rows={rows} total={total} pageSize={PAGE_SIZE} role={role} />
    </>
  );
}
