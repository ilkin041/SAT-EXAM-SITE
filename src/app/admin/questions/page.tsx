import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Difficulty, QuestionType, SectionType } from "@prisma/client";
import { RowDeleteButton } from "./_components/row-delete-button";

export const metadata = { title: "Questions — Admin" };

interface SearchParams {
  q?: string;
  domain?: string;
  difficulty?: string;
  type?: string;
  section?: string;
}

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const where: Record<string, unknown> = {};
  if (sp.q) {
    where.OR = [
      { stem: { contains: sp.q, mode: "insensitive" } },
      { passage: { contains: sp.q, mode: "insensitive" } },
      { domain: { contains: sp.q, mode: "insensitive" } },
      { skill: { contains: sp.q, mode: "insensitive" } },
    ];
  }
  if (sp.domain) where.domain = sp.domain;
  if (sp.difficulty) where.difficulty = sp.difficulty as Difficulty;
  if (sp.type) where.type = sp.type as QuestionType;
  if (sp.section) where.sectionType = sp.section as SectionType;

  const [questions, domains] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: { id: "desc" },
      take: 100,
      include: {
        _count: { select: { moduleAssignments: true } },
      },
    }),
    prisma.question.findMany({
      distinct: ["domain"],
      select: { domain: true },
      orderBy: { domain: "asc" },
    }),
  ]);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Question bank</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Questions live in the global bank and are assigned to test modules from each test's detail page.
          </p>
        </div>
        <Link
          href="/admin/questions/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          New question
        </Link>
      </div>

      <form className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-6">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search…"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
        />
        <select
          name="section"
          defaultValue={sp.section ?? ""}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All sections</option>
          <option value="READING_WRITING">English (R&amp;W)</option>
          <option value="MATH">Math</option>
        </select>
        <select
          name="type"
          defaultValue={sp.type ?? ""}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="MULTIPLE_CHOICE">Multiple choice</option>
          <option value="STUDENT_PRODUCED_RESPONSE">Student-produced</option>
        </select>
        <select
          name="difficulty"
          defaultValue={sp.difficulty ?? ""}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
          <option value="MIXED">Mixed</option>
        </select>
        <select
          name="domain"
          defaultValue={sp.domain ?? ""}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All domains</option>
          {domains.map((d) => (
            <option key={d.domain} value={d.domain}>
              {d.domain}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90"
        >
          Filter
        </button>
        <Link
          href="/admin/questions"
          className="flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm hover:bg-accent"
        >
          Clear
        </Link>
      </form>

      {questions.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          No questions match these filters.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Stem</th>
                <th className="p-3">Section</th>
                <th className="p-3">Type</th>
                <th className="p-3">Domain</th>
                <th className="p-3">Diff.</th>
                <th className="p-3">Assignments</th>
                <th className="p-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {questions.map((q) => (
                <tr key={q.id} className="hover:bg-accent/30">
                  <td className="p-3">
                    <Link
                      href={`/admin/questions/${q.id}`}
                      className="line-clamp-2 max-w-md font-medium hover:underline"
                    >
                      {stripHtml(q.stem)}
                    </Link>
                  </td>
                  <td className="p-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs " +
                        (q.sectionType === "MATH"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300")
                      }
                    >
                      {q.sectionType === "MATH" ? "Math" : "R&W"}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {q.type === "MULTIPLE_CHOICE" ? "MC" : "SPR"}
                  </td>
                  <td className="p-3 text-muted-foreground">{q.domain}</td>
                  <td className="p-3 text-muted-foreground">{q.difficulty}</td>
                  <td className="p-3">
                    {q._count.moduleAssignments === 0 ? (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    ) : (
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
                        Used in {q._count.moduleAssignments} module
                        {q._count.moduleAssignments === 1 ? "" : "s"}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <RowDeleteButton questionId={q.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 140);
}
