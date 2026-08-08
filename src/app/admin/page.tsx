import Link from "next/link";
import { BookOpen, FileText, Users, Activity } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format-date";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableEmpty,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";

export const metadata = { title: "Admin — SAT Practice" };

export default async function AdminDashboard() {
  const [testCount, questionCount, studentCount, attemptCount, recentAttempts] =
    await Promise.all([
      prisma.test.count(),
      prisma.question.count(),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.testAttempt.count(),
      prisma.testAttempt.findMany({
        orderBy: { startedAt: "desc" },
        take: 8,
        include: {
          user: { select: { email: true, name: true } },
          test: { select: { title: true } },
        },
      }),
    ]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your tests, questions, students, and recent attempts."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
        <StatCard label="Tests" value={testCount} icon={FileText} accentColor="blue" />
        <StatCard label="Questions" value={questionCount} icon={BookOpen} accentColor="violet" />
        <StatCard label="Students" value={studentCount} icon={Users} accentColor="emerald" />
        <StatCard label="Attempts" value={attemptCount} icon={Activity} accentColor="amber" />
      </div>

      <section className="mt-10 animate-fade-in">
        <div className="mb-4 flex items-baseline justify-between border-b border-border/40 pb-3">
          <h2 className="text-h3 text-foreground">Recent Attempts</h2>
          <Link
            href="/admin/attempts"
            className="text-caption font-semibold text-primary hover:underline"
          >
            View all attempts →
          </Link>
        </div>

        {/*
          `Table` rather than `DataTable` (T1.9): this is the eight most recent
          attempts, not the list of them. Searching or paging a deliberately
          truncated window would be lying about what it holds — "View all
          attempts" above is the surface that does that, and it is a `DataTable`.
          Staying on the primitives also keeps the admin landing page free of
          client JavaScript.
        */}
        <Table>
          <THead>
            <TR>
              <TH>Student</TH>
              <TH>Test name</TH>
              <TH>Status</TH>
              <TH hideBelow="sm">Started at</TH>
            </TR>
          </THead>
          <TBody>
            {recentAttempts.length === 0 ? (
              <TableEmpty
                colSpan={4}
                icon={Activity}
                title="No attempts yet"
                description="When students start taking tests, recent activity will show up here."
              />
            ) : (
              recentAttempts.map((a) => (
                <TR key={a.id}>
                  <TD>
                    <Link
                      href={`/admin/attempts/${a.id}`}
                      className="font-semibold text-foreground transition-colors hover:text-primary"
                    >
                      {a.user?.name ?? a.user?.email ?? (
                        <span className="font-normal italic text-muted-foreground">
                          anonymous
                        </span>
                      )}
                    </Link>
                  </TD>
                  <TD className="font-medium text-foreground">{a.test.title}</TD>
                  <TD>
                    <Badge
                      variant={
                        a.status === "COMPLETED"
                          ? "success"
                          : a.status === "IN_PROGRESS"
                            ? "warning"
                            : "muted"
                      }
                      className={a.status === "IN_PROGRESS" ? "animate-pulse" : undefined}
                    >
                      {a.status === "IN_PROGRESS"
                        ? "In progress"
                        : a.status === "COMPLETED"
                          ? "Completed"
                          : a.status === "EXPIRED"
                            ? "Expired"
                            : "Abandoned"}
                    </Badge>
                  </TD>
                  <TD hideBelow="sm" className="text-caption text-muted-foreground">
                    {formatDateTime(a.startedAt)}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </section>
    </>
  );
}
