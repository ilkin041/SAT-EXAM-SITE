import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Calculator,
  Clock,
  Hourglass,
  TrendingDown,
  Zap,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { DomainBarList } from "@/components/ui/domain-bar";
import { Progress } from "@/components/ui/progress";
import { ScoreDial } from "@/components/ui/score-dial";
import {
  computeDifficultyBreakdown,
  computeDomainBreakdown,
  computeAttemptRoutes,
  computeRawScores,
  computeScaledScores,
  computeTimeStats,
  formatDuration,
  getScoreFidelity,
  type DifficultyKey,
} from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { canAccessAttempt } from "@/lib/attempt-auth";

export const metadata = { title: "Results" };

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const session = await auth();

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: { select: { title: true, isPublic: true } },
      moduleResults: {
        include: {
          module: {
            include: {
              section: { select: { type: true } },
              moduleQuestions: { select: { questionId: true } },
            },
          },
        },
      },
      answers: {
        include: {
          question: { select: { domain: true, type: true, difficulty: true } },
        },
      },
    },
  });
  if (!attempt) notFound();

  const liveResults = attempt.moduleResults.filter(
    (mr) => mr.module && mr.module.section && Array.isArray(mr.module.moduleQuestions),
  );

  const questionSectionType = new Map<string, "READING_WRITING" | "MATH">();
  for (const mr of liveResults) {
    const t = mr.module.section.type;
    for (const mq of mr.module.moduleQuestions) {
      questionSectionType.set(mq.questionId, t);
    }
  }

  if (!(await canAccessAttempt(session?.user, attempt))) notFound();
  if (attempt.status !== "COMPLETED") {
    redirect(
      attempt.status === "IN_PROGRESS"
        ? `/test/attempt/${attempt.id}`
        : "/dashboard",
    );
  }

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

  const domainBreakdown = computeDomainBreakdown(
    attempt.answers.flatMap((a) => {
      const sectionType = questionSectionType.get(a.questionId);
      if (!sectionType) return [];
      return [{ sectionType, domain: a.question.domain, isCorrect: a.isCorrect }];
    }),
  );

  const difficultyBreakdown = computeDifficultyBreakdown(
    attempt.answers.map((a) => ({
      difficulty: a.question.difficulty,
      isCorrect: a.isCorrect,
    })),
  );

  const timeStats = computeTimeStats(
    attempt.answers.map((a) => ({ response: a.response, timeSpent: a.timeSpent })),
  );

  return (
    <main className="container mx-auto max-w-4xl px-4 py-10 animate-fade-in">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-body font-semibold text-muted-foreground transition-all duration-150 hover:text-primary active-press mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <header className="mb-8 flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-4">
        <div>
          <h1 className="text-h1 text-foreground">{attempt.test.title}</h1>
          <p className="mt-1.5 text-body text-muted-foreground">
            Practice Test Score Report
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success">Completed</Badge>
          {attempt.completedAt && (
            <span className="text-caption text-muted-foreground font-medium">
              Completed on {attempt.completedAt.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          )}
        </div>
      </header>

      {scoreFidelity === "INCOMPLETE" ? (
        <section className="mb-10 rounded-2xl border border-amber-500/30 bg-amber-50/60 p-6 text-center dark:bg-amber-950/20">
          <h2 className="text-h3 text-foreground">No complete SAT score available</h2>
          <p className="mt-2 text-body text-muted-foreground">
            This attempt does not contain scored results for both sections. Raw module
            performance remains available to administrators, but a 400–1600 total would
            be misleading.
          </p>
        </section>
      ) : (
      <section className="relative overflow-hidden rounded-3xl bg-gradient-hero border border-border/50 p-8 mb-10 shadow-sm flex flex-col items-center">
        {/* Blurred ambient background spots */}
        <div className="absolute -left-16 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

        <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-caption font-semibold bg-primary/10 text-primary mb-6">
          <Award className="h-4 w-4" />
          {scoreFidelity === "ESTIMATE" ? "Estimated Performance" : "Overall Performance"}
        </span>

        <ScoreDial value={scaled.total} max={1600} sublabel="/ 1600" />

        {scoreFidelity === "FULL_LENGTH" ? (
        <div className="mt-6 flex flex-col items-center">
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-caption font-bold border shadow-xs transition-colors",
            tierPillStyle(scaled.total / 1600)
          )}>
            {tierLabel(scaled.total / 1600)}
          </span>
        </div>
        ) : (
          <p className="mt-6 max-w-xl rounded-xl border border-amber-500/25 bg-amber-50/70 px-4 py-3 text-center text-caption text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            Estimate from a short test. Proportional scaling has fewer score points than
            a full 54-question R&amp;W and 44-question Math test, so no performance tier is assigned.
          </p>
        )}

        <div className="mt-8 grid gap-4 w-full sm:grid-cols-2">
          <SectionScore
            label="Reading & Writing"
            icon={BookOpen}
            value={scaled.readingWriting}
            raw={`${raw.readingWriting.correct} / ${raw.readingWriting.total} Correct`}
            progressColor="bg-gradient-primary"
          />
          <SectionScore
            label="Math"
            icon={Calculator}
            value={scaled.math}
            raw={`${raw.math.correct} / ${raw.math.total} Correct`}
            progressColor="bg-gradient-accent"
          />
        </div>
      </section>
      )}

      {/* ---------- Domain breakdown ---------- */}
      <section className="mb-10">
        <div className="mb-4 border-b border-border/40 pb-2">
          <h2 className="text-h3 text-foreground">Performance by Domain</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <DomainTable
            title="Reading & Writing Breakdown"
            stats={domainBreakdown.readingWriting}
          />
          <DomainTable title="Math Breakdown" stats={domainBreakdown.math} />
        </div>
      </section>

      {/* ---------- Difficulty breakdown ---------- */}
      <section className="mb-10">
        <div className="mb-4 border-b border-border/40 pb-2">
          <h2 className="text-h3 text-foreground">
            Performance by Difficulty
          </h2>
        </div>
        <DifficultyTable stats={difficultyBreakdown} />
      </section>

      {/* ---------- Time management ---------- */}
      <section className="mb-12">
        <div className="mb-4 border-b border-border/40 pb-2">
          <h2 className="text-h3 text-foreground">Time Analysis</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Avg per Question"
            value={formatDuration(timeStats.averageSeconds)}
            icon={Clock}
            hint={`${timeStats.answeredCount} answered`}
            accentColor="blue"
          />
          <StatCard
            label="Fastest Question"
            value={formatDuration(timeStats.fastestSeconds)}
            icon={Zap}
            accentColor="emerald"
          />
          <StatCard
            label="Slowest Question"
            value={formatDuration(timeStats.slowestSeconds)}
            icon={Hourglass}
            accentColor="violet"
          />
          <StatCard
            label="Paced Too Long"
            value={timeStats.overLimitCount}
            icon={TrendingDown}
            hint=">3 min spent"
            accentColor="amber"
          />
        </div>
        <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-4 text-caption text-muted-foreground leading-relaxed">
          💡 <span className="font-semibold text-foreground">SAT pacing strategy:</span> Try to average under{" "}
          <span className="font-semibold text-foreground">1:10</span> per Reading &amp; Writing question and under{" "}
          <span className="font-semibold text-foreground">1:35</span> per Math question.
        </div>
      </section>

      {/* ---------- Action Buttons ---------- */}
      <div className="mt-8 flex flex-wrap gap-4 justify-center sm:justify-start">
        <Button asChild size="lg" className="bg-gradient-primary text-white border-transparent hover:opacity-95 hover:glow-primary hover-lift active-press transition-all duration-200">
          <Link href={`/results/${attempt.id}/review`} className="flex items-center gap-1.5">
            Review all answers
            <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg" className="hover-lift active-press shadow-xs">
          <Link href="/dashboard">Return to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}

