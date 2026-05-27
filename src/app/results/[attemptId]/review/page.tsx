import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { QuestionPreview, type PreviewChoice } from "@/components/question-preview";
import { cn } from "@/lib/utils";

export const metadata = { title: "Review answers" };

export default async function ReviewAnswersPage({
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
        orderBy: { createdAt: "asc" },
        include: {
          module: {
            include: {
              section: { select: { type: true, order: true } },
              moduleQuestions: {
                orderBy: { order: "asc" },
                include: { question: true },
              },
            },
          },
        },
      },
      answers: true,
    },
  });
  if (!attempt) notFound();

  const isOwner = attempt.userId && session?.user?.id === attempt.userId;
  const isAdmin = session?.user?.role === "ADMIN";
  const isAnonymousPublic = !attempt.userId && attempt.test.isPublic;
  if (!isOwner && !isAdmin && !isAnonymousPublic) notFound();

  // Group module results by section in test order.
  const grouped = attempt.moduleResults
    .slice()
    .sort((a, b) => {
      const so = a.module.section.order - b.module.section.order;
      if (so !== 0) return so;
      return a.module.moduleNumber - b.module.moduleNumber;
    });

  const answerByQ = new Map(attempt.answers.map((a) => [a.questionId, a]));

  return (
    <main className="container mx-auto max-w-4xl py-10">
      <div className="mb-2">
        <Link
          href={`/results/${attempt.id}`}
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to results
        </Link>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Review answers</h1>
      <p className="mt-1 text-sm text-muted-foreground">{attempt.test.title}</p>

      <div className="mt-8 space-y-12">
        {grouped.map((mr) => {
          const sectionLabel =
            mr.module.section.type === "READING_WRITING" ? "Reading & Writing" : "Math";
          return (
            <section key={mr.id}>
              <h2 className="mb-1 text-lg font-semibold">
                {sectionLabel} · Module {mr.module.moduleNumber}
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                {mr.correctCount} / {mr.totalCount} correct
                {mr.module.difficulty !== "MIXED" && ` · ${mr.module.difficulty} track`}
              </p>

              <div className="space-y-5">
                {mr.module.moduleQuestions.map((mq, idx) => {
                  const q = mq.question;
                  const a = answerByQ.get(q.id);
                  const choices = (q.choices as PreviewChoice[] | null) ?? null;
                  const accepted = (q.acceptedAnswers as string[] | null) ?? null;
                  const studentResponse = a?.response ?? "";
                  const isCorrect = !!a?.isCorrect;
                  const answered = !!studentResponse;

                  return (
                    <article key={q.id}>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-muted-foreground">#{idx + 1}</span>
                          <span className="text-muted-foreground">{q.domain}</span>
                          <span className="rounded-full border border-border bg-muted px-2 py-0.5">
                            {q.difficulty}
                          </span>
                        </div>
                        <StatusBadge
                          status={!answered ? "skipped" : isCorrect ? "correct" : "incorrect"}
                        />
                      </div>

                      <QuestionPreview
                        question={{
                          type: q.type,
                          passage: q.passage,
                          stem: q.stem,
                          imageUrl: q.imageUrl,
                          imagePosition: q.imagePosition,
                          imageMaxWidth: q.imageMaxWidth,
                          choices,
                          correctAnswer: q.correctAnswer,
                          acceptedAnswers: accepted,
                          explanation: q.explanation,
                        }}
                        showAnswer
                      />

                      <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
                        <span className="text-muted-foreground">Your answer: </span>
                        {answered ? (
                          <span className={cn("font-medium", !isCorrect && "text-destructive")}>
                            {studentResponse}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground">(not answered)</span>
                        )}
                        {q.type === "MULTIPLE_CHOICE" && (
                          <>
                            {" · "}
                            <span className="text-muted-foreground">Correct: </span>
                            <span className="font-medium">{q.correctAnswer}</span>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: "correct" | "incorrect" | "skipped" }) {
  const styles = {
    correct: "border-green-500/40 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300",
    incorrect: "border-destructive/40 bg-destructive/10 text-destructive",
    skipped: "border-border bg-muted text-muted-foreground",
  };
  const labels = { correct: "Correct", incorrect: "Incorrect", skipped: "Skipped" };
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", styles[status])}>
      {labels[status]}
    </span>
  );
}
