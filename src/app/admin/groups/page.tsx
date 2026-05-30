import Link from "next/link";
import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createGroup, deleteGroup } from "./actions";

export const metadata = { title: "Groups — Admin" };

export default async function AdminGroupsPage() {
  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { users: true, tests: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Student Groups"
        description="Create cohorts or classes to easily assign tests to specific groups of students."
      />

      <div className="mb-8 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Create New Group</h3>
        <form action={createGroup} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            name="name"
            required
            placeholder="Group Name (e.g. Fall 2026 Cohort)"
            className="flex-1 rounded-xl border border-input/80 bg-card px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="text"
            name="description"
            placeholder="Optional description"
            className="flex-1 rounded-xl border border-input/80 bg-card px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button type="submit">Create Group</Button>
        </form>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No groups found"
          description="Create your first group above to start organizing students."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-semibold">Group Name</th>
                <th className="px-6 py-4 font-semibold">Description</th>
                <th className="px-6 py-4 text-center font-semibold">Students</th>
                <th className="px-6 py-4 text-center font-semibold">Assigned Tests</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {groups.map((group) => (
                <tr key={group.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium text-foreground">{group.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{group.description || "—"}</td>
                  <td className="px-6 py-4 text-center tabular-nums text-foreground font-semibold">
                    {group._count.users}
                  </td>
                  <td className="px-6 py-4 text-center tabular-nums text-foreground font-semibold">
                    {group._count.tests}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/admin/groups/${group.id}`}>Manage</Link>
                      </Button>
                      <form action={deleteGroup.bind(null, group.id)}>
                        <Button type="submit" variant="destructive" size="sm">Delete</Button>
                      </form>
                    </div>
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
