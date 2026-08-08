"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Copy,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableFilter,
  type Column,
} from "@/components/ui/data-table";
import { useToast } from "@/components/toast";
import {
  bulkAssignToModule,
  bulkDeleteQuestions,
  bulkSetDomain,
  bulkSetDifficulty,
  bulkSetSkill,
  type AssignableTest,
} from "../actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { RowDeleteButton } from "./row-delete-button";
import { ALL_QUESTION_DOMAINS } from "@/lib/question-taxonomy";

type Difficulty = "EASY" | "MEDIUM" | "HARD" | "MIXED";

export interface QuestionRow {
  id: string;
  stemPreview: string;
  sectionType: "READING_WRITING" | "MATH";
  type: "MULTIPLE_CHOICE" | "STUDENT_PRODUCED_RESPONSE";
  domain: string;
  difficulty: Difficulty;
  assignmentCount: number;
  /** Already formatted — `formatDate` pins the locale, so the server owns it. */
  updatedAt: string;
}

interface Props {
  rows: QuestionRow[];
  assignableTests: AssignableTest[];
  /** Rows across every page — the bank is paged 100 at a time on the server. */
  total: number;
  pageSize: number;
  domains: readonly string[];
  section?: string;
  type?: string;
  difficulty?: string;
  domain?: string;
}

