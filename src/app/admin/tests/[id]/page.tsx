import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadTaxonomy } from "@/lib/taxonomy-db";
import { TestMetaForm } from "./test-meta-form";
import { SectionEditor } from "./section-editor";
import { DeleteTestButton } from "./delete-test-button";

export const metadata = { title: "Edit test — Admin" };

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          modules: {
            orderBy: [{ moduleNumber: "asc" }, { difficulty: "asc" }],
            include: {
              moduleQuestions: {
                orderBy: { order: "asc" },
                // T2.2: `domain` is a relation, and the row label needs its name.
                include: { question: { include: { domain: { select: { name: true } } } } },
              },
            },
          },
        },
      },
    },
  });

  if (!test) notFound();

  const { domains } = await loadTaxonomy();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/tests"
            className="text-caption text-muted-foreground hover:underline"
          >
            ← All tests
          </Link>
          <h1 className="mt-1 text-h1">{test.title}</h1>
        </div>
        <DeleteTestButton id={test.id} />
      </div>

      <section className="mb-10 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-h3">Test settings</h2>
        <TestMetaForm
          initial={{
            id: test.id,
            title: test.title,
            description: test.description ?? "",
            mode: test.mode,
            isPublic: test.isPublic,
            adaptiveThreshold: test.adaptiveThreshold,
          }}
        />
      </section>

      <section>
        <h2 className="mb-4 text-h3">Structure</h2>
        <div className="space-y-6">
          {test.sections.map((section) => (
            <SectionEditor
              key={section.id}
              section={{
                id: section.id,
                type: section.type,
                module1TimeLimit: section.module1TimeLimit,
                module2TimeLimit: section.module2TimeLimit,
              }}
              domains={domains}
              modules={section.modules.map((m) => ({
                id: m.id,
                moduleNumber: m.moduleNumber,
                difficulty: m.difficulty,
                questions: m.moduleQuestions.map((mq) => ({
                  id: mq.question.id,
                  order: mq.order,
                  type: mq.question.type,
                  difficulty: mq.question.difficulty,
                  domain: mq.question.domain.name,
                  stem: mq.question.stem,
                })),
              }))}
            />
          ))}
        </div>
      </section>
    </>
  );
}
