import type { Metadata } from "next";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format-date";
import {
  computeAttemptRoutes,
  computeRawScores,
  computeScaledScores,
  getScoreFidelity,
} from "@/lib/scoring";
import { orderByFrom, readTableParams } from "@/lib/table-params";
import type { Prisma, AttemptStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  AttemptsTable,
  type AttemptRow,
} from "./_components/attempts-table";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({ title: "Attempts — Admin", path: "/admin/attempts", noindex: true });

const PAGE_SIZE = 25;

/**
 * Whitelisted orderings for `?sort=`. Only columns the database can actually
 * order by are here — the score columns are computed after the query, so they
 * are not sortable and `attempts-table.tsx` does not offer them.
 */
const ORDERINGS: Record<
  string,
  (dir: "asc" | "desc") => Prisma.TestAttemptOrderByWithRelationInput
> = {
  student: (dir) => ({ user: { name: dir } }),
  test: (dir) => ({ test: { title: dir } }),
  status: (dir) => ({ status: dir }),
  startedAt: (dir) => ({ startedAt: dir }),
};

export default async function AdminAttemptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { q, sort, dir, page: requestedPage } = readTableParams(sp);
  const statusFilter = typeof sp.status === "string" ? (sp.status as AttemptStatus) : undefined;
  const testIdFilter = typeof sp.testId === "string" && sp.testId ? sp.testId : undefined;

  // ---------- Filter ----------
  const where: Prisma.TestAttemptWhereInput = {};
  if (q) {
    where.user = {
      is: {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
    };
  }
  if (
    statusFilter === "IN_PROGRESS" ||
    statusFilter === "COMPLETED" ||
    statusFilter === "ABANDONED" ||
    statusFilter === "EXPIRED"
  ) {
    where.status = statusFilter;
  }
  if (testIdFilter) where.testId = testIdFilter;

  // Count first, then clamp: `?page=` is hand-editable, and a page past the end
  // would otherwise return no rows while `DataTable` — which clamps against
  // `total` itself — believed it was showing the last page.
  const [total, tests] = await Promise.all([
    prisma.testAttempt.count({ where }),
    prisma.test.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));

  const attempts = await prisma.testAttempt.findMany({
      where,
      // `?sort=` is user-editable text on its way to a query — `orderByFrom`
      // falls back to the default rather than passing an unknown key through.
      orderBy: orderByFrom(sort, dir, ORDERINGS, "startedAt"),
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        user: { select: { email: true, name: true } },
        test: { select: { id: true, title: true } },
        moduleResults: {
          include: { module: { include: { section: { select: { type: true } } } } },
        },
      },
  });

  // Compute scaled scores per attempt for display.
  const rows: AttemptRow[] = attempts.map((a) => {
    const liveResults = a.moduleResults.filter((r) => r.module && r.module.section);
    const moduleResults = liveResults.map((r) => ({
      sectionType: r.module.section.type,
      correctCount: r.correctCount,
      totalCount: r.totalCount,
      moduleId: r.moduleId,
      routedTo: r.routedTo,
      moduleNumber: r.module.moduleNumber,
      difficulty: r.module.difficulty,
    }));
    const raw = computeRawScores(moduleResults);
    const scaled = computeScaledScores(raw, computeAttemptRoutes(moduleResults));
    const scoreFidelity = getScoreFidelity(raw);
    const scored = a.status === "COMPLETED" && scoreFidelity !== "INCOMPLETE";

    return {
      id: a.id,
      studentName: a.user?.name ?? null,
      studentEmail: a.user?.email ?? null,
      testTitle: a.test.title,
      status: a.status,
      startedAt: formatDateTime(a.startedAt),
      total: scored ? scaled.total : null,
      readingWriting: scored ? scaled.readingWriting : null,
      math: scored ? scaled.math : null,
      estimated: scoreFidelity === "ESTIMATE",
    };
  });

  return (
    <>
      <PageHeader
        title="Attempts"
        description="Every test attempt across your platform, with computed scaled scores."
        actions={
          <Button asChild variant="secondary" size="sm" className="hover-lift active-press">
            <a href="/api/admin/export/attempts" download>
              <Download className="mr-1.5 h-4 w-4" />
              Export question CSV
            </a>
          </Button>
        }
      />

      <div className="animate-fade-in">
        <AttemptsTable
          rows={rows}
          total={total}
          pageSize={PAGE_SIZE}
          tests={tests}
          status={statusFilter}
          testId={testIdFilter}
        />
      </div>
    </>
  );
}
