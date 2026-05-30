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
  "h-10 rounded-xl border border-input/80 bg-card px-3 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-input/100";

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
  const section = sp.section;
  const type = sp.type;
  const difficulty = sp.difficulty;
  const domain = sp.domain;

  if (domain) where.domain = domain;
  if (difficulty) where.difficulty = difficulty as Difficulty;
  if (type) where.type = type as QuestionType;
  if (section) where.sectionType = section as SectionType;

  const hasFilter = !!(sp.q || domain || difficulty || type || section);

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
        title="Question Bank"
        description="Questions live in the global bank and are assigned to test modules from each test's detail page."
        actions={
          <Button asChild className="bg-gradient-primary text-white border-transparent hover:opacity-95 hover:glow-primary active-press transition-all duration-200">
            <Link href="/admin/questions/new">
              <Plus className="h-4 w-4" />
              New question
            </Link>
          </Button>
        }
      />

      <form className="mb-6 rounded-2xl border border-border/80 bg-card p-5 shadow-sm animate-fade-in">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,160px))_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search stem, passage, domain…"
              className="pl-9 rounded-xl border-input/80 focus:border-ring"
            />
          </div>
          <select name="section" defaultValue={section ?? ""} className={SELECT_CLS}>
            <option value="">All sections</option>
            <option value="READING_WRITING">English (R&amp;W)</option>
            <option value="MATH">Math</option>
          </select>
          <select name="type" defaultValue={type ?? ""} className={SELECT_CLS}>
            <option value="">All types</option>
            <option value="MULTIPLE_CHOICE">Multiple choice</option>
            <option value="STUDENT_PRODUCED_RESPONSE">Student-produced</option>
          </select>
          <select name="difficulty" defaultValue={difficulty ?? ""} className={SELECT_CLS}>
            <option value="">All difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
            <option value="MIXED">Mixed</option>
          </select>
          <select name="domain" defaultValue={domain ?? ""} className={SELECT_CLS}>
            <option value="">All domains</option>
            {domains.map((d) => (
              <option key={d.domain} value={d.domain}>
                {d.domain}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <Button type="submit" size="default" className="bg-gradient-primary text-white border-transparent hover:opacity-95 hover:glow-primary hover-lift active-press transition-all duration-200">Filter</Button>
            {hasFilter && (
              <Button asChild variant="ghost" size="default" className="hover-lift active-press rounded-xl">
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
