import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ReviewClient, type ReviewItem } from "./review-client";

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
      items.push({
        questionId: q.id,
        sectionType: mr.module.section.type,
        moduleNumber: mr.module.moduleNumber,
        type: q.type,
        domain: q.domain,
        difficulty: q.difficulty,
        passage: q.passage,
        stem: q.stem,
        imageUrl: q.imageUrl,
        imagePosition: q.imagePosition,
        imageMaxWidth: q.imageMaxWidth,
        choices:
          (q.choices as { label: "A" | "B" | "C" | "D"; text: string }[] | null) ??
          null,
        correctAnswer: q.correctAnswer ?? null,
        acceptedAnswers: (q.acceptedAnswers as string[] | null) ?? null,
        explanation: q.explanation ?? null,
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
