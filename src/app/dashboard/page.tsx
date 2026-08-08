import Link from "next/link";
import { formatDate } from "@/lib/format-date";
import { BookOpen, ClipboardList, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { StudentNav } from "@/components/student-nav";
import { TestCard } from "@/components/test-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ScoreTrend } from "@/components/score-trend";
import { AbandonedRows } from "./abandoned-rows";
import { computeAttemptScorePoint } from "@/lib/analytics";
import {
  computeAttemptRoutes,
  computeRawScores,
  computeScaledScores,
  getScoreFidelity,
} from "@/lib/scoring";

export const metadata = { title: "Dashboard — SAT Practice" };

/** Named so `HistoryAttempt` below can be derived from the query's own shape. */
function fetchAttempts(userId: string) {
  return prisma.testAttempt.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take: 10,
    include: {
      test: { select: { title: true } },
      moduleResults: {
        include: { module: { include: { section: { select: { type: true } } } } },
      },
    },
  });
}

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
    fetchAttempts(user.id),
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

  // Abandoned attempts are noise in the history table — they carry no score and
  // no action. They keep their place in the count but collapse behind a
  // disclosure row at the bottom.
  const abandonedAttempts = attempts.filter((a) => a.status === "ABANDONED");
  const activeAttempts = attempts.filter((a) => a.status !== "ABANDONED");

  // Pre-calculate completed attempts for stats
  const completedAttempts = attempts.filter((a) => a.status === "COMPLETED");
  const scorePoints = completedAttempts
    .map(computeAttemptScorePoint)
    .filter((point): point is NonNullable<typeof point> => point !== null);
  const fullLengthPoints = scorePoints.filter((point) => point.fidelity === "FULL_LENGTH");
  const completedAttemptsData = fullLengthPoints.map((point) => point.total);

  const completedCount = completedAttempts.length;
  const avgScore = completedAttemptsData.length > 0
    ? Math.round(completedAttemptsData.reduce((sum, s) => sum + s, 0) / completedAttemptsData.length)
    : null;
  const bestScore = completedAttemptsData.length > 0
    ? Math.max(...completedAttemptsData)
    : null;

  return (
    <>
      <StudentNav />
      <main className="container mx-auto max-w-6xl px-4 py-10 animate-fade-in">
        {/* Welcome Hero Banner */}
        {/*
          T1.8: the banner was `bg-gradient-hero`. The page's one gradient is
          the warm "Continue test" in the history table below — resume is the
          only thing here the policy lets a gradient mean — so the banner is a
          recessed sheet instead.
        */}
        <div className="relative overflow-hidden rounded-3xl bg-paper-sunk border border-border/50 p-6 md:p-8 mb-10 shadow-sm">
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
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-semibold bg-primary/10 text-primary mb-3">
                Student Dashboard
              </span>
              <h1 className="text-h1 text-foreground">
                Welcome back, <span className="text-primary">{displayName}</span>
              </h1>
              <p className="mt-2.5 text-body-lg text-muted-foreground">
                {completedCount === 0
                  ? "Kickstart your prep today! Choose one of the available practice tests below to benchmark your score."
                  : `You are making steady progress! You have completed ${completedCount} test${completedCount === 1 ? "" : "s"}. Analyze your attempts to fine-tune your performance.`}
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 min-w-[280px] md:min-w-[360px]">
              {/* Stat 1: Completed */}
              <div className="glass rounded-2xl p-4 border border-border/40 text-center shadow-xs">
                <span className="block text-h2 tabular text-foreground">{completedCount}</span>
                <span className="block eyebrow text-muted-foreground mt-1">Tests Done</span>
              </div>
              {/* Stat 2: Avg Score */}
              <div className="glass rounded-2xl p-4 border border-border/40 text-center shadow-xs">
                <span className="block text-h2 tabular text-foreground">
                  {avgScore !== null ? avgScore : "—"}
                </span>
                <span className="block eyebrow text-muted-foreground mt-1">Avg Score</span>
              </div>
              {/* Stat 3: Best Score */}
              <div className="glass rounded-2xl p-4 border border-border/40 text-center shadow-xs">
                <span className="block text-h2 tabular text-foreground">
                  {bestScore !== null ? bestScore : "—"}
                </span>
                <span className="block eyebrow text-muted-foreground mt-1">Best Score</span>
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

        <section className="mb-14">
          <div className="mb-4 border-b border-border/40 pb-3">
            <h2 className="text-h3 text-foreground">Progress over time</h2>
          </div>
          <ScoreTrend points={fullLengthPoints} />
        </section>

        {/* ----- Available tests ----- */}
        <section className="mb-14">
          <div className="mb-6 flex items-baseline justify-between border-b border-border/40 pb-3">
            <h2 className="text-h3 text-foreground">Available Practice Tests</h2>
            <span className="text-caption font-semibold text-muted-foreground bg-secondary px-3 py-1 rounded-full border border-border/20">
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
            <h2 className="text-h3 text-foreground">My Practice History</h2>
            <span className="text-caption font-semibold text-muted-foreground bg-secondary px-3 py-1 rounded-full border border-border/20">
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
            /*
              `Table` rather than `DataTable` (T1.9). Two reasons, either of
              which is enough: abandoned attempts collapse behind a disclosure
              row, which is a grouped `<tr>` a flat row list cannot express; and
              this is a student route showing at most ten rows, so a search box,
              a sorter and a pager would be client JavaScript bought for a list
              nobody needs to search.
            */
            <Table>
              <THead>
                <TR>
                  <TH>Test name</TH>
                  <TH>Status</TH>
                  <TH numeric>Score</TH>
                  <TH hideBelow="sm">Date started</TH>
                  <TH>
                    <span className="sr-only">Actions</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {activeAttempts.map(renderAttemptRow)}
                {abandonedAttempts.length > 0 && (
                  <AbandonedRows
                    count={abandonedAttempts.length}
                    columnCount={HISTORY_COLUMN_COUNT}
                  >
                    {abandonedAttempts.map(renderAttemptRow)}
                  </AbandonedRows>
                )}
              </TBody>
            </Table>
          )}
        </section>
      </main>
    </>
  );
}

