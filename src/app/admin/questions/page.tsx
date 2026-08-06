import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { Difficulty, Prisma, QuestionType, SectionType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { listAssignableModules } from "./actions";
import { QuestionsTable, type QuestionRow } from "./_components/questions-table";
import { ALL_QUESTION_DOMAINS } from "@/lib/question-taxonomy";

export const metadata = { title: "Questions — Admin" };

interface SearchParams {
  q?: string;
  domain?: string;
  difficulty?: string;
  type?: string;
  section?: string;
  page?: string;
}

const PAGE_SIZE = 100;
const SELECT_CLS =
  "h-10 rounded-xl border border-input/80 bg-card px-3 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-input/100";

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const where: Prisma.QuestionWhereInput = {};
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

  const requestedPage = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const [questionCount, assignableTests] = await Promise.all([
    prisma.question.count({ where }),
    listAssignableModules(),
  ]);
  const totalPages = Math.max(1, Math.ceil(questionCount / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const questions = await prisma.question.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { _count: { select: { moduleAssignments: true } } },
  });

  const rows: QuestionRow[] = questions.map((q) => ({
    id: q.id,
    stemPreview: stripHtml(q.stem),
    sectionType: q.sectionType,
    type: q.type,
    domain: q.domain,
    difficulty: q.difficulty,
    assignmentCount: q._count.moduleAssignments,
    updatedAt: q.updatedAt.toISOString(),
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
            {ALL_QUESTION_DOMAINS.map((domainOption) => (
              <option key={domainOption} value={domainOption}>
                {domainOption}
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
        <>
          <QuestionsTable rows={rows} assignableTests={assignableTests} />
          <nav
            className="mt-5 flex items-center justify-between gap-4 text-sm"
            aria-label="Question bank pagination"
          >
            <p className="text-muted-foreground">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, questionCount)} of{" "}
              {questionCount} questions
            </p>
            <div className="flex items-center gap-2">
              <Button asChild variant="secondary" size="sm" disabled={page <= 1}>
                <Link
                  href={questionPageHref(sp, page - 1)}
                  aria-disabled={page <= 1}
                  tabIndex={page <= 1 ? -1 : undefined}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Link>
              </Button>
              <span className="px-2 text-xs font-medium text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button asChild variant="secondary" size="sm" disabled={page >= totalPages}>
                <Link
                  href={questionPageHref(sp, page + 1)}
                  aria-disabled={page >= totalPages}
                  tabIndex={page >= totalPages ? -1 : undefined}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </nav>
        </>
      )}
    </>
  );
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 140);
}

function questionPageHref(sp: SearchParams, page: number): string {
  const params = new URLSearchParams();
  for (const key of ["q", "domain", "difficulty", "type", "section"] as const) {
    const value = sp[key];
    if (value) params.set(key, value);
  }
  params.set("page", String(Math.max(1, page)));
  return `/admin/questions?${params.toString()}`;
}
