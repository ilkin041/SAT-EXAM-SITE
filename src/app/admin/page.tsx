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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
        <StatCard label="Tests" value={testCount} icon={FileText} accentColor="blue" />
        <StatCard label="Questions" value={questionCount} icon={BookOpen} accentColor="violet" />
        <StatCard label="Students" value={studentCount} icon={Users} accentColor="emerald" />
        <StatCard label="Attempts" value={attemptCount} icon={Activity} accentColor="amber" />
      </div>

      <section className="mt-10 animate-fade-in">
        <div className="mb-4 flex items-baseline justify-between border-b border-border/40 pb-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Recent Attempts</h2>
          <Link
            href="/admin/attempts"
            className="text-xs font-semibold text-primary hover:underline"
          >
            View all attempts →
          </Link>
        </div>

        {recentAttempts.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No attempts yet"
            description="When students start taking tests, recent activity will show up here."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Student</th>
                    <th className="px-6 py-4 font-semibold">Test Name</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Started At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {recentAttempts.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/attempts/${a.id}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors"
                        >
                          {a.user?.name ?? a.user?.email ?? (
                            <span className="italic text-muted-foreground font-normal">anonymous</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">{a.test.title}</td>
                      <td className="px-6 py-4">
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
                              : "Abandoned"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {a.startedAt.toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
