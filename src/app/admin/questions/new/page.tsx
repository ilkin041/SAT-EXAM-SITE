import { QuestionForm } from "../_components/question-form";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadTaxonomy } from "@/lib/taxonomy-db";
import type { PreviewChoice } from "@/components/question-preview";

export const metadata = { title: "New question — Admin" };

export default async function NewQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ clone?: string }>;
}) {
  const { clone } = await searchParams;
  const [source, taxonomy] = await Promise.all([
    clone ? prisma.question.findUnique({ where: { id: clone } }) : null,
    loadTaxonomy(),
  ]);
  if (clone && !source) notFound();

  const initial = source
    ? {
        sectionType: source.sectionType,
        type: source.type,
        domainId: source.domainId,
        skillId: source.skillId,
        difficulty: source.difficulty,
        passage: source.passage ?? "",
        stem: source.stem,
        imageUrl: source.imageUrl ?? "",
        imagePosition: source.imagePosition,
        imageMaxWidth: source.imageMaxWidth,
        choices: (source.choices as PreviewChoice[] | null) ?? null,
        correctAnswer: source.correctAnswer,
        acceptedAnswers: (source.acceptedAnswers as string[] | null) ?? null,
        explanation: source.explanation ?? "",
      }
    : undefined;

  return (
    <>
      <h1 className="mb-2 text-h1">
        {source ? "Clone question" : "New question"}
      </h1>
      <p className="mb-6 max-w-2xl text-body text-muted-foreground">
        Adds a question to the global bank. To make it part of a test, open that test's
        detail page and use <span className="font-medium">Add from bank</span> to assign it
        to a specific module.
      </p>
      <QuestionForm
        mode="create"
        initial={initial}
        domains={taxonomy.domains}
        skills={taxonomy.skills}
        draftKey={source ? `clone-${source.id}` : "new"}
      />
    </>
  );
}