const SECTION_OPTIONS = [
  { value: "", label: "All sections" },
  { value: "READING_WRITING", label: "English (R&W)" },
  { value: "MATH", label: "Math" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
  { value: "STUDENT_PRODUCED_RESPONSE", label: "Student-produced" },
];

const DIFFICULTY_OPTIONS = [
  { value: "", label: "All difficulties" },
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
  { value: "MIXED", label: "Mixed" },
];

/**
 * Sortable, selectable questions table (T1.9: now over `DataTable`).
 *
 * **Server mode.** The bank is paged 100 at a time by the route, and search,
 * sort, filters and page all live in `?q= ?sort= ?dir= ?page=` plus the four
 * filter params — so a filtered view of the bank is a link.
 *
 * Selection stays local component state, and it is deliberately scoped to the
 * page in view: `selectedIdsInView()` intersects with the visible rows before
 * every bulk action, so a selection made on page 1 cannot silently delete rows
 * the reader has since navigated away from.
 */
export function QuestionsTable({
  rows,
  assignableTests,
  total,
  pageSize,
  domains,
  section,
  type,
  difficulty,
  domain,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  // Open-state flags for the action dialogs.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [difficultyOpen, setDifficultyOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [metadataMode, setMetadataMode] = useState<"domain" | "skill" | null>(null);
  const [metadataValue, setMetadataValue] = useState("");

  // Stale-selection cleanup: if rows change (filter applied), drop ids that
  // are no longer in view.
  const visibleIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);

  const toggleOne = useCallback((id: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const selectAll = useCallback(() => {
    setSelected((cur) =>
      cur.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
    );
  }, [rows]);
  function clearSelection() {
    setSelected(new Set());
  }

  // Intersect with currently-visible rows for action payloads.
  function selectedIdsInView(): string[] {
    return Array.from(selected).filter((id) => visibleIds.has(id));
  }

  // Affected-modules count for the bulk-delete copy. Uses summed assignment
  // counts from the currently-selected rows — close enough for the warning.
  const selectedRows = rows.filter((r) => selected.has(r.id));
  const affectedModules = selectedRows.reduce(
    (sum, r) => sum + r.assignmentCount,
    0,
  );

  function runBulkDelete() {
    const ids = selectedIdsInView();
    startTransition(async () => {
      const res = await bulkDeleteQuestions(ids);
      if (!res.ok) {
        toast(res.error || "Delete failed", "error");
        return;
      }
      toast(`Deleted ${res.deleted} question${res.deleted === 1 ? "" : "s"}.`);
      clearSelection();
      setDeleteOpen(false);
      router.refresh();
    });
  }

  function runBulkDifficulty(difficulty: Difficulty) {
    const ids = selectedIdsInView();
    startTransition(async () => {
      const res = await bulkSetDifficulty(ids, difficulty);
      if (!res.ok) {
        toast(res.error || "Update failed", "error");
        return;
      }
      toast(
        `Updated ${res.updated} question${res.updated === 1 ? "" : "s"} → ${difficulty.toLowerCase()}.`,
      );
      clearSelection();
      setDifficultyOpen(false);
      router.refresh();
    });
  }

  function openMetadata(mode: "domain" | "skill") {
    setMetadataValue(mode === "domain" ? ALL_QUESTION_DOMAINS[0] : "");
    setMetadataMode(mode);
  }

  function runBulkMetadata() {
    const ids = selectedIdsInView();
    const mode = metadataMode;
    if (!mode) return;
    startTransition(async () => {
      const res =
        mode === "domain"
          ? await bulkSetDomain(ids, metadataValue)
          : await bulkSetSkill(ids, metadataValue);
      if (!res.ok) {
        toast(res.error || "Update failed", "error");
        return;
      }
      toast(`Updated ${res.updated} question${res.updated === 1 ? "" : "s"}.`);
      clearSelection();
      setMetadataMode(null);
      router.refresh();
    });
  }

  function runBulkAssign(moduleId: string) {
    const ids = selectedIdsInView();
    startTransition(async () => {
      const res = await bulkAssignToModule(ids, moduleId);
      if (!res.ok) {
        toast(res.error || "Assign failed", "error");
        return;
      }
      const skippedMsg = res.skipped > 0 ? ` · skipped ${res.skipped}` : "";
      toast(
        `Assigned ${res.assigned} to ${res.moduleSummary}${skippedMsg}.`,
      );
      clearSelection();
      setAssignOpen(false);
      router.refresh();
    });
  }

  const hasSelection = selected.size > 0;
  const selectedCount = selected.size;
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const anySelected = rows.some((r) => selected.has(r.id));

  const columns = useMemo<ReadonlyArray<Column<QuestionRow>>>(
    () => [
      {
        key: "select",
        header: "",
        srHeader: "Select",
        width: "3rem",
        headerCell: (
          <input
            type="checkbox"
            aria-label="Select all"
            checked={allSelected}
            ref={(el) => {
              if (!el) return;
              el.indeterminate = anySelected && !allSelected;
            }}
            onChange={selectAll}
            className="h-4 w-4 cursor-pointer rounded border-input text-primary"
          />
        ),
        cell: (row) => (
          <input
            type="checkbox"
            aria-label={`Select question: ${row.stemPreview.slice(0, 60)}`}
            checked={selected.has(row.id)}
            onChange={() => toggleOne(row.id)}
            className="h-4 w-4 cursor-pointer rounded border-input text-primary"
          />
        ),
        searchValue: () => "",
      },
      {
        key: "stem",
        header: "Stem",
        sortable: true,
        cell: (row) => (
          <Link
            href={`/admin/questions/${row.id}`}
            className="line-clamp-2 max-w-md font-semibold text-foreground transition-colors hover:text-primary"
          >
            {row.stemPreview}
          </Link>
        ),
      },
      {
        key: "section",
        header: "Section",
        sortable: true,
        hideBelow: "sm",
        cell: (row) => (
          <Badge variant={row.sectionType === "MATH" ? "purple" : "success"}>
            {row.sectionType === "MATH" ? "Math" : "R&W"}
          </Badge>
        ),
      },
      {
        key: "type",
        header: "Type",
        sortable: true,
        hideBelow: "lg",
        cell: (row) => (
          <Badge variant={row.type === "MULTIPLE_CHOICE" ? "outline" : "info"}>
            {row.type === "MULTIPLE_CHOICE" ? "MC" : "SPR"}
          </Badge>
        ),
      },
      {
        key: "domain",
        header: "Domain",
        sortable: true,
        hideBelow: "md",
        cell: (row) => (
          <span className="font-medium text-muted-foreground">{row.domain}</span>
        ),
      },
      {
        key: "difficulty",
        header: "Difficulty",
        sortable: true,
        hideBelow: "sm",
        cell: (row) => (
          <Badge variant={difficultyVariant(row.difficulty)}>{row.difficulty}</Badge>
        ),
      },
      {
        key: "usedIn",
        header: "Used in",
        sortable: true,
        hideBelow: "lg",
        cell: (row) =>
          row.assignmentCount === 0 ? (
            <span className="text-caption font-medium text-muted-foreground">
              Unassigned
            </span>
          ) : (
            <Badge variant="secondary">
              {row.assignmentCount} module{row.assignmentCount === 1 ? "" : "s"}
            </Badge>
          ),
      },
      {
        key: "updated",
        header: "Updated",
        sortable: true,
        hideBelow: "md",
        cell: (row) => (
          <span className="text-caption text-muted-foreground">{row.updatedAt}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        srHeader: "Actions",
        width: "1%",
        cell: (row) => (
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/admin/questions/new?clone=${row.id}`}
              className="rounded-lg p-1.5 text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground"
              aria-label="Clone"
              title="Clone question"
            >
              <Copy className="h-4 w-4" />
            </Link>
            <Link
              href={`/admin/questions/${row.id}`}
              className="rounded-lg p-1.5 text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground"
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </Link>
            <RowDeleteButton questionId={row.id} />
          </div>
        ),
        searchValue: () => "",
      },
    ],
    [allSelected, anySelected, selectAll, selected, toggleOne],
  );

  const filtersActive = Boolean(section || type || difficulty || domain);

  return (
    <>
      {/* ----- Sticky bulk action bar ----- */}
      {hasSelection && (
        <div className="sticky top-14 z-30 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 shadow-card backdrop-blur-sm">
          <span className="text-sm font-semibold text-foreground">
            {selectedCount} question{selectedCount === 1 ? "" : "s"} selected
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setAssignOpen(true)}
            >
              Assign to module
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDifficultyOpen(true)}
            >
              Change difficulty
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => openMetadata("domain")}>
              Change domain
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => openMetadata("skill")}>
              Change skill
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete selected
            </Button>
            <button
              type="button"
              onClick={clearSelection}
              className="ml-1 rounded-md p-1 text-muted-foreground hover:bg-card"
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <DataTable
        mode="server"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        total={total}
        pageSize={pageSize}
        itemNoun="questions"
        defaultSort={{ key: "updated", dir: "desc" }}
        search={{ placeholder: "Search stem, passage, domain…" }}
        filtersActive={filtersActive}
        filterParams={["section", "type", "difficulty", "domain"]}
        empty={{
          icon: BookOpen,
          title: "No questions yet",
          description: "Add your first question to start building the bank.",
          action: (
            <Button asChild>
              <Link href="/admin/questions/new">
                <Plus className="h-4 w-4" />
                New question
              </Link>
            </Button>
          ),
        }}
        filters={
          <>
            <DataTableFilter
              param="section"
              value={section}
              label="Section"
              options={SECTION_OPTIONS}
              className="w-full sm:w-40"
            />
            <DataTableFilter
              param="type"
              value={type}
              label="Question type"
              options={TYPE_OPTIONS}
              className="w-full sm:w-44"
            />
            <DataTableFilter
              param="difficulty"
              value={difficulty}
              label="Difficulty"
              options={DIFFICULTY_OPTIONS}
              className="w-full sm:w-40"
            />
            <DataTableFilter
              param="domain"
              value={domain}
              label="Domain"
              options={[
                { value: "", label: "All domains" },
                ...domains.map((option) => ({ value: option, label: option })),
              ]}
              className="w-full sm:w-56"
            />
          </>
        }
      />

      {/* ----- Delete confirm modal ----- */}
      <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-elevated data-[state=open]:animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-destructive/15 p-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <Dialog.Title className="text-lg font-semibold">
                Delete {selectedCount} question{selectedCount === 1 ? "" : "s"}?
              </Dialog.Title>
            </div>
            <Dialog.Description className="mt-3 text-sm text-muted-foreground">
              {affectedModules > 0 ? (
                <>
                  This will remove them from{" "}
                  <span className="font-medium text-foreground">
                    {affectedModules}
                  </span>{" "}
                  module assignment
                  {affectedModules === 1 ? "" : "s"}. Already-recorded student
                  answers stay, but the questions disappear from the bank and
                  every test that referenced them.
                </>
              ) : (
                "This permanently removes the selected questions from the bank."
              )}{" "}
              This action can&apos;t be undone.
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={runBulkDelete} loading={pending}>
                {pending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ----- Bulk difficulty modal ----- */}
      <Dialog.Root open={difficultyOpen} onOpenChange={setDifficultyOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-elevated data-[state=open]:animate-slide-up">
            <Dialog.Title className="text-lg font-semibold">
              Change difficulty for {selectedCount} question
              {selectedCount === 1 ? "" : "s"}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              Pick the new difficulty tag. This overrides whatever is currently
              set.
            </Dialog.Description>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                onClick={() => runBulkDifficulty("EASY")}
                variant="secondary"
                disabled={pending}
                className="justify-start"
              >
                <Badge variant="success">Easy</Badge>
              </Button>
              <Button
                onClick={() => runBulkDifficulty("MEDIUM")}
                variant="secondary"
                disabled={pending}
                className="justify-start"
              >
                <Badge variant="warning">Medium</Badge>
              </Button>
              <Button
                onClick={() => runBulkDifficulty("HARD")}
                variant="secondary"
                disabled={pending}
                className="justify-start"
              >
                <Badge variant="destructive">Hard</Badge>
              </Button>
              <Button
                onClick={() => runBulkDifficulty("MIXED")}
                variant="secondary"
                disabled={pending}
                className="justify-start"
              >
                <Badge variant="muted">Mixed</Badge>
              </Button>
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="ghost" onClick={() => setDifficultyOpen(false)}>
                Cancel
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={metadataMode !== null} onOpenChange={(open) => !open && setMetadataMode(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <Dialog.Title className="text-lg font-semibold">
              Change {metadataMode} for {selectedCount} question{selectedCount === 1 ? "" : "s"}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              This replaces the current {metadataMode} on every selected question.
            </Dialog.Description>
            <div className="mt-4">
              {metadataMode === "domain" ? (
                <Select
                  value={metadataValue || undefined}
                  onValueChange={setMetadataValue}
                >
                  <SelectTrigger aria-label="Domain" placeholder="Select a domain" />
                  <SelectContent>
                    {ALL_QUESTION_DOMAINS.map((domain) => (
                      <SelectItem key={domain} value={domain}>{domain}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <input
                  value={metadataValue}
                  onChange={(event) => setMetadataValue(event.target.value)}
                  placeholder="Leave blank to clear skill"
                  maxLength={200}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMetadataMode(null)}>Cancel</Button>
              <Button onClick={runBulkMetadata} loading={pending}>Apply</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ----- Bulk assign modal ----- */}
      <Dialog.Root open={assignOpen} onOpenChange={setAssignOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-elevated data-[state=open]:animate-slide-up">
            <Dialog.Title className="text-lg font-semibold">
              Assign {selectedCount} question{selectedCount === 1 ? "" : "s"} to
              a module
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              Pick the target module. Questions with mismatched section types
              and any already in the module will be skipped automatically.
            </Dialog.Description>
            <div className="mt-4 max-h-[50vh] overflow-y-auto rounded-lg border border-border">
              {assignableTests.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No tests have been created yet.
                </div>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {assignableTests.map((t) => (
                    <li key={t.testId} className="py-2">
                      <div className="px-3 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t.testTitle}
                      </div>
                      <ul className="mt-1">
                        {t.modules.map((m) => (
                          <li key={m.id}>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => runBulkAssign(m.id)}
                              className="flex w-full items-center justify-between px-3 py-1.5 text-left transition-colors hover:bg-accent disabled:opacity-50"
                            >
                              <span>{m.label}</span>
                              <CheckCircle2 className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="ghost" onClick={() => setAssignOpen(false)}>
                Cancel
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function difficultyVariant(
  d: Difficulty,
): "success" | "warning" | "destructive" | "muted" {
  if (d === "EASY") return "success";
  if (d === "MEDIUM") return "warning";
  if (d === "HARD") return "destructive";
  return "muted";
}
