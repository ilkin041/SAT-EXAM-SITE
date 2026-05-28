import Link from "next/link";
import { BookOpen, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { Difficulty, QuestionType, SectionType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { listAssignableModules } from "./actions";
import { QuestionsTable, type QuestionRow } from "./_components/questions-table";

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

  const [questions, domains, assignableTests] = await Promise.all([
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
    listAssignableModules(),
  ]);

  const rows: QuestionRow[] = questions.map((q) => ({
    id: q.id,
    stemPreview: stripHtml(q.stem),
    sectionType: q.sectionType,
    type: q.type,
    domain: q.domain,
    difficulty: q.difficulty,
    assignmentCount: q._count.moduleAssignments,
  }));

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
        <QuestionsTable rows={rows} assignableTests={assignableTests} />
      )}
    </>
  );
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 140);
}