/** Columns in the practice-history table — drives the disclosure row's colSpan. */
const HISTORY_COLUMN_COUNT = 5;

type HistoryAttempt = Awaited<ReturnType<typeof fetchAttempts>>[number];

/**
 * One row of the practice-history table. Extracted so the active attempts and
 * the collapsed abandoned ones render through the same code path.
 */
function renderAttemptRow(a: HistoryAttempt) {
  const liveResults = a.moduleResults.filter(
    (r) => r.module && r.module.section,
  );
  const moduleResults = liveResults.map((r) => ({
    sectionType: r.module.section.type,
    correctCount: r.correctCount,
    totalCount: r.totalCount,
    moduleId: r.moduleId,
    routedTo: r.routedTo,
    moduleNumber: r.module.moduleNumber,
    difficulty: r.module.difficulty,
  }));
  const raw = computeRawScores(moduleResults);
  const scaled = computeScaledScores(raw, computeAttemptRoutes(moduleResults));
  const scoreFidelity = getScoreFidelity(raw);
  const isDone = a.status === "COMPLETED";

  return (
    <TR key={a.id}>
      <TD className="font-semibold text-foreground">{a.test.title}</TD>
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
      <TD numeric>
        {isDone && scoreFidelity !== "INCOMPLETE" ? (
          <span className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-caption font-extrabold text-primary shadow-xs">
            {scoreFidelity === "ESTIMATE" ? `Est. ${scaled.total}` : scaled.total}
          </span>
        ) : (
          <span className="font-medium text-muted-foreground">—</span>
        )}
      </TD>
      <TD hideBelow="sm" className="text-caption text-muted-foreground">
        {formatDate(a.startedAt)}
      </TD>
      <TD className="text-right">
        {isDone ? (
          <Button asChild variant="soft" size="xs" className="active-press">
            <Link href={`/results/${a.id}`}>View results</Link>
          </Button>
        ) : a.status === "IN_PROGRESS" ? (
          // The page's one gradient. `--gradient-warm` is reserved for resume,
          // and this is the only resume affordance on the dashboard.
          <Button
            asChild
            size="xs"
            className="bg-gradient-warm text-white border-transparent hover:opacity-95 hover:glow-warm active-press transition-all duration-200"
          >
            <Link href={`/test/attempt/${a.id}`}>Continue test</Link>
          </Button>
        ) : (
          <Button asChild variant="secondary" size="xs" disabled className="opacity-50">
            <Link href={`/results/${a.id}`}>
              {a.status === "EXPIRED" ? "Expired" : "Abandoned"}
            </Link>
          </Button>
        )}
      </TD>
    </TR>
  );
}
