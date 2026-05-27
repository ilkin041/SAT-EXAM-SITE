import Link from "next/link";
import { Activity, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  computeRawScores,
  computeScaledScores,
  type ScoringTable,
} from "@/lib/scoring";
import type { Prisma, AttemptStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Attempts — Admin" };

const PAGE_SIZE = 25;

export default async function AdminAttemptsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    testId?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const statusFilter = sp.status as AttemptStatus | undefined;
  const testIdFilter = sp.testId ?? undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

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
    statusFilter === "ABANDONED"
  ) {
    where.status = statusFilter;
  }
  if (testIdFilter) where.testId = testIdFilter;

  const [total, attempts, tests] = await Promise.all([
    prisma.testAttempt.count({ where }),
    prisma.testAttempt.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        user: { select: { email: true, name: true } },
        test: { select: { id: true, title: true, scoringTable: true } },
        moduleResults: {
          include: { module: { include: { section: { select: { type: true } } } } },
        },
      },
    }),
    prisma.test.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Compute scaled scores per attempt for display.
  const rows = attempts.map((a) => {
    const liveResults = a.moduleResults.filter(
      (r) => r.module && r.module.section,
    );
    const moduleResults = liveResults.map((r) => ({
      sectionType: r.module.section.type,
      correctCount: r.correctCount,
      totalCount: r.totalCount,
    }));
    const raw = computeRawScores(moduleResults);
    const scaled = computeScaledScores(
      raw,
      (a.test.scoringTable as ScoringTable | null) ?? null,
    );
    return { attempt: a, raw, scaled };
  });

  const qs = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q, status: statusFilter, testId: testIdFilter, page: String(page), ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "" && !(k === "page" && v === "1")) params.set(k, v);
    }
    const s = params.toString();
    return s ? `?${s}` : "";
  };

  const SELECT_CLS =
    "h-10 rounded-md border border-input bg-card px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <>
      <PageHeader
        title="Attempts"
        description="Every test attempt across your platform, with computed scaled scores."
      />

      <form
        method="get"
        className="mb-6 rounded-xl border border-border bg-card p-4 shadow-card"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by student email or name…"
              className="pl-9"
            />
          </div>
          <select name="status" defaultValue={statusFilter ?? ""} className={SELECT_CLS}>
            <option value="">All statuses</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="ABANDONED">Abandoned</option>
          </select>
          <select name="testId" defaultValue={testIdFilter ?? ""} className={SELECT_CLS}>
            <option value="">All tests</option>
            {tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <Button type="submit">Filter</Button>
        </div>
      </form>

      <p className="mb-3 text-xs text-muted-foreground">
        {total} attempt{total === 1 ? "" : "s"}
        {total > PAGE_SIZE && ` · page ${page} of ${totalPages}`}
      </p>

      {rows.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No attempts match"
          description="Try clearing some filters or broadening your search."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Student</th>
                <th className="px-4 py-2.5 font-medium">Test</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
                <th className="px-4 py-2.5 text-right font-medium">R&amp;W</th>
                <th className="px-4 py-2.5 text-right font-medium">Math</th>
                <th className="px-4 py-2.5 font-medium">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ attempt: a, scaled }) => (
                <tr key={a.id} className="hover:bg-accent/50">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/attempts/${a.id}`}
                      className="font-medium hover:underline"
                    >
                      {a.user?.name ?? a.user?.email ?? (
                        <span className="italic text-muted-foreground">anonymous</span>
                      )}
                    </Link>
                    {a.user?.name && a.user.email && (
                      <div className="text-xs text-muted-foreground">{a.user.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{a.test.title}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={a.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {a.status === "COMPLETED" ? scaled.total : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {a.status === "COMPLETED" ? scaled.readingWriting : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {a.status === "COMPLETED" ? scaled.math : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {a.startedAt.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/admin/attempts${qs({ page: String(page - 1) })}`}>
                ← Previous
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {page < totalPages ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/admin/attempts${qs({ page: String(page + 1) })}`}>
                Next →
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}

function StatusPill({ status }: { status: AttemptStatus }) {
  const styles: Record<AttemptStatus, string> = {
    IN_PROGRESS: "border-amber-400/40 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
    COMPLETED: "border-green-500/40 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300",
    ABANDONED: "border-border bg-muted text-muted-foreground",
  };
  const labels: Record<AttemptStatus, string> = {
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    ABANDONED: "Abandoned",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
