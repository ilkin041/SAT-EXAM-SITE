import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QuestionForm } from "../_components/question-form";
import type { PreviewChoice } from "@/components/question-preview";

export const metadata = { title: "Edit question — Admin" };

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      moduleAssignments: {
        include: {
          module: {
            include: {
              section: { include: { test: { select: { id: true, title: true } } } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!question) notFound();

  const initialValues = {
    sectionType: question.sectionType,
    type: question.type,
    domain: question.domain,
    skill: question.skill ?? "",
    difficulty: question.difficulty,
    passage: question.passage ?? "",
    stem: question.stem,
    imageUrl: question.imageUrl ?? "",
    imagePosition: question.imagePosition,
    imageMaxWidth: question.imageMaxWidth,
    choices: (question.choices as PreviewChoice[] | null) ?? null,
    correctAnswer: question.correctAnswer,
    acceptedAnswers: (question.acceptedAnswers as string[] | null) ?? null,
    explanation: question.explanation ?? "",
  };

  return (
    <>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Edit question</h1>

      <QuestionForm
        mode="edit"
        questionId={question.id}
        initial={initialValues}
        assignments={question.moduleAssignments.map((mq) => ({
          id: mq.id,
          testId: mq.module.section.test.id,
          testTitle: mq.module.section.test.title,
          sectionType: mq.module.section.type,
          moduleNumber: mq.module.moduleNumber,
          difficulty: mq.module.difficulty,
        }))}
      />

      <section className="mt-10 rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">
          Assigned to {question.moduleAssignments.length} module
          {question.moduleAssignments.length === 1 ? "" : "s"}
        </h2>
        {question.moduleAssignments.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Not assigned to any module yet. Open a test's detail page to add it.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {question.moduleAssignments.map((mq) => {
              const sectionLabel =
                mq.module.section.type === "READING_WRITING" ? "R&W" : "Math";
              return (
                <li key={mq.id}>
                  <Link
                    href={`/admin/tests/${mq.module.section.test.id}`}
                    className="hover:underline"
                  >
                    {mq.module.section.test.title}
                  </Link>{" "}
                  <span className="text-muted-foreground">
                    · {sectionLabel} · Module {mq.module.moduleNumber} (
                    {mq.module.difficulty}) · position {mq.order}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
