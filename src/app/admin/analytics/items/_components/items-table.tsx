"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableFilter,
  type Column,
} from "@/components/ui/data-table";

/**
 * The item-analysis table (T1.9).
 *
 * Server mode, but not for the usual reason: p-value, exposure and mean time
 * are computed from every completed attempt rather than stored, so the page has
 * to build the whole analysis before it can filter, sort or slice it. Server
 * mode is what lets it hand over one page of that work already done.
 */

export interface ItemRow {
  id: string;
  stem: string;
  testTitles: string;
  domain: string;
  skill: string;
  difficulty: string;
  exposures: number;
  correct: number;
  /** 0–100, already rounded. */
  pValuePercent: number;
  /** `null` when nothing timed this item. */
  averageTimeSeconds: number | null;
  timedResponses: number;
  flags: { key: string; label: string; severe: boolean }[];
  responses: { response: string; isKey: boolean; count: number; percentage: number }[];
}

const columns: ReadonlyArray<Column<ItemRow>> = [
  {
    key: "question",
    header: "Question",
    sortable: true,
    width: "28rem",
    cell: (row) => (
      <div className="max-w-md">
        <Link
          href={`/admin/questions/${row.id}`}
          className="font-semibold text-primary hover:underline"
        >
          {row.stem || "Untitled question"}
        </Link>
        <div className="mt-1 text-caption text-muted-foreground">{row.testTitles}</div>
      </div>
    ),
  },
  {
    key: "taxonomy",
    header: "Taxonomy",
    sortable: true,
    hideBelow: "md",
    cell: (row) => (
      <div className="text-caption">
        <div className="font-medium">{row.domain}</div>
        <div className="text-muted-foreground">
          {row.skill || "No skill"} · {row.difficulty}
        </div>
      </div>
    ),
  },
  {
    key: "exposure",
    header: "Exposure",
    numeric: true,
    sortable: true,
    cell: (row) => row.exposures,
  },
  {
    key: "pValue",
    header: "p-value",
    numeric: true,
    sortable: true,
    cell: (row) => (
      <>
        <div className="font-bold">{row.pValuePercent}%</div>
        <div className="text-caption text-muted-foreground">
          {row.correct}/{row.exposures}
        </div>
      </>
    ),
  },
  {
    key: "time",
    header: "Avg. time",
    numeric: true,
    sortable: true,
    hideBelow: "sm",
    cell: (row) => (
      <>
        {row.averageTimeSeconds === null ? "—" : `${row.averageTimeSeconds}s`}
        <div className="text-caption text-muted-foreground">
          {row.timedResponses} timed
        </div>
      </>
    ),
  },
  {
    key: "flags",
    header: "Flags / responses",
    hideBelow: "lg",
    cell: (row) => (
      <div className="max-w-sm">
        <div className="flex flex-wrap gap-1">
          {row.flags.length === 0 ? (
            <Badge variant="muted">No flag</Badge>
          ) : (
            row.flags.map((flag) => (
              <Badge key={flag.key} variant={flag.severe ? "destructive" : "warning"}>
                {flag.label}
              </Badge>
            ))
          )}
        </div>
        <details className="mt-2 text-caption">
          <summary className="cursor-pointer font-semibold text-primary">
            Response frequencies
          </summary>
          <div className="mt-2 space-y-1">
            {row.responses.map((response) => (
              <div key={response.response} className="flex justify-between gap-4">
                <span
                  className={
                    response.isKey
                      ? "font-bold text-emerald-700 dark:text-emerald-300"
                      : "text-muted-foreground"
                  }
                >
                  {response.response}
                  {response.isKey ? " (key)" : ""}
                </span>
                <span className="tabular">
                  {response.count} · {response.percentage}%
                </span>
              </div>
            ))}
          </div>
        </details>
      </div>
    ),
  },
];

const SECTION_OPTIONS = [
  { value: "", label: "All sections" },
  { value: "READING_WRITING", label: "R&W" },
  { value: "MATH", label: "Math" },
];

const FLAG_OPTIONS = [
  { value: "", label: "All flags" },
  { value: "TOO_EASY", label: "Too easy" },
  { value: "TOO_HARD", label: "Too hard" },
  { value: "DISTRACTOR_OUTDRAWS_KEY", label: "Distractor outdraws key" },
];

export function ItemsTable({
  rows,
  total,
  pageSize,
  tests,
  testId,
  section,
  flag,
}: {
  rows: ItemRow[];
  total: number;
  pageSize: number;
  tests: { id: string; title: string }[];
  testId?: string;
  section?: string;
  flag?: string;
}) {
  return (
    <DataTable
      mode="server"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      total={total}
      pageSize={pageSize}
      itemNoun="items"
      defaultSort={{ key: "pValue", dir: "asc" }}
      search={{ placeholder: "Search stem, domain, or skill…" }}
      filtersActive={Boolean(testId || section || flag)}
      filterParams={["testId", "section", "flag"]}
      empty={{
        icon: BarChart3,
        title: "No analyzable items",
        description: "Complete attempts or broaden the current filters.",
      }}
      caption="Flags require at least five completed-attempt exposures: p ≥ 0.90 is too easy; p ≤ 0.30 is too hard."
      filters={
        <>
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
          <DataTableFilter
            param="section"
            value={section}
            label="Section"
            options={SECTION_OPTIONS}
            className="w-full sm:w-40"
          />
          <DataTableFilter
            param="flag"
            value={flag}
            label="Flag"
            options={FLAG_OPTIONS}
            className="w-full sm:w-56"
          />
        </>
      }
    />
  );
}
