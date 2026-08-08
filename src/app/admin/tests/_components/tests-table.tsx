"use client";

import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableFilter, type Column } from "@/components/ui/data-table";
import { DuplicateTestButton } from "./duplicate-test-button";

/**
 * The tests list (T1.9).
 *
 * Client mode: the whole list is one query with no `take`, so search, sort and
 * paging can happen in the browser and a filter change costs no round trip.
 * The URL still carries every one of them.
 */

export interface TestRow {
  id: string;
  title: string;
  mode: "ADAPTIVE" | "LINEAR";
  isPublic: boolean;
  questionCount: number;
  attemptCount: number;
  /** Already formatted — `formatDate` pins the locale, so the server owns it. */
  created: string;
  /** The sortable value behind `created`: "6 Aug 2026" does not order as text. */
  createdAtMs: number;
}

const columns: ReadonlyArray<Column<TestRow>> = [
  {
    key: "title",
    header: "Title",
    sortable: true,
    cell: (row) => (
      <Link
        href={`/admin/tests/${row.id}`}
        className="font-semibold text-foreground transition-colors hover:text-primary"
      >
        {row.title}
      </Link>
    ),
  },
  {
    key: "mode",
    header: "Mode",
    sortable: true,
    hideBelow: "sm",
    cell: (row) => (
      <Badge variant={row.mode === "ADAPTIVE" ? "purple" : "info"}>{row.mode}</Badge>
    ),
    sortValue: (row) => row.mode,
  },
  {
    key: "visibility",
    header: "Visibility",
    sortable: true,
    hideBelow: "sm",
    cell: (row) => (
      <Badge variant={row.isPublic ? "success" : "outline"}>
        {row.isPublic ? "Public" : "Private"}
      </Badge>
    ),
    // The cell renders "Public"/"Private", which happens to sort correctly — but
    // the boolean is what the column means, so it says so.
    sortValue: (row) => (row.isPublic ? 1 : 0),
  },
  {
    key: "questions",
    header: "Questions",
    numeric: true,
    sortable: true,
    hideBelow: "md",
    cell: (row) => (
      <span className="font-medium text-muted-foreground">{row.questionCount}</span>
    ),
    sortValue: (row) => row.questionCount,
  },
  {
    key: "attempts",
    header: "Attempts",
    numeric: true,
    sortable: true,
    hideBelow: "md",
    cell: (row) => (
      <span className="font-medium text-muted-foreground">{row.attemptCount}</span>
    ),
    sortValue: (row) => row.attemptCount,
  },
  {
    key: "created",
    header: "Created",
    sortable: true,
    hideBelow: "lg",
    cell: (row) => <span className="text-caption text-muted-foreground">{row.created}</span>,
    sortValue: (row) => row.createdAtMs,
  },
  {
    key: "actions",
    header: "",
    srHeader: "Actions",
    width: "1%",
    cell: (row) => (
      <div className="flex items-center justify-end gap-2">
        <DuplicateTestButton testId={row.id} originalTitle={row.title} />
        <Button asChild variant="secondary" size="xs" className="hover-lift active-press shadow-xs">
          <Link href={`/admin/tests/${row.id}`}>Open</Link>
        </Button>
      </div>
    ),
    // Nothing here is text worth matching, and without this the search box would
    // match every row on the word "Open".
    searchValue: () => "",
  },
];

const MODE_OPTIONS = [
  { value: "", label: "All modes" },
  { value: "ADAPTIVE", label: "Adaptive" },
  { value: "LINEAR", label: "Linear" },
];

const VISIBILITY_OPTIONS = [
  { value: "", label: "All visibility" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

export function TestsTable({
  rows,
  mode,
  visibility,
}: {
  rows: TestRow[];
  mode?: string;
  visibility?: string;
}) {
  // Client mode, so the filters narrow the rows here rather than in a `where`.
  const filtered = rows.filter((row) => {
    if (mode && row.mode !== mode) return false;
    if (visibility === "public" && !row.isPublic) return false;
    if (visibility === "private" && row.isPublic) return false;
    return true;
  });

  return (
    <DataTable
      columns={columns}
      rows={filtered}
      rowKey={(row) => row.id}
      itemNoun="tests"
      defaultSort={{ key: "created", dir: "desc" }}
      search={{ placeholder: "Search tests…" }}
      filtersActive={Boolean(mode || visibility)}
      filterParams={["mode", "visibility"]}
      empty={{
        icon: FileText,
        title: "No tests yet",
        description: "Create your first practice test to get started.",
        action: (
          // Solid: the navy AdminNav bar is the admin section's one gradient.
          <Button asChild className="active-press">
            <Link href="/admin/tests/new">
              <Plus className="h-4 w-4" />
              Create test
            </Link>
          </Button>
        ),
      }}
      filters={
        <>
          <DataTableFilter
            param="mode"
            value={mode}
            label="Test mode"
            options={MODE_OPTIONS}
            className="w-full sm:w-40"
          />
          <DataTableFilter
            param="visibility"
            value={visibility}
            label="Visibility"
            options={VISIBILITY_OPTIONS}
            className="w-full sm:w-44"
          />
        </>
      }
    />
  );
}
