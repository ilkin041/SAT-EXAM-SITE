import Link from "next/link";
import { BookOpen, ClipboardList, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { StudentNav } from "@/components/student-nav";
import { TestCard } from "@/components/test-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  computeRawScores,
  computeScaledScores,
  type ScoringTable,
} from "@/lib/scoring";

export const metadata = { title: "Dashboard — SAT Practice" };

export default async function DashboardPage() {
  const user = await requireUser();

  const [tests, attempts, inProgress] = await Promise.all([
    prisma.test.findMany({
      where: { OR: [{ isPublic: true }, { createdById: user.id }] },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        sections: {
          include: {
            modules: { include: { _count: { select: { moduleQuestions: true } } } },
          },
        },
      },
    }),
    prisma.testAttempt.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      take: 10,
      include: {
        test: { select: { title: true, scoringTable: true } },
        moduleResults: {
          include: { module: { include: { section: { select: { type: true } } } } },
        },
      },
    }),
    // Map of testId → most-recent IN_PROGRESS attemptId for this user. Used
    // by the dashboard test cards to switch from "Start test" → "Continue".
    prisma.testAttempt.findMany({
      where: { userId: user.id, status: "IN_PROGRESS" },
      orderBy: { startedAt: "desc" },
      select: { id: true, testId: true },
    }),
  ]);

  const inProgressByTest = new Map<string, string>();
  for (const a of inProgress) {
    if (!inProgressByTest.has(a.testId)) inProgressByTest.set(a.testId, a.id);
  }

  const displayName = user.name?.trim() || user.email?.split("@")[0] || "there";

  return (
    <>
      <StudentNav />
      <main className="container mx-auto max-w-6xl px-4 py-10">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Welcome back, {displayName}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Pick up where you left off or start a new practice test.
            </p>
          </div>
          {user.role === "ADMIN" && (
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin">
                <ShieldCheck className="h-4 w-4" />
                Admin panel
              </Link>
            </Button>
          )}
        </div>

        {/* ----- Available tests ----- */}
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Available tests</h2>
            <span className="text-xs text-muted-foreground">
              {tests.length} test{tests.length === 1 ? "" : "s"}
            </span>
          </div>

          {tests.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No tests available yet"
              description="Once an admin publishes a practice test, it'll show up here."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {tests.map((t) => {
                const totalQ = t.sections
                  .flatMap((s) => s.modules)
                  .reduce((sum, m) => sum + m._count.moduleQuestions, 0);
                return (
                  <TestCard
                    key={t.id}
                    testId={t.id}
                    title={t.title}
                    description={t.description}
                    mode={t.mode}
                    sectionCount={t.sections.length}
                    questionCount={totalQ}
                    inProgressAttemptId={inProgressByTest.get(t.id) ?? null}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* ----- Past attempts ----- */}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">My past attempts</h2>
            <span className="text-xs text-muted-foreground">
              {attempts.length} attempt{attempts.length === 1 ? "" : "s"}
            </span>
          </div>

          {attempts.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="You haven't taken any tests yet"
              description="Start one of the practice tests above to see your results here."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Test</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium">Score</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {attempts.map((a) => {
                    const liveResults = a.moduleResults.filter(
                      (r) => r.module && r.module.section,
                    );
                    const moduleResults = liveResults.map((r) => ({
                      sectionType: r.module.section.type,
                      correctCount: r.correctCount,
                      totalCount: r.totalCount,
                    }));
                    const raw = computeRawScores(moduleResults);
                    const scaled = computeScaledScores(
                      raw,
                      (a.test.scoringTable as ScoringTable | null) ?? null,
                    );
                    const isDone = a.status === "COMPLETED";
                    return (
                      <tr key={a.id} className="transition-colors hover:bg-accent/40">
                        <td className="px-4 py-3 font-medium">{a.test.title}</td>
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
                        <td className="px-4 py-3 text-right tabular-nums">
                          {isDone ? (
                            <span className="font-semibold">{scaled.total}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {a.startedAt.toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isDone ? (
                            <Button asChild variant="secondary" size="sm">
                              <Link href={`/results/${a.id}`}>View results</Link>
                            </Button>
                          ) : a.status === "IN_PROGRESS" ? (
                            <Button
                              asChild
                              size="sm"
                              className="bg-amber-600 text-white hover:bg-amber-600/90"
                            >
                              <Link href={`/test/attempt/${a.id}`}>
                                Continue test
                              </Link>
                            </Button>
                          ) : (
                            <Button asChild variant="secondary" size="sm" disabled>
                              <Link href={`/results/${a.id}`}>Abandoned</Link>
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