function tierLabel(pct: number): string {
  if (pct >= 0.75) return "Above Average Score";
  if (pct >= 0.5) return "Solid Performance";
  if (pct >= 0.25) return "Room to Grow";
  return "Keep Practicing";
}

function tierPillStyle(pct: number): string {
  if (pct >= 0.75) return "bg-emerald-50 text-emerald-700 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (pct >= 0.5) return "bg-blue-50 text-blue-700 border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-300";
  if (pct >= 0.25) return "bg-amber-50 text-amber-700 border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-300";
  return "bg-muted text-muted-foreground border-border/80";
}

function SectionScore({
  label,
  icon: Icon,
  value,
  raw,
  progressColor = "bg-primary",
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  raw: string;
  progressColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:border-primary/20 hover:shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-body font-bold text-muted-foreground">
          <Icon className="h-4 w-4 text-primary" aria-hidden />
          {label}
        </div>
        <span className="text-eyebrow font-bold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border/20">
          {raw}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-h1 tabular text-foreground">{value}</span>
        <span className="text-body font-semibold text-muted-foreground">/ 800</span>
      </div>
      {/* The gradient stays a call-site decision: `--gradient-accent` is
          unassigned in CLAUDE.md and the page's gradient budget belongs to
          T1.8, so this passes its own fill rather than teaching Progress a
          tone it may not keep. */}
      <Progress
        value={value}
        min={200}
        max={800}
        barClassName={progressColor}
        className="mt-4"
      />
    </div>
  );
}

