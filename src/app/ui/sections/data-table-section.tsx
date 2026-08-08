"use client";

import * as React from "react";
import { formatDate } from "@/lib/format-date";
import { BookOpen, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import {
  DataTable,
  DataTableFilter,
  type Column,
} from "@/components/ui/data-table";
import { GallerySection, Row } from "../gallery-section";

/**
 * Client by necessity: `DataTable` reads and writes the URL, and a sort that
 * cannot be clicked is not a specimen. Both examples run in client mode, so
 * everything here works without a server route behind it — a server-mode table
 * looks identical and simply lets its page do the filtering.
 *
 * The two get different `paramPrefix` values because they share a page. Without
 * that, sorting one would page the other.
 */

interface Attempt {
  id: string;
  student: string;
  score: number | null;
  submittedAt: string;
}

const ATTEMPTS: Attempt[] = [
  { id: "a1", student: "Aysel Mammadova", score: 1310, submittedAt: "2026-05-18" },
  { id: "a2", student: "Rauf Aliyev", score: 1150, submittedAt: "2026-05-14" },
  { id: "a3", student: "Nigar Huseynova", score: 1420, submittedAt: "2026-05-09" },
  { id: "a4", student: "Elvin Guliyev", score: null, submittedAt: "2026-05-02" },
  { id: "a5", student: "Leyla Ismayilova", score: 1080, submittedAt: "2026-04-27" },
  { id: "a6", student: "Kamran Safarov", score: 1260, submittedAt: "2026-04-21" },
  { id: "a7", student: "Zeynab Rzayeva", score: 1340, submittedAt: "2026-04-15" },
];

const ATTEMPT_COLUMNS: Column<Attempt>[] = [
  {
    key: "student",
    header: "Student",
    sortable: true,
    cell: (row) => <span className="font-medium text-foreground">{row.student}</span>,
  },
  {
    key: "score",
    header: "Score",
    numeric: true,
    sortable: true,
    width: "7rem",
    sortValue: (row) => row.score,
    cell: (row) => row.score ?? "—",
  },
  {
    key: "submittedAt",
    header: "Submitted",
    sortable: true,
    width: "9rem",
    // The cell renders "27 Apr 2026", which sorts alphabetically. ISO is the
    // value we actually mean by "submitted".
    sortValue: (row) => row.submittedAt,
    cell: (row) => formatDate(row.submittedAt),
  },
];

interface Question {
  id: string;
  code: string;
  stem: string;
  section: "English" | "Math";
  type: string;
  domain: string;
  difficulty: "Easy" | "Medium" | "Hard";
  uses: number;
  updatedAt: string;
}

const QUESTIONS: Question[] = [
  { id: "q1", code: "RW-104", stem: "Which choice completes the text with the most logical transition?", section: "English", type: "Multiple choice", domain: "Craft and Structure", difficulty: "Medium", uses: 4, updatedAt: "2026-05-20" },
  { id: "q2", code: "MA-211", stem: "If 3x + 7 = 22, what is the value of x?", section: "Math", type: "Student-produced", domain: "Algebra", difficulty: "Easy", uses: 12, updatedAt: "2026-05-18" },
  { id: "q3", code: "RW-118", stem: "Which finding, if true, would most directly weaken the researchers' claim?", section: "English", type: "Multiple choice", domain: "Information and Ideas", difficulty: "Hard", uses: 2, updatedAt: "2026-05-17" },
  { id: "q4", code: "MA-233", stem: "The function f is defined by f(x) = 2x² − 5x. What is f(4)?", section: "Math", type: "Multiple choice", domain: "Advanced Math", difficulty: "Medium", uses: 7, updatedAt: "2026-05-11" },
  { id: "q5", code: "RW-127", stem: "Which choice best states the main purpose of the passage?", section: "English", type: "Multiple choice", domain: "Craft and Structure", difficulty: "Easy", uses: 9, updatedAt: "2026-05-04" },
  { id: "q6", code: "MA-240", stem: "A circle in the xy-plane has centre (3, −2) and radius 5.", section: "Math", type: "Multiple choice", domain: "Geometry and Trigonometry", difficulty: "Hard", uses: 1, updatedAt: "2026-04-29" },
  { id: "q7", code: "RW-133", stem: "Which choice completes the text so that it conforms to the conventions of Standard English?", section: "English", type: "Multiple choice", domain: "Standard English Conventions", difficulty: "Medium", uses: 15, updatedAt: "2026-04-22" },
  { id: "q8", code: "MA-255", stem: "The scatterplot shows the relationship between two variables.", section: "Math", type: "Multiple choice", domain: "Problem-Solving and Data Analysis", difficulty: "Medium", uses: 3, updatedAt: "2026-04-18" },
  { id: "q9", code: "RW-141", stem: "Based on the texts, how would the author of Text 2 most likely respond?", section: "English", type: "Multiple choice", domain: "Information and Ideas", difficulty: "Hard", uses: 6, updatedAt: "2026-04-12" },
  { id: "q10", code: "MA-268", stem: "What is the y-intercept of the line 4x − 2y = 10?", section: "Math", type: "Student-produced", domain: "Algebra", difficulty: "Easy", uses: 11, updatedAt: "2026-04-06" },
  { id: "q11", code: "RW-149", stem: "Which quotation from the passage best supports the student's claim?", section: "English", type: "Multiple choice", domain: "Information and Ideas", difficulty: "Medium", uses: 5, updatedAt: "2026-03-30" },
  { id: "q12", code: "MA-274", stem: "A rectangular prism has a volume of 240 cubic centimetres.", section: "Math", type: "Student-produced", domain: "Geometry and Trigonometry", difficulty: "Medium", uses: 8, updatedAt: "2026-03-24" },
];

function difficultyVariant(difficulty: Question["difficulty"]) {
  if (difficulty === "Easy") return "success" as const;
  if (difficulty === "Hard") return "destructive" as const;
  return "warning" as const;
}

const QUESTION_COLUMNS: Column<Question>[] = [
  {
    key: "code",
    header: "Code",
    width: "6rem",
    sortable: true,
    hideBelow: "lg",
    cell: (row) => <span className="tabular text-muted-foreground">{row.code}</span>,
  },
  {
    key: "stem",
    header: "Question",
    sortable: true,
    cell: (row) => (
      <span className="line-clamp-2 text-foreground">{row.stem}</span>
    ),
  },
  {
    key: "section",
    header: "Section",
    width: "7rem",
    sortable: true,
    hideBelow: "sm",
    cell: (row) => (
      <Badge variant={row.section === "Math" ? "info" : "purple"}>
        {row.section}
      </Badge>
    ),
  },
  {
    key: "type",
    header: "Type",
    width: "9rem",
    hideBelow: "lg",
    cell: (row) => row.type,
  },
  {
    key: "domain",
    header: "Domain",
    width: "12rem",
    sortable: true,
    hideBelow: "md",
    cell: (row) => row.domain,
  },
  {
    key: "difficulty",
    header: "Difficulty",
    width: "7rem",
    sortable: true,
    // Alphabetical would read Easy, Hard, Medium. Difficulty has an order.
    sortValue: (row) => ({ Easy: 0, Medium: 1, Hard: 2 })[row.difficulty],
    cell: (row) => (
      <Badge variant={difficultyVariant(row.difficulty)}>{row.difficulty}</Badge>
    ),
  },
  {
    key: "uses",
    header: "Uses",
    numeric: true,
    sortable: true,
    width: "5rem",
    sortValue: (row) => row.uses,
    cell: (row) => row.uses,
  },
  {
    key: "updatedAt",
    header: "Updated",
    width: "8rem",
    sortable: true,
    hideBelow: "md",
    cell: (row) => (
      <span className="tabular text-muted-foreground">{row.updatedAt}</span>
    ),
  },
  {
    key: "actions",
    header: "",
    srHeader: "Actions",
    width: "5rem",
    cell: () => (
      <Button variant="ghost" size="sm" aria-label="Edit question">
        <Pencil className="h-4 w-4" aria-hidden />
      </Button>
    ),
  },
];

const SECTION_OPTIONS = [
  { value: "", label: "All sections" },
  { value: "English", label: "English" },
  { value: "Math", label: "Math" },
];

/**
 * The filter is a `DataTableFilter`, so the section lives in `?qbSection=`
 * alongside the table's own params rather than in component state — reload the
 * page and the filter is still applied. The rows are still narrowed here,
 * because this example is in client mode; a server-mode page would put the same
 * value into its `where` instead and nothing else would change.
 */
function QuestionBankExample() {
  const searchParams = useSearchParams();
  const section = searchParams.get("qbSection") ?? "";
  const rows = React.useMemo(
    () => (section ? QUESTIONS.filter((q) => q.section === section) : QUESTIONS),
    [section],
  );

  return (
    <DataTable
      columns={QUESTION_COLUMNS}
      rows={rows}
      rowKey={(row) => row.id}
      itemNoun="questions"
      pageSize={5}
      paramPrefix="qb"
      stickyHeader
      search={{ placeholder: "Search stem, domain…" }}
      defaultSort={{ key: "updatedAt", dir: "desc" }}
      filtersActive={Boolean(section)}
      filterParams={["qbSection"]}
      empty={{
        icon: BookOpen,
        title: "No questions in this section",
        description: "Clear the section filter to see the whole bank.",
      }}
      filters={
        <DataTableFilter
          param="qbSection"
          value={section}
          label="Section"
          options={SECTION_OPTIONS}
          paramPrefix="qb"
          className="w-44"
        />
      }
    />
  );
}

export function DataTableSpecimens() {
  return (
    <div>
      <Row
        label="Three columns"
        note="sort a header, then reload — the sort is in the URL, not in the component"
      >
        <DataTable
          columns={ATTEMPT_COLUMNS}
          rows={ATTEMPTS}
          rowKey={(row) => row.id}
          itemNoun="attempts"
          pageSize={4}
          paramPrefix="at"
          search
          defaultSort={{ key: "submittedAt", dir: "desc" }}
        />
      </Row>

      <Row
        label="Nine columns"
        note="narrow the pane: Code and Type drop below lg, Domain and Updated below md, Section below sm"
      >
        {/* `useSearchParams` opts its subtree into client rendering, and Next
            fails the build on a prerendered page holding one without a
            boundary. `DataTable` and `DataTableFilter` own theirs; this example
            reads the param itself, so it owns one too. */}
        <React.Suspense fallback={null}>
          <QuestionBankExample />
        </React.Suspense>
      </Row>

      <Row label="Loading" note="skeleton rows keep the column shape">
        <DataTable
          columns={ATTEMPT_COLUMNS}
          rows={[]}
          rowKey={(row) => row.id}
          itemNoun="attempts"
          paramPrefix="ld"
          loading
        />
      </Row>

      <Row label="Empty" note="no rows at all — distinct from a search that matched nothing">
        <DataTable
          columns={ATTEMPT_COLUMNS}
          rows={[]}
          rowKey={(row) => row.id}
          itemNoun="attempts"
          paramPrefix="mt"
          empty={{
            icon: BookOpen,
            title: "No attempts yet",
            description: "Assign a test to this group and results appear here.",
            action: <Button size="sm">Assign a test</Button>,
          }}
        />
      </Row>
    </div>
  );
}

export function DataTableSection() {
  return (
    <GallerySection
      id="data-table"
      title="DataTable"
      description={
        "Search, a filter slot, sortable headers and a pagination footer over " +
        "`Table`. Filter, sort and page state live in the URL — `?q=`, `?sort=`, " +
        "`?dir=`, `?page=` — so a filtered view survives a reload and can be " +
        "pasted to someone else; `paramPrefix` keeps two tables on one page apart. " +
        "`mode` chooses where the work happens: client mode takes every row and " +
        "does it here, server mode takes one page plus a `total` and lets the " +
        "page's own query do it. The same four params drive both. " +
        "`DataTableFilter` is the control the filter slot is for: a `Select` " +
        "that commits to the URL on change and resets the table's page, so a " +
        "filter bar never needs a Filter button."
      }
      viewports
    >
      <DataTableSpecimens />
    </GallerySection>
  );
}
