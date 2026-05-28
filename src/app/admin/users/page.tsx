import Link from "next/link";
import { Search, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Users — Admin" };

const SELECT_CLS =
  "h-10 rounded-md border border-input bg-card px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface SearchParams {
  q?: string;
  role?: string;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const where: Record<string, unknown> = {};
  if (sp.q) {
    where.OR = [
      { email: { contains: sp.q, mode: "insensitive" } },
      { name: { contains: sp.q, mode: "insensitive" } },
    ];
  }
  if (sp.role === "ADMIN" || sp.role === "STUDENT") {
    where.role = sp.role;
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { attempts: true } } },
    take: 100,
  });

  const hasFilter = !!(sp.q || sp.role);

  return (
    <>
      <PageHeader
        title="Users"
        description="All registered students and administrators."
      />

      <form className="mb-6 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search by name or email…"
              className="pl-9"
            />
          </div>
          <select name="role" defaultValue={sp.role ?? ""} className={SELECT_CLS}>
            <option value="">All roles</option>
            <option value="STUDENT">Students</option>
            <option value="ADMIN">Admins</option>
          </select>
          <Button type="submit">Filter</Button>
        </div>
      </form>

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasFilter ? "No users match" : "No users yet"}
          description={
            hasFilter
              ? "Try clearing some filters or broadening your search."
              : "Students who sign up will appear here."
          }
          action={
            hasFilter ? (
              <Button asChild variant="secondary">
                <Link href="/admin/users">Clear filters</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 text-right font-medium">Attempts</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="font-medium hover:underline"
                    >
                      {u.name || (
                        <span className="italic text-muted-foreground">No name</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === "ADMIN" ? "info" : "muted"}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {u._count.attempts}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/admin/users/${u.id}`}>Open</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
