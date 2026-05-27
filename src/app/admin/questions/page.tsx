import Link from "next/link";
import { BookOpen, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { Difficulty, QuestionType, SectionType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { RowDeleteButton } from "./_components/row-delete-button";

export const metadata = { title: "Questions — Admin" };

interface SearchParams {
  q?: string;
  domain?: string;
  difficulty?: string;
  type?: string;
  section?: string;
}

const SELECT_CLS =
  "h-10 rounded-md border border-input bg-card px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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

  const hasFilter = !!(sp.q || sp.domain || sp.difficulty || sp.type || sp.section);

  const [questions, domains] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: { id: "desc" },
      take: 100,
      include: { _count: { select: { moduleAssignments: true } } },
    }),
    prisma.question.findMany({
      distinct: ["domain"],
      select: { domain: true },
      orderBy: { domain: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Question bank"
        description="Questions live in the global bank and are assigned to test modules from each test's detail page."
        actions={
          <Button asChild>
            <Link href="/admin/questions/new">
              <Plus className="h-4 w-4" />
              New question
            </Link>
          </Button>
        }
      />

      <form className="mb-6 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,160px))_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search stem, passage, domain…"
              className="pl-9"
            />
          </div>
          <select name="section" defaultValue={sp.section ?? ""} className={SELECT_CLS}>
            <option value="">All sections</option>
            <option value="READING_WRITING">English (R&amp;W)</option>
            <option value="MATH">Math</option>
          </select>
          <select name="type" defaultValue={sp.type ?? ""} className={SELECT_CLS}>
            <option value="">All types</option>
            <option value="MULTIPLE_CHOICE">Multiple choice</option>
            <option value="STUDENT_PRODUCED_RESPONSE">Student-produced</option>
          </select>
          <select name="difficulty" defaultValue={sp.difficulty ?? ""} className={SELECT_CLS}>
            <option value="">All difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
            <option value="MIXED">Mixed</option>
          </select>
          <select name="domain" defaultValue={sp.domain ?? ""} className={SELECT_CLS}>
            <option value="">All domains</option>
            {domains.map((d) => (
              <option key={d.domain} value={d.domain}>
                {d.domain}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <Button type="submit" size="default">Filter</Button>
            {hasFilter && (
              <Button asChild variant="ghost" size="default">
                <Link href="/admin/questions">Clear</Link>
              </Button>
            )}
          </div>
        </div>
      </form>

      {questions.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={hasFilter ? "No questions match these filters" : "No questions yet"}
          description={
            hasFilter
              ? "Try clearing some filters or broadening your search."
              : "Add your first question to start building the bank."
          }
          action={
            hasFilter ? (
              <Button asChild variant="secondary">
                <Link href="/admin/questions">Clear filters</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/admin/questions/new">
                  <Plus className="h-4 w-4" />
                  New question
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Stem</th>
                <th className="px-4 py-2.5 font-medium">Section</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Domain</th>
                <th className="px-4 py-2.5 font-medium">Difficulty</th>
                <th className="px-4 py-2.5 font-medium">Used in</th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {questions.map((q) => (
                <tr key={q.id} className="transition-colors hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/questions/${q.id}`}
                      className="line-clamp-2 max-w-md font-medium hover:underline"
                    >
                      {stripHtml(q.stem)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={q.sectionType === "MATH" ? "info" : "success"}>
                      {q.sectionType === "MATH" ? "Math" : "R&W"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={q.type === "MULTIPLE_CHOICE" ? "outline" : "purple"}>
                      {q.type === "MULTIPLE_CHOICE" ? "MC" : "SPR"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{q.domain}</td>
                  <td className="px-4 py-3">
                    <Badge variant={difficultyVariant(q.difficulty)}>
                      {q.difficulty}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {q._count.moduleAssignments === 0 ? (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    ) : (
                      <Badge variant="muted">
                        {q._count.moduleAssignments} module
                        {q._count.moduleAssignments === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
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

function difficultyVariant(
  d: Difficulty,
): "success" | "warning" | "destructive" | "muted" {
  if (d === "EASY") return "success";
  if (d === "MEDIUM") return "warning";
  if (d === "HARD") return "destructive";
  return "muted";
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 140);
}
