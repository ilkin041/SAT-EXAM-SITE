import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format-date";
import { orderByFrom, readTableParams } from "@/lib/table-params";
import type { Difficulty, Prisma, QuestionType, SectionType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { listAssignableModules } from "./actions";
import { loadTaxonomy } from "@/lib/taxonomy-db";
import { QuestionsTable, type QuestionRow } from "./_components/questions-table";

export const metadata = { title: "Questions — Admin" };

const PAGE_SIZE = 100;

/** Whitelisted orderings for `?sort=` — see `orderByFrom`. */
const ORDERINGS: Record<
  string,
  (dir: "asc" | "desc") => Prisma.QuestionOrderByWithRelationInput
> = {
  stem: (dir) => ({ stem: dir }),
  section: (dir) => ({ sectionType: dir }),
  type: (dir) => ({ type: dir }),
  // Order by the domain's *name*, not its id — the ids are slugs and sort
  // nothing like the labels the reader is looking at.
  domain: (dir) => ({ domain: { name: dir } }),
  difficulty: (dir) => ({ difficulty: dir }),
  usedIn: (dir) => ({ moduleAssignments: { _count: dir } }),
  updated: (dir) => ({ updatedAt: dir }),
};

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { q, sort, dir, page: requestedPage } = readTableParams(sp);

  const section = typeof sp.section === "string" ? sp.section : undefined;
  const type = typeof sp.type === "string" ? sp.type : undefined;
  const difficulty = typeof sp.difficulty === "string" ? sp.difficulty : undefined;
  // `?domain=` carries a `Domain.id` since T2.2 — the ids are stable slugs, so
  // an existing bookmark holding a domain *name* simply matches nothing rather
  // than 500ing.
  const domain = typeof sp.domain === "string" ? sp.domain : undefined;
  const review = sp.review === "1" ? "1" : undefined;

  const where: Prisma.QuestionWhereInput = {};
  if (q) {
    where.OR = [
      { stem: { contains: q, mode: "insensitive" } },
      { passage: { contains: q, mode: "insensitive" } },
      { domain: { name: { contains: q, mode: "insensitive" } } },
      { skill: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (domain) where.domainId = domain;
  if (review) where.taxonomyReview = { isNot: null };
  if (difficulty) where.difficulty = difficulty as Difficulty;
  if (type) where.type = type as QuestionType;
  if (section) where.sectionType = section as SectionType;

  const [questionCount, assignableTests, taxonomy] = await Promise.all([
    prisma.question.count({ where }),
    listAssignableModules(),
    loadTaxonomy(),
  ]);
  const totalPages = Math.max(1, Math.ceil(questionCount / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const questions = await prisma.question.findMany({
    where,
    orderBy: orderByFrom(sort, dir, ORDERINGS, "updated"),
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      _count: { select: { moduleAssignments: true } },
      domain: { select: { name: true } },
      skill: { select: { name: true } },
      taxonomyReview: { select: { legacySkill: true } },
    },
  });

  const rows: QuestionRow[] = questions.map((q) => ({
    id: q.id,
    stemPreview: stripHtml(q.stem),
    sectionType: q.sectionType,
    type: q.type,
    domainName: q.domain.name,
    skillName: q.skill?.name ?? null,
    // `undefined` means "not in the queue"; `null` means "queued, never tagged".
    reviewLegacySkill: q.taxonomyReview ? q.taxonomyReview.legacySkill : undefined,
    difficulty: q.difficulty,
    assignmentCount: q._count.moduleAssignments,
    updatedAt: formatDate(q.updatedAt),
  }));

  return (
    <>
      <PageHeader
        title="Question Bank"
        description="Questions live in the global bank and are assigned to test modules from each test's detail page."
        actions={
          // Solid: the navy AdminNav bar is the admin section's one gradient.
          <Button asChild className="active-press">
            <Link href="/admin/questions/new">
              <Plus className="h-4 w-4" />
              New question
            </Link>
          </Button>
        }
      />

      <div className="animate-fade-in">
        <QuestionsTable
          rows={rows}
          assignableTests={assignableTests}
          total={questionCount}
          pageSize={PAGE_SIZE}
          domains={taxonomy.domains}
          skills={taxonomy.skills}
          section={section}
          type={type}
          difficulty={difficulty}
          domain={domain}
          review={review}
        />
      </div>
    </>
  );
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 140);
}
