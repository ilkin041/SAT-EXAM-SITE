import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  addStudentToGroup,
  removeStudentFromGroup,
  assignTestToGroup,
  removeTestFromGroup,
} from "../actions";

export default async function GroupDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      users: { orderBy: { email: "asc" } },
      tests: { orderBy: { title: "asc" } },
    },
  });

  if (!group) notFound();

  // Fetch all available tests to populate the select dropdown
  const allTests = await prisma.test.findMany({
    orderBy: { title: "asc" },
  });

  const unassignedTests = allTests.filter(
    (t) => !group.tests.some((gt) => gt.id === t.id)
  );

  return (
    <>
      <div className="mb-4">
        <Link
          href="/admin/groups"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Groups
        </Link>
      </div>

      <PageHeader
        title={group.name}
        description={group.description ?? "Manage students and tests for this group."}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* --- STUDENTS --- */}
        <section>
          <h2 className="mb-4 text-xl font-bold tracking-tight">Students</h2>
          
          <div className="mb-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold">Add Student</h3>
            <form action={addStudentToGroup.bind(null, group.id)} className="flex gap-2">
              <input
                type="email"
                name="email"
                required
                placeholder="Student email address"
                className="flex-1 rounded-xl border border-input/80 bg-card px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button type="submit" size="sm">Add</Button>
            </form>
          </div>

          {group.users.length === 0 ? (
            <EmptyState
              icon={User}
              title="No students"
              description="Add students by email to give them access to this group's tests."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name / Email</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {group.users.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{u.name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <form action={removeStudentFromGroup.bind(null, group.id, u.id)}>
                          <Button type="submit" variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
                            Remove
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* --- TESTS --- */}
        <section>
          <h2 className="mb-4 text-xl font-bold tracking-tight">Assigned Tests</h2>
          
          <div className="mb-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold">Assign Test</h3>
            <form action={assignTestToGroup.bind(null, group.id)} className="flex gap-2">
              <select
                name="testId"
                required
                className="flex-1 rounded-xl border border-input/80 bg-card px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select a test to assign...</option>
                {unassignedTests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm">Assign</Button>
            </form>
          </div>

          {group.tests.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No tests assigned"
              description="Assign tests to make them visible to students in this group."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Test Title</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {group.tests.map((t) => (
                    <tr key={t.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{t.title}</td>
                      <td className="px-4 py-3 text-right">
                        <form action={removeTestFromGroup.bind(null, group.id, t.id)}>
                          <Button type="submit" variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
                            Remove
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
