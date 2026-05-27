import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
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

  // Defensive: any ModuleResult whose module/section was deleted (or never
  // loaded) gets filtered out — better than 500ing the whole results page.
  const liveResults = attempt.moduleResults.filter(
    (mr) => mr.module && mr.module.section && Array.isArray(mr.module.moduleQuestions),
  );

  // Build questionId → sectionType map from the modules this attempt actually served.
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

  // ---------- Aggregate ----------
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
    <main className="container mx-auto max-w-4xl py-12">
      <Link href="/dashboard" className="text-xs text-muted-foreground hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{attempt.test.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {attempt.status}
        {attempt.completedAt
          ? ` · completed ${attempt.completedAt.toLocaleString()}`
          : ""}
      </p>

      {!isCompleted && (
        <div className="mt-4 rounded-md border border-amber-400/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          This attempt isn't complete yet — the scores below reflect only the modules that
          have been submitted.
        </div>
      )}

      {/* ---------- Total / per-section scaled ---------- */}
      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ScoreCard
          big
          label="Total"
          value={scaled.total}
          range="400–1600"
        />
        <ScoreCard
          label="Reading & Writing"
          value={scaled.readingWriting}
          range="200–800"
          raw={`${raw.readingWriting.correct} / ${raw.readingWriting.total} correct`}
        />
        <ScoreCard
          label="Math"
          value={scaled.math}
          range="200–800"
          raw={`${raw.math.correct} / ${raw.math.total} correct`}
        />
      </section>

      {/* ---------- Domain breakdown ---------- */}
      <section className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <DomainTable
          title="Reading & Writing by domain"
          stats={domainBreakdown.readingWriting}
        />
        <DomainTable title="Math by domain" stats={domainBreakdown.math} />
      </section>

      <div className="mt-10 flex gap-3">
        <Link
          href={`/results/${attempt.id}/review`}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Review answers
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md border border-input px-5 py-2.5 text-sm font-medium hover:bg-accent"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}

function ScoreCard({
  label,
  value,
  range,
  raw,
  big,
}: {
  label: string;
  value: number;
  range: string;
  raw?: string;
  big?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5",
        big && "sm:row-span-2 sm:p-7",
      )}
    >
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-semibold tabular-nums", big ? "text-5xl" : "text-3xl")}>
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{range}</div>
      {raw && <div className="mt-2 text-xs text-muted-foreground">{raw}</div>}
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
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {stats.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data.</p>
      ) : (
        <ul className="space-y-2">
          {stats.map((s) => {
            const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
            return (
              <li key={s.domain} className="text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate">{s.domain}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {s.correct} / {s.total}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
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
