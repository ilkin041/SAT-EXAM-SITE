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
      where: {
        OR: [
          { isPublic: true },
          { createdById: user.id },
          { groups: { some: { users: { some: { id: user.id } } } } },
        ],
      },
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

  // Pre-calculate completed attempts for stats
  const completedAttemptsData = attempts
    .filter((a) => a.status === "COMPLETED")
    .map((a) => {
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
      return scaled.total;
    });

  const completedCount = completedAttemptsData.length;
  const avgScore = completedCount > 0
    ? Math.round(completedAttemptsData.reduce((sum, s) => sum + s, 0) / completedCount)
    : null;
  const bestScore = completedCount > 0
    ? Math.max(...completedAttemptsData)
    : null;

  return (
    <>
      <StudentNav />
      <main className="container mx-auto max-w-6xl px-4 py-10 animate-fade-in">
        {/* Welcome Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero border border-border/50 p-6 md:p-8 mb-10 shadow-sm">
          {/* Decorative blurred blobs */}
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute right-20 -bottom-10 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
          <div
            className="absolute inset-0 opacity-[0.02] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-primary/10 text-primary mb-3">
                Student Dashboard
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                Welcome back, <span className="text-gradient-primary">{displayName}</span>
              </h1>
              <p className="mt-2.5 text-sm md:text-base text-muted-foreground leading-relaxed">
                {completedCount === 0
                  ? "Kickstart your prep today! Choose one of the available practice tests below to benchmark your score."
                  : `You are making steady progress! You have completed ${completedCount} test${completedCount === 1 ? "" : "s"}. Analyze your attempts to fine-tune your performance.`}
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 min-w-[280px] md:min-w-[360px]">
              {/* Stat 1: Completed */}
              <div className="glass rounded-2xl p-4 border border-border/40 text-center shadow-xs">
                <span className="block text-2xl md:text-3xl font-extrabold text-foreground">{completedCount}</span>
                <span className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1">Tests Done</span>
              </div>
              {/* Stat 2: Avg Score */}
              <div className="glass rounded-2xl p-4 border border-border/40 text-center shadow-xs">
                <span className="block text-2xl md:text-3xl font-extrabold text-gradient-primary">
                  {avgScore !== null ? avgScore : "—"}
                </span>
                <span className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1">Avg Score</span>
              </div>
              {/* Stat 3: Best Score */}
              <div className="glass rounded-2xl p-4 border border-border/40 text-center shadow-xs">
                <span className="block text-2xl md:text-3xl font-extrabold text-gradient-accent">
                  {bestScore !== null ? bestScore : "—"}
                </span>
                <span className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1">Best Score</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex-1" />
          {user.role === "ADMIN" && (
            <Button asChild variant="secondary" size="sm" className="hover-lift active-press">
              <Link href="/admin">
                <ShieldCheck className="h-4 w-4" />
                Admin panel
              </Link>
            </Button>
          )}
        </div>

        {/* ----- Available tests ----- */}
        <section className="mb-14">
          <div className="mb-6 flex items-baseline justify-between border-b border-border/40 pb-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Available Practice Tests</h2>
            <span className="text-xs font-semibold text-muted-foreground bg-secondary px-3 py-1 rounded-full border border-border/20">
              {tests.length} Total
            </span>
          </div>

          {tests.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No tests available yet"
              description="Once an admin publishes a practice test, it'll show up here."
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
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
        <section className="mb-6">
          <div className="mb-6 flex items-baseline justify-between border-b border-border/40 pb-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">My Practice History</h2>
            <span className="text-xs font-semibold text-muted-foreground bg-secondary px-3 py-1 rounded-full border border-border/20">
              {attempts.length} Attempt{attempts.length === 1 ? "" : "s"}
            </span>
          </div>

          {attempts.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="You haven't taken any tests yet"
              description="Start one of the practice tests above to see your results here."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Test Name</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold text-center">Score</th>
                      <th className="px-6 py-4 font-semibold">Date Started</th>
                      <th className="px-6 py-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
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
                        <tr key={a.id} className="transition-colors hover:bg-muted/30">
                          <td className="px-6 py-4.5 font-semibold text-foreground">{a.test.title}</td>
                          <td className="px-6 py-4.5">
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
                          <td className="px-6 py-4.5 text-center tabular-nums">
                            {isDone ? (
                              <span className="inline-flex items-center justify-center font-extrabold px-3 py-1 rounded-full bg-primary/10 text-primary text-xs border border-primary/20 shadow-xs">
                                {scaled.total}
                              </span>
                            ) : (
                              <span className="text-muted-foreground font-medium">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4.5 text-xs text-muted-foreground">
                            {a.startedAt.toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4.5 text-right">
                            {isDone ? (
                              <Button asChild variant="secondary" size="sm" className="hover-lift active-press shadow-xs">
                                <Link href={`/results/${a.id}`}>View results</Link>
                              </Button>
                            ) : a.status === "IN_PROGRESS" ? (
                              <Button
                                asChild
                                size="sm"
                                className="bg-gradient-warm text-white border-transparent hover:opacity-95 hover:glow-warm active-press transition-all duration-200"
                              >
                                <Link href={`/test/attempt/${a.id}`}>
                                  Continue test
                                </Link>
                              </Button>
                            ) : (
                              <Button asChild variant="secondary" size="sm" disabled className="opacity-50">
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
            </div>
          )}
        </section>
      </main>
    </>
  );
}
