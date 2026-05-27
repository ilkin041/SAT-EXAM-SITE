import Link from "next/link";
import { BookOpen, FileText, Users, Activity } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tests" value={testCount} icon={FileText} />
        <StatCard label="Questions" value={questionCount} icon={BookOpen} />
        <StatCard label="Students" value={studentCount} icon={Users} />
        <StatCard label="Attempts" value={attemptCount} icon={Activity} />
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recent attempts</h2>
          <Link
            href="/admin/attempts"
            className="text-xs font-medium text-primary hover:underline"
          >
            View all →
          </Link>
        </div>

        {recentAttempts.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No attempts yet"
            description="When students start taking tests, recent activity will show up here."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Student</th>
                  <th className="px-4 py-2.5 font-medium">Test</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentAttempts.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-accent/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/attempts/${a.id}`}
                        className="font-medium hover:underline"
                      >
                        {a.user?.name ?? a.user?.email ?? (
                          <span className="italic text-muted-foreground">anonymous</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{a.test.title}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          a.status === "COMPLETED"
                            ? "success"
                            : a.status === "IN_PROGRESS"
                              ? "warning"
                              : "muted"
                        }
                      >
                        {a.status === "IN_PROGRESS"
                          ? "In progress"
                          : a.status === "COMPLETED"
                            ? "Completed"
                            : "Abandoned"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {a.startedAt.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
