import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import {
  computeAttemptRoutes,
  computeRawScores,
  computeScaledScores,
  getScoreFidelity,
} from "@/lib/scoring";
import { summarizeFocusEvents } from "@/lib/analytics";

export const metadata = { title: "Attempt — Admin" };

export default async function AttemptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const attempt = await prisma.testAttempt.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true } },
      test: { select: { id: true, title: true } },
      moduleResults: {
        include: {
          module: { include: { section: { select: { type: true } } } },
        },
      },
      answers: true,
      events: { orderBy: { occurredAt: "desc" } },
    },
  });
  if (!attempt) notFound();

  const moduleResults = attempt.moduleResults.map((r) => ({
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
  const hasScore = attempt.status === "COMPLETED" && scoreFidelity !== "INCOMPLETE";
  const scoreHint = scoreFidelity === "ESTIMATE" ? "short-test estimate" : "400–1600";

  const focusSummary = summarizeFocusEvents(attempt.events);

  return (
    <>
      <Link
        href="/admin/attempts"
        className="inline-flex items-center gap-1.5 text-caption text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to attempts
      </Link>
      <header className="mt-2 mb-6">
        <h1 className="text-h1">Attempt</h1>
        <p className="mt-1.5 text-body text-muted-foreground">
          {attempt.user?.name ?? attempt.user?.email ?? "anonymous"} · {attempt.test.title}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={scoreFidelity === "ESTIMATE" ? "Estimated total" : "Total scaled"}
          value={hasScore ? scaled.total : "—"}
          hint={hasScore ? scoreHint : "incomplete attempt"}
        />
        <StatCard
          label="R&W"
          value={hasScore ? scaled.readingWriting : "—"}
          hint={`${raw.readingWriting.correct}/${raw.readingWriting.total} raw`}
        />
        <StatCard
          label="Math"
          value={hasScore ? scaled.math : "—"}
          hint={`${raw.math.correct}/${raw.math.total} raw`}
        />
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-body font-semibold">Focus-event log</h2>
        <p className="mt-1 text-caption text-muted-foreground">
          {focusSummary.blurCount} tab-switch{focusSummary.blurCount === 1 ? "" : "es"} · {focusSummary.fullscreenExitCount} fullscreen exit
          {focusSummary.fullscreenExitCount === 1 ? "" : "s"} · ~{focusSummary.outOfFocusSeconds}s out of focus
        </p>
        {attempt.events.length === 0 ? (
          <p className="mt-3 text-caption text-muted-foreground">No events recorded.</p>
        ) : (
          <ul className="mt-3 max-h-60 space-y-1 overflow-y-auto text-caption">
            {attempt.events.map((event) => (
              <li key={event.id} className="flex justify-between font-mono">
                <span>{event.type.toLowerCase()}</span>
                <span className="text-muted-foreground">
                  {event.occurredAt.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-h3">Modules served</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card">
          {attempt.moduleResults.map((r) => (
            <li key={r.id} className="flex items-center justify-between p-4 text-body">
              <div>
                <div className="font-medium">
                  {r.module.section.type === "READING_WRITING" ? "R&W" : "Math"} · Module{" "}
                  {r.module.moduleNumber} ({r.module.difficulty})
                </div>
                <div className="text-caption text-muted-foreground">
                  {r.correctCount}/{r.totalCount} correct
                  {r.routedTo && ` · routed to module ${r.routedTo.slice(0, 6)}…`}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <Button asChild variant="secondary">
          <Link href={`/results/${attempt.id}/review`}>
            View full answer review →
          </Link>
        </Button>
      </section>
    </>
  );
}
