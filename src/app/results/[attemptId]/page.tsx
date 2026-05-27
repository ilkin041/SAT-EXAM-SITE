import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Award, BookOpen, Calculator } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  computeDomainBreakdown,
  computeRawScores,
  computeScaledScores,
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
      answers: { include: { question: { select: { domain: true, type: true } } } },
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

  const isCompleted = attempt.status === "COMPLETED";

  return (
    <main className="container mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">{attempt.test.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge
            variant={
              isCompleted
                ? "success"
                : attempt.status === "IN_PROGRESS"
                  ? "warning"
                  : "muted"
            }
          >
            {attempt.status === "IN_PROGRESS"
              ? "In progress"
              : isCompleted
                ? "Completed"
                : "Abandoned"}
          </Badge>
          {attempt.completedAt && (
            <span>completed {attempt.completedAt.toLocaleString()}</span>
          )}
        </div>
      </header>

      {!isCompleted && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          This attempt isn&apos;t complete yet — the scores below reflect only the modules
          that have been submitted.
        </div>
      )}

      {/* ---------- Score hero ---------- */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-8 shadow-card">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Award className="h-3.5 w-3.5" />
            Total Score
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-7xl font-semibold tracking-tight tabular-nums">
              {scaled.total}
            </span>
            <span className="text-2xl text-muted-foreground">/1600</span>
          </div>
          <div
            className={cn(
              "mt-2 text-sm font-medium",
              tierColor(scaled.total / 1600),
            )}
          >
            {tierLabel(scaled.total / 1600)}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <SectionScore
            label="Reading & Writing"
            icon={BookOpen}
            value={scaled.readingWriting}
            raw={`${raw.readingWriting.correct} / ${raw.readingWriting.total} correct`}
          />
          <SectionScore
            label="Math"
            icon={Calculator}
            value={scaled.math}
            raw={`${raw.math.correct} / ${raw.math.total} correct`}
          />
        </div>
      </section>

      {/* ---------- Domain breakdown ---------- */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Performance by domain</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <DomainTable
            title="Reading & Writing"
            stats={domainBreakdown.readingWriting}
          />
          <DomainTable title="Math" stats={domainBreakdown.math} />
        </div>
      </section>

      {/* ---------- Actions ---------- */}
      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href={`/results/${attempt.id}/review`}>
            Review answers
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}

function tierLabel(pct: number): string {
  if (pct >= 0.75) return "Above average";
  if (pct >= 0.5) return "Solid performance";
  if (pct >= 0.25) return "Room to grow";
  return "Keep practicing";
}

function tierColor(pct: number): string {
  if (pct >= 0.75) return "text-green-700 dark:text-green-400";
  if (pct >= 0.5) return "text-blue-700 dark:text-blue-400";
  if (pct >= 0.25) return "text-amber-700 dark:text-amber-400";
  return "text-muted-foreground";
}

function SectionScore({
  label,
  icon: Icon,
  value,
  raw,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  raw: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" aria-hidden />
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-4xl font-semibold tabular-nums">{value}</span>
        <span className="text-sm text-muted-foreground">/800</span>
      </div>
      <div className="mt-1.5 text-xs text-muted-foreground">{raw}</div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${((value - 200) / 600) * 100}%` }}
        />
      </div>
    </div>
  );
}

function DomainTable({
  title,
  stats,
}: {
  title: string;
  stats: { domain: string; correct: number; total: number }[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {stats.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data.</p>
      ) : (
        <ul className="space-y-3.5">
          {stats.map((s) => {
            const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
            const barColor =
              pct >= 75
                ? "bg-green-600"
                : pct >= 50
                  ? "bg-blue-600"
                  : pct >= 25
                    ? "bg-amber-500"
                    : "bg-destructive";
            return (
              <li key={s.domain} className="text-sm">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="truncate font-medium">{s.domain}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {s.correct} / {s.total}{" "}
                    <span className="ml-1 font-semibold">{pct}%</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
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
