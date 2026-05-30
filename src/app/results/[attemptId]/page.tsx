import Link from "next/link";
import { notFound } from "next/navigation";
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
import {
  computeDifficultyBreakdown,
  computeDomainBreakdown,
  computeRawScores,
  computeScaledScores,
  computeTimeStats,
  formatDuration,
  type DifficultyKey,
  type ScoringTable,
} from "@/lib/scoring";
import { cn } from "@/lib/utils";

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
      test: { select: { title: true, isPublic: true, scoringTable: true } },
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

  const isOwner = attempt.userId && session?.user?.id === attempt.userId;
  const isAdmin = session?.user?.role === "ADMIN";
  const isAnonymousPublic = !attempt.userId && attempt.test.isPublic;
  if (!isOwner && !isAdmin && !isAnonymousPublic) notFound();

  const moduleResults = liveResults.map((r) => ({
    sectionType: r.module.section.type,
    correctCount: r.correctCount,
    totalCount: r.totalCount,
  }));
  const raw = computeRawScores(moduleResults);

  const scoringTable = (attempt.test.scoringTable as ScoringTable | null) ?? null;
  const scaled = computeScaledScores(raw, scoringTable);

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

  const isCompleted = attempt.status === "COMPLETED";

  const scorePct = Math.max(0, Math.min(100, Math.round(((scaled.total - 400) / 1200) * 100)));

  return (
    <main className="container mx-auto max-w-4xl px-4 py-10 animate-fade-in">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-all duration-150 hover:text-primary active-press mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <header className="mb-8 flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{attempt.test.title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Practice Test Score Report
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={
              isCompleted
                ? "success"
                : attempt.status === "IN_PROGRESS"
                  ? "warning"
                  : "muted"
            }
            className={attempt.status === "IN_PROGRESS" ? "animate-pulse" : undefined}
          >
            {attempt.status === "IN_PROGRESS"
              ? "In progress"
              : isCompleted
                ? "Completed"
                : "Abandoned"}
          </Badge>
          {attempt.completedAt && (
            <span className="text-xs text-muted-foreground font-medium">
              Completed on {attempt.completedAt.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          )}
        </div>
      </header>

      {!isCompleted && (
        <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-50/50 p-4.5 text-sm text-amber-850 dark:bg-amber-950/20 dark:text-amber-250">
          ⚠️ This attempt isn&apos;t complete yet. The scores below reflect only the modules submitted so far.
        </div>
      )}

      {/* ---------- Score Hero Section ---------- */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-hero border border-border/50 p-8 mb-10 shadow-sm flex flex-col items-center">
        {/* Blurred ambient background spots */}
        <div className="absolute -left-16 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

        <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold bg-primary/10 text-primary mb-6">
          <Award className="h-4 w-4" />
          Overall Performance
        </span>

        {/* Dynamic Pure SVG Circle Gauge */}
        <div className="relative flex h-48 w-48 items-center justify-center">
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="50"
              className="stroke-muted/50 fill-none"
              strokeWidth="9"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              className="stroke-primary fill-none transition-all duration-1000 ease-out"
              strokeWidth="9"
              strokeDasharray={314.16}
              strokeDashoffset={314.16 - (scorePct / 100) * 314.16}
              strokeLinecap="round"
            />
          </svg>
          <div className="text-center z-10">
            <span className="block text-5xl font-black tracking-tight text-foreground tabular-nums">
              {scaled.total}
            </span>
            <span className="text-sm font-bold text-muted-foreground mt-0.5 block">/ 1600</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center">
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-xs font-bold border shadow-xs transition-colors",
            tierPillStyle(scaled.total / 1600)
          )}>
            {tierLabel(scaled.total / 1600)}
          </span>
        </div>

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

      {/* ---------- Domain breakdown ---------- */}
      <section className="mb-10">
        <div className="mb-4 border-b border-border/40 pb-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Performance by Domain</h2>
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
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Performance by Difficulty
          </h2>
        </div>
        <DifficultyTable stats={difficultyBreakdown} />
      </section>

      {/* ---------- Time management ---------- */}
      <section className="mb-12">
        <div className="mb-4 border-b border-border/40 pb-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Time Analysis</h2>
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
        <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground leading-relaxed">
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
            <ArrowRight className="h-4.5 w-4.5" />
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
  if (pct >= 0.75) return "bg-emerald-50 text-emerald-700 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-350";
  if (pct >= 0.5) return "bg-blue-50 text-blue-700 border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-350";
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
  const pct = Math.max(0, Math.min(100, Math.round(((value - 200) / 600) * 100)));
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5.5 shadow-xs hover:border-primary/20 hover:shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <Icon className="h-4 w-4 text-primary" aria-hidden />
          {label}
        </div>
        <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border/20">
          {raw}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-4xl font-extrabold tabular-nums tracking-tight text-foreground">{value}</span>
        <span className="text-sm font-semibold text-muted-foreground">/ 800</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted/60">
        <div
          className={cn("h-full rounded-full transition-all duration-500", progressColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
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
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-sm text-center text-muted-foreground">
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
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
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                        cfg.badge,
                      )}
                    >
                      {cfg.label}
                    </span>
                  </td>
                  <td className="py-4 text-center tabular-nums font-medium text-foreground">{r.correct}</td>
                  <td className="py-4 text-center tabular-nums text-muted-foreground font-medium">
                    {r.total}
                  </td>
                  <td className="py-4 text-center font-bold tabular-nums text-foreground">{pct}%</td>
                  <td className="py-4 pl-6 min-w-[120px]">
                    <div className="h-2 overflow-hidden rounded-full bg-muted/65">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", cfg.bar)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hint && (
        <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-50/50 px-4 py-3 text-xs text-amber-850 dark:bg-amber-950/20 dark:text-amber-250 leading-relaxed">
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
      <h3 className="mb-4 text-sm font-bold text-foreground">{title}</h3>
      {stats.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No domain data logged for this attempt.</p>
      ) : (
        <ul className="space-y-4">
          {stats.map((s) => {
            const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
            const barColor =
              pct >= 75
                ? "bg-emerald-500"
                : pct >= 50
                  ? "bg-blue-500"
                  : pct >= 25
                    ? "bg-amber-500"
                    : "bg-destructive";
            return (
              <li key={s.domain} className="text-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="truncate font-medium text-foreground">{s.domain}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground font-semibold">
                    {s.correct} / {s.total}{" "}
                    <span className="ml-1 font-bold text-foreground">{pct}%</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted/65">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      barColor,
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
