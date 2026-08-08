import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createGroup } from "./actions";
import { GroupsTable, type GroupRow } from "./_components/groups-table";

export const metadata = { title: "Groups — Admin" };

export default async function AdminGroupsPage() {
  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { users: true, tests: true } },
    },
  });

  const rows: GroupRow[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    studentCount: group._count.users,
    testCount: group._count.tests,
  }));

  return (
    <>
      <PageHeader
        title="Student Groups"
        description="Create cohorts or classes to easily assign tests to specific groups of students."
      />

      <div className="mb-8 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-h3">Create New Group</h3>
        <form action={createGroup} className="flex flex-col gap-3 sm:flex-row">
          <Input
            type="text"
            name="name"
            required
            aria-label="Group name"
            placeholder="Group Name (e.g. Fall 2026 Cohort)"
            className="flex-1"
          />
          <Input
            type="text"
            name="description"
            aria-label="Group description"
            placeholder="Optional description"
            className="flex-1"
          />
          <Button type="submit">Create Group</Button>
        </form>
      </div>

      <GroupsTable rows={rows} />
    </>
  );
}
