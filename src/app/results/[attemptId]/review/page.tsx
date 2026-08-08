import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ReviewClient, type ReviewItem } from "./review-client";
import { canAccessAttempt } from "@/lib/attempt-auth";
import { readRenderedQuestion } from "@/lib/rendered-question";
import { track } from "@/lib/track";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({ title: "Review answers", noindex: true });

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
                // `include: { question: true }` gives the scalars only, and
                // T2.2 made `domain` a relation — the badge needs its name.
                include: { question: { include: { domain: { select: { name: true } } } } },
              },
            },
          },
        },
      },
      answers: true,
    },
  });
  if (!attempt) notFound();

  if (!(await canAccessAttempt(session?.user, attempt))) notFound();
  if (attempt.status !== "COMPLETED") {
    redirect(
      attempt.status === "IN_PROGRESS"
        ? `/test/attempt/${attempt.id}`
        : "/dashboard",
    );
  }

  // Same placement rule as `results_viewed`: after the access check and the
  // redirect, so a bounced request is not counted as a read.
  void track("review_opened", {
    userId: attempt.userId,
    props: {
      attemptId: attempt.id,
      testId: attempt.testId,
      anonymous: attempt.userId === null,
    },
  });

  // Sort modules in test order, then flatten to a one-question-per-row list.
  // Each item carries everything the review client needs to render that
  // question without making any further server calls.
  const grouped = attempt.moduleResults
    .filter(
      (mr) =>
        mr.module && mr.module.section && Array.isArray(mr.module.moduleQuestions),
    )
    .slice()
    .sort((a, b) => {
      const so = a.module.section.order - b.module.section.order;
      if (so !== 0) return so;
      return a.module.moduleNumber - b.module.moduleNumber;
    });

  const answerByQ = new Map(attempt.answers.map((a) => [a.questionId, a]));

  const items: ReviewItem[] = [];
  for (const mr of grouped) {
    for (const mq of mr.module.moduleQuestions) {
      const q = mq.question;
      const a = answerByQ.get(q.id);
      // Rendered once at authoring time; `readRenderedQuestion` falls back to
      // rendering here when `renderedHtml` is NULL, so the client never needs
      // KaTeX either way.
      const rendered = readRenderedQuestion(q);
      items.push({
        questionId: q.id,
        sectionType: mr.module.section.type,
        moduleNumber: mr.module.moduleNumber,
        type: q.type,
        domain: q.domain.name,
        difficulty: q.difficulty,
        passageHtml: rendered.passage,
        stemHtml: rendered.stem,
        imageUrl: q.imageUrl,
        imagePosition: q.imagePosition,
        imageMaxWidth: q.imageMaxWidth,
        choices: rendered.choices,
        correctAnswer: q.correctAnswer ?? null,
        acceptedAnswers: (q.acceptedAnswers as string[] | null) ?? null,
        explanationHtml: rendered.explanation,
        studentResponse: a?.response ?? "",
        isCorrect: !!a?.isCorrect,
        timeSpentSeconds: a?.timeSpent ?? 0,
      });
    }
  }

  return (
    <ReviewClient attemptId={attempt.id} testTitle={attempt.test.title} items={items} />
  );
}