function DifficultyTable({
  stats,
}: {
  stats: { difficulty: DifficultyKey; correct: number; total: number }[];
}) {
  const rows = stats.filter((s) => s.total > 0);
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-body text-center text-muted-foreground">
        No question difficulties mapped for this attempt.
      </div>
    );
  }

  const pctByLevel: Partial<Record<DifficultyKey, number>> = {};
  for (const r of rows) {
    pctByLevel[r.difficulty] = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0;
  }

  let hint: string | null = null;
  if ((pctByLevel.HARD ?? 100) < 50) {
    hint = "💡 Hard questions seem to be challenging. Try allocating extra review cycles to advanced problem stems.";
  } else if ((pctByLevel.EASY ?? 100) < 85) {
    hint = "⚠️ You're missing easy questions. Double-check your arithmetic and read question prompts carefully to avoid silly mistakes.";
  } else if ((pctByLevel.MEDIUM ?? 100) < 65) {
    hint = "💡 Medium-difficulty questions compose the majority of items. Aim to secure these points during practice.";
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-xs hover:shadow-sm transition-all duration-200">
      <div className="overflow-x-auto">
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-border/60 text-left text-caption uppercase tracking-wide text-muted-foreground">
              <th className="pb-3.5 font-semibold">Difficulty</th>
              <th className="pb-3.5 text-center font-semibold">Correct</th>
              <th className="pb-3.5 text-center font-semibold">Total</th>
              <th className="pb-3.5 text-center font-semibold">Accuracy</th>
              <th className="pb-3.5 pl-6 font-semibold">Visual Accuracy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => {
              const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0;
              const cfg = difficultyDisplay(r.difficulty);
              return (
                <tr key={r.difficulty} className="transition-colors hover:bg-muted/10">
                  <td className="py-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-semibold border",
                        cfg.badge,
                      )}
                    >
                      {cfg.label}
                    </span>
                  </td>
                  <td className="py-4 text-center tabular font-medium text-foreground">{r.correct}</td>
                  <td className="py-4 text-center tabular text-muted-foreground font-medium">
                    {r.total}
                  </td>
                  <td className="py-4 text-center font-bold tabular text-foreground">{pct}%</td>
                  <td className="py-4 pl-6 min-w-[120px]">
                    {/* Difficulty colours, not grades: 40% on hard questions is
                        not the same news as 40% on easy ones, so the bar keeps
                        the row's own colour. */}
                    <Progress value={pct} barClassName={cfg.bar} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hint && (
        <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-50/50 px-4 py-3 text-caption text-amber-800 dark:bg-amber-950/20 dark:text-amber-200 leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}

function difficultyDisplay(d: DifficultyKey) {
  if (d === "EASY") {
    return {
      label: "Easy",
      badge:
        "border-green-500/25 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
      bar: "bg-emerald-500",
    };
  }
  if (d === "MEDIUM") {
    return {
      label: "Medium",
      badge:
        "border-amber-500/25 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
      bar: "bg-amber-500",
    };
  }
  return {
    label: "Hard",
    badge: "border-red-500/20 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    bar: "bg-destructive",
  };
}

function DomainTable({
  title,
  stats,
}: {
  title: string;
  stats: { domain: string; correct: number; total: number }[];
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-xs hover:shadow-sm transition-all duration-200">
      <h3 className="mb-4 text-body font-bold text-foreground">{title}</h3>
      {stats.length === 0 ? (
        <p className="text-caption text-muted-foreground py-2">No domain data logged for this attempt.</p>
      ) : (
        <DomainBarList stats={stats} />
      )}
    </div>
  );
}
