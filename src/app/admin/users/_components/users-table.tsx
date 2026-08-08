"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableFilter,
  type Column,
} from "@/components/ui/data-table";

/**
 * The users list (T1.9). Server mode — the page owns the `where`, the `orderBy`
 * and the slice.
 *
 * This replaces a `take: 100` with no pager, which silently hid the 101st user.
 */

export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "STUDENT";
  attemptCount: number;
  /** Already formatted — `formatDate` pins the locale, so the server owns it. */
  joined: string;
}

const columns: ReadonlyArray<Column<UserRow>> = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    cell: (row) => (
      <Link href={`/admin/users/${row.id}`} className="font-medium hover:underline">
        {row.name || <span className="italic text-muted-foreground">No name</span>}
      </Link>
    ),
  },
  {
    key: "email",
    header: "Email",
    sortable: true,
    cell: (row) => <span className="text-muted-foreground">{row.email}</span>,
  },
  {
    key: "role",
    header: "Role",
    sortable: true,
    cell: (row) => (
      <Badge variant={row.role === "ADMIN" ? "info" : "muted"}>{row.role}</Badge>
    ),
  },
  {
    key: "attempts",
    header: "Attempts",
    numeric: true,
    hideBelow: "sm",
    cell: (row) => <span className="text-muted-foreground">{row.attemptCount}</span>,
  },
  {
    key: "joined",
    header: "Joined",
    sortable: true,
    hideBelow: "md",
    cell: (row) => <span className="text-caption text-muted-foreground">{row.joined}</span>,
  },
  {
    key: "actions",
    header: "",
    srHeader: "Actions",
    width: "1%",
    cell: (row) => (
      <div className="text-right">
        <Button asChild variant="secondary" size="xs">
          <Link href={`/admin/users/${row.id}`}>Open</Link>
        </Button>
      </div>
    ),
  },
];

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "STUDENT", label: "Students" },
  { value: "ADMIN", label: "Admins" },
];

export function UsersTable({
  rows,
  total,
  pageSize,
  role,
}: {
  rows: UserRow[];
  total: number;
  pageSize: number;
  role?: string;
}) {
  return (
    <DataTable
      mode="server"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      total={total}
      pageSize={pageSize}
      itemNoun="users"
      defaultSort={{ key: "joined", dir: "desc" }}
      search={{ placeholder: "Search by name or email…" }}
      filtersActive={Boolean(role)}
      filterParams={["role"]}
      empty={{
        icon: Users,
        title: "No users yet",
        description: "Students who sign up will appear here.",
      }}
      filters={
        <DataTableFilter
          param="role"
          value={role}
          label="Role"
          options={ROLE_OPTIONS}
          className="w-full sm:w-44"
        />
      }
    />
  );
}
