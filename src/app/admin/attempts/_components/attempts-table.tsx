"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import type { AttemptStatus } from "@prisma/client";
import {
  DataTable,
  DataTableFilter,
  type Column,
} from "@/components/ui/data-table";

/**
 * The attempts list (T1.9).
 *
 * Server mode: the page owns the `where`, the `orderBy` and the page slice, and
 * hands one page of already-scored rows across. Scores are the reason the
 * columns that show them are not sortable — no score is persisted anywhere, so
 * `scaled.total` exists only after `computeScaledScores` has run over the rows
 * the query already returned. Sorting on it would mean scoring every attempt in
 * the table on every request.
 */

export interface AttemptRow {
  id: string;
  studentName: string | null;
  studentEmail: string | null;
  testTitle: string;
  status: AttemptStatus;
  /** Already formatted — `formatDate` pins the locale, so the server owns it. */
  startedAt: string;
  /** `null` whenever the attempt is unscored or its fidelity is INCOMPLETE. */
  total: number | null;
  readingWriting: number | null;
  math: number | null;
  /** Prefixes the total with "Est." without a second enum crossing the wire. */
  estimated: boolean;
}

export interface TestOption {
  id: string;
  title: string;
}

const columns: ReadonlyArray<Column<AttemptRow>> = [
  {
    key: "student",
    header: "Student",
    sortable: true,
    cell: (row) => (
      <>
        <Link
          href={`/admin/attempts/${row.id}`}
          className="block font-semibold text-foreground transition-colors hover:text-primary"
        >
          {row.studentName ??
            row.studentEmail ?? (
              <span className="font-normal italic text-muted-foreground">
                anonymous
              </span>
            )}
        </Link>
        {row.studentName && row.studentEmail && (
          <div className="text-caption font-medium text-muted-foreground">
            {row.studentEmail}
          </div>
        )}
      </>
    ),
  },
  {
    key: "test",
    header: "Test name",
    sortable: true,
    cell: (row) => <span className="font-medium text-foreground">{row.testTitle}</span>,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    cell: (row) => <StatusPill status={row.status} />,
  },
  {
    key: "total",
    header: "Total",
    numeric: true,
    cell: (row) =>
      row.total === null ? (
        "—"
      ) : (
        <span className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-caption font-extrabold text-primary shadow-xs">
          {row.estimated ? `Est. ${row.total}` : row.total}
        </span>
      ),
  },
  {
    key: "readingWriting",
    header: "R&W",
    numeric: true,
    hideBelow: "md",
    cell: (row) => (
      <span className="font-semibold text-muted-foreground">
        {row.readingWriting ?? "—"}
      </span>
    ),
  },
  {
    key: "math",
    header: "Math",
    numeric: true,
    hideBelow: "md",
    cell: (row) => (
      <span className="font-semibold text-muted-foreground">{row.math ?? "—"}</span>
    ),
  },
  {
    key: "startedAt",
    header: "Started at",
    sortable: true,
    hideBelow: "sm",
    cell: (row) => (
      <span className="text-caption text-muted-foreground">{row.startedAt}</span>
    ),
  },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ABANDONED", label: "Abandoned" },
  { value: "EXPIRED", label: "Expired" },
];

export function AttemptsTable({
  rows,
  total,
  pageSize,
  tests,
  status,
  testId,
}: {
  rows: AttemptRow[];
  total: number;
  pageSize: number;
  tests: TestOption[];
  status?: string;
  testId?: string;
}) {
  return (
    <DataTable
      mode="server"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      total={total}
      pageSize={pageSize}
      itemNoun="attempts"
      defaultSort={{ key: "startedAt", dir: "desc" }}
      search={{ placeholder: "Search by student email or name…" }}
      filtersActive={Boolean(status || testId)}
      filterParams={["status", "testId"]}
      empty={{
        icon: Activity,
        title: "No attempts yet",
        description: "Attempts appear here as soon as a student starts a test.",
      }}
      filters={
        <>
          <DataTableFilter
            param="status"
            value={status}
            label="Attempt status"
            options={STATUS_OPTIONS}
            className="w-full sm:w-44"
          />
          <DataTableFilter
            param="testId"
            value={testId}
            label="Test"
            options={[
              { value: "", label: "All tests" },
              ...tests.map((test) => ({ value: test.id, label: test.title })),
            ]}
            className="w-full sm:w-56"
          />
        </>
      }
    />
  );
}

function StatusPill({ status }: { status: AttemptStatus }) {
  const styles: Record<AttemptStatus, string> = {
    IN_PROGRESS:
      "border-amber-500/20 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-950/40 dark:text-amber-200 animate-pulse",
    COMPLETED:
      "border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-300",
    ABANDONED: "border-border bg-muted text-muted-foreground",
    EXPIRED:
      "border-red-500/20 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  };
  const labels: Record<AttemptStatus, string> = {
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    ABANDONED: "Abandoned",
    EXPIRED: "Expired",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-caption font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
