"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";

/** One user's recent attempts (T1.9). Client mode — the query takes 20. */

export interface UserAttemptRow {
  id: string;
  testTitle: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "EXPIRED";
  statusLabel: string;
  /** `null` when unscored or INCOMPLETE. */
  total: number | null;
  estimated: boolean;
  /** Already formatted — `formatDate` pins the locale, so the server owns it. */
  started: string;
  /** The sortable value behind `started`: "6 Aug 2026" does not order as text. */
  startedAtMs: number;
}

const columns: ReadonlyArray<Column<UserAttemptRow>> = [
  {
    key: "test",
    header: "Test",
    sortable: true,
    cell: (row) => <span className="font-medium">{row.testTitle}</span>,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    cell: (row) => (
      <Badge
        variant={
          row.status === "COMPLETED"
            ? "success"
            : row.status === "IN_PROGRESS"
              ? "warning"
              : "muted"
        }
      >
        {row.statusLabel}
      </Badge>
    ),
    sortValue: (row) => row.statusLabel,
  },
  {
    key: "score",
    header: "Score",
    numeric: true,
    sortable: true,
    cell: (row) =>
      row.total === null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="font-semibold">
          {row.estimated ? `Est. ${row.total}` : row.total}
        </span>
      ),
    sortValue: (row) => row.total,
  },
  {
    key: "started",
    header: "Started",
    sortable: true,
    hideBelow: "sm",
    cell: (row) => <span className="text-caption text-muted-foreground">{row.started}</span>,
    sortValue: (row) => row.startedAtMs,
  },
  {
    key: "actions",
    header: "",
    srHeader: "Actions",
    width: "1%",
    cell: (row) => (
      <div className="text-right">
        <Button asChild variant="secondary" size="xs">
          <Link href={`/admin/attempts/${row.id}`}>Open</Link>
        </Button>
      </div>
    ),
    searchValue: () => "",
  },
];

export function UserAttemptsTable({ rows }: { rows: UserAttemptRow[] }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      paramPrefix="a"
      itemNoun="attempts"
      pageSize={10}
      defaultSort={{ key: "started", dir: "desc" }}
      search={{ placeholder: "Search attempts…" }}
      empty={{
        icon: Activity,
        title: "No attempts yet",
        description: "This user hasn't started any attempts yet.",
      }}
    />
  );
}
