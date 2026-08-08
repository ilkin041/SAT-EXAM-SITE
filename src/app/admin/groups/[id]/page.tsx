import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowLeft, TrendingUp, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScoreTrend } from "@/components/score-trend";
import {
  GroupMembersTable,
  GroupTestsTable,
  type GroupMemberRow,
  type GroupTestRow,
} from "./_components/group-tables";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { computeAttemptScorePoint } from "@/lib/analytics";
import {
  addStudentToGroup,
  assignTestToGroup,
} from "../actions";
import { pageMetadata } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const group = await prisma.group.findUnique({
    where: { id },
    select: { name: true },
  });
  // No canonical: the URL carries a group id and the page is admin-only, so a
  // self-referential canonical would point a crawler at a login redirect.
  return pageMetadata({
    title: group ? `${group.name} — Groups — Admin` : "Group — Admin",
    noindex: true,
  });
}

export default async function GroupDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      users: {
        orderBy: { email: "asc" },
        include: {
          attempts: {
            where: { status: "COMPLETED" },
            orderBy: { completedAt: "desc" },
            take: 20,
            include: {
              test: { select: { title: true } },
              moduleResults: {
                include: { module: { include: { section: { select: { type: true } } } } },
              },
            },
          },
        },
      },
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
  const memberScores = new Map<string, number[]>();
  const groupScorePoints = group.users.flatMap((member) => {
    const points = member.attempts
      .map(computeAttemptScorePoint)
      .filter((point): point is NonNullable<typeof point> => point !== null)
      .filter((point) => point.fidelity === "FULL_LENGTH");
    memberScores.set(member.id, points.map((point) => point.total));
    return points;
  });
  const groupAverage = groupScorePoints.length
    ? Math.round(groupScorePoints.reduce((sum, point) => sum + point.total, 0) / groupScorePoints.length)
    : null;
  const activeStudents = group.users.filter((member) => member.attempts.length > 0).length;
  const memberAverages = new Map<string, number | null>(
    [...memberScores].map(([memberId, scores]) => [
      memberId,
      scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : null,
    ]),
  );

  const memberRows: GroupMemberRow[] = group.users.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    completedCount: member.attempts.length,
    average: memberAverages.get(member.id) ?? null,
  }));
  const testRows: GroupTestRow[] = group.tests.map((test) => ({
    id: test.id,
    title: test.title,
  }));

  return (
    <>
      <div className="mb-4">
        <Link
          href="/admin/groups"
          className="inline-flex items-center gap-1.5 text-body text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Groups
        </Link>
      </div>

      <PageHeader
        title={group.name}
        description={group.description ?? "Manage students and tests for this group."}
      />

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Members" value={group.users.length} icon={Users} accentColor="blue" />
        <StatCard label="Students with completions" value={activeStudents} icon={Activity} accentColor="emerald" />
        <StatCard label="Full-length average" value={groupAverage ?? "—"} icon={TrendingUp} accentColor="violet" hint={`${groupScorePoints.length} scored attempts`} />
      </section>

      <section className="mb-8">
        <ScoreTrend points={groupScorePoints} admin />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* --- STUDENTS --- */}
        <section>
          <h2 className="mb-4 text-h3">Students</h2>
          
          <div className="mb-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-body font-semibold">Add Student</h3>
            <form action={addStudentToGroup.bind(null, group.id)} className="flex gap-2">
              <Input
                type="email"
                name="email"
                required
                aria-label="Student email address"
                placeholder="Student email address"
                className="flex-1"
              />
              <Button type="submit" size="sm">Add</Button>
            </form>
          </div>

          <GroupMembersTable groupId={group.id} rows={memberRows} />
        </section>

        {/* --- TESTS --- */}
        <section>
          <h2 className="mb-4 text-h3">Assigned Tests</h2>
          
          <div className="mb-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-body font-semibold">Assign Test</h3>
            <form action={assignTestToGroup.bind(null, group.id)} className="flex gap-2">
              <Select name="testId" required className="flex-1">
                <SelectTrigger
                  size="sm"
                  aria-label="Test to assign"
                  placeholder="Select a test to assign…"
                />
                <SelectContent>
                  {unassignedTests.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" size="sm">Assign</Button>
            </form>
          </div>

          <GroupTestsTable groupId={group.id} rows={testRows} />
        </section>
      </div>
    </>
  );
}
