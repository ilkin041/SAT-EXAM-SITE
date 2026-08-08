"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { deleteGroup } from "../actions";

/**
 * The groups list (T1.9). Client mode — every group is already in hand.
 *
 * The row actions stay `<form action={serverAction}>`: a client component may
 * import a `"use server"` action directly, so moving the table into an island
 * costs the delete path nothing and it still works without JavaScript.
 */

export interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  studentCount: number;
  testCount: number;
}

const columns: ReadonlyArray<Column<GroupRow>> = [
  {
    key: "name",
    header: "Group name",
    sortable: true,
    cell: (row) => <span className="font-medium text-foreground">{row.name}</span>,
  },
  {
    key: "description",
    header: "Description",
    hideBelow: "md",
    cell: (row) => (
      <span className="text-muted-foreground">{row.description || "—"}</span>
    ),
  },
  {
    key: "students",
    header: "Students",
    numeric: true,
    sortable: true,
    cell: (row) => <span className="font-semibold text-foreground">{row.studentCount}</span>,
    sortValue: (row) => row.studentCount,
  },
  {
    key: "tests",
    header: "Assigned tests",
    numeric: true,
    sortable: true,
    hideBelow: "sm",
    cell: (row) => <span className="font-semibold text-foreground">{row.testCount}</span>,
    sortValue: (row) => row.testCount,
  },
  {
    key: "actions",
    header: "",
    srHeader: "Actions",
    width: "1%",
    cell: (row) => (
      <div className="flex justify-end gap-2">
        <Button asChild variant="secondary" size="xs">
          <Link href={`/admin/groups/${row.id}`}>Manage</Link>
        </Button>
        <form action={deleteGroup.bind(null, row.id)}>
          <Button type="submit" variant="destructive" size="xs">
            Delete
          </Button>
        </form>
      </div>
    ),
    searchValue: () => "",
  },
];

export function GroupsTable({ rows }: { rows: GroupRow[] }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      itemNoun="groups"
      defaultSort={{ key: "name", dir: "asc" }}
      search={{ placeholder: "Search groups…" }}
      empty={{
        icon: Users,
        title: "No groups yet",
        description: "Create your first group above to start organizing students.",
      }}
    />
  );
}
