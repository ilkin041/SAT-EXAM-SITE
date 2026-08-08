"use client";

import * as React from "react";
import { BookOpen, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { removeStudentFromGroup, removeTestFromGroup } from "../../actions";

/**
 * The two tables on a group's detail page (T1.9).
 *
 * They share one page, so they take different `paramPrefix` values — `s` and
 * `t`. Without that they would share `?q=` and `?sort=` and searching the
 * student list would silently re-sort the test list.
 */

export interface GroupMemberRow {
  id: string;
  name: string | null;
  email: string;
  completedCount: number;
  /** `null` when the member has no FULL_LENGTH attempts to average. */
  average: number | null;
}

export interface GroupTestRow {
  id: string;
  title: string;
}

export function GroupMembersTable({
  groupId,
  rows,
}: {
  groupId: string;
  rows: GroupMemberRow[];
}) {
  const columns = React.useMemo<ReadonlyArray<Column<GroupMemberRow>>>(
    () => [
      {
        key: "member",
        header: "Name / email",
        sortable: true,
        cell: (row) => (
          <>
            <div className="font-medium text-foreground">{row.name || "—"}</div>
            <div className="text-caption text-muted-foreground">{row.email}</div>
          </>
        ),
        sortValue: (row) => row.name || row.email,
      },
      {
        key: "completed",
        header: "Completed",
        numeric: true,
        sortable: true,
        cell: (row) => row.completedCount,
        sortValue: (row) => row.completedCount,
      },
      {
        key: "average",
        header: "Avg.",
        numeric: true,
        sortable: true,
        cell: (row) => (
          <span className="font-semibold">{row.average ?? "—"}</span>
        ),
        sortValue: (row) => row.average,
      },
      {
        key: "actions",
        header: "",
        srHeader: "Actions",
        width: "1%",
        cell: (row) => (
          <div className="text-right">
            <form action={removeStudentFromGroup.bind(null, groupId, row.id)}>
              <Button
                type="submit"
                variant="ghost"
                size="xs"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Remove
              </Button>
            </form>
          </div>
        ),
        searchValue: () => "",
      },
    ],
    [groupId],
  );

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      paramPrefix="s"
      itemNoun="students"
      pageSize={15}
      defaultSort={{ key: "member", dir: "asc" }}
      search={{ placeholder: "Search students…" }}
      empty={{
        icon: User,
        title: "No students",
        description:
          "Add students by email to give them access to this group's tests.",
      }}
    />
  );
}

export function GroupTestsTable({
  groupId,
  rows,
}: {
  groupId: string;
  rows: GroupTestRow[];
}) {
  const columns = React.useMemo<ReadonlyArray<Column<GroupTestRow>>>(
    () => [
      {
        key: "title",
        header: "Test title",
        sortable: true,
        cell: (row) => <span className="font-medium text-foreground">{row.title}</span>,
      },
      {
        key: "actions",
        header: "",
        srHeader: "Actions",
        width: "1%",
        cell: (row) => (
          <div className="text-right">
            <form action={removeTestFromGroup.bind(null, groupId, row.id)}>
              <Button
                type="submit"
                variant="ghost"
                size="xs"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Remove
              </Button>
            </form>
          </div>
        ),
        searchValue: () => "",
      },
    ],
    [groupId],
  );

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      paramPrefix="t"
      itemNoun="tests"
      pageSize={15}
      defaultSort={{ key: "title", dir: "asc" }}
      search={{ placeholder: "Search assigned tests…" }}
      empty={{
        icon: BookOpen,
        title: "No tests assigned",
        description: "Assign tests to make them visible to students in this group.",
      }}
    />
  );
}
