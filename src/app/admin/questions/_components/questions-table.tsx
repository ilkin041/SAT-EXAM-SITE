"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import {
  bulkAssignToModule,
  bulkDeleteQuestions,
  bulkSetDifficulty,
  type AssignableTest,
} from "../actions";
import { RowDeleteButton } from "./row-delete-button";
import { cn } from "@/lib/utils";

type Difficulty = "EASY" | "MEDIUM" | "HARD" | "MIXED";

export interface QuestionRow {
  id: string;
  stemPreview: string;
  sectionType: "READING_WRITING" | "MATH";
  type: "MULTIPLE_CHOICE" | "STUDENT_PRODUCED_RESPONSE";
  domain: string;
  difficulty: Difficulty;
  assignmentCount: number;
}

interface Props {
  rows: QuestionRow[];
  assignableTests: AssignableTest[];
}

/**
 * Sortable, selectable questions table. Built around shadcn-style primitives
 * to match the rest of the admin UI. Selection is local component state; bulk
 * actions hit dedicated server actions and re-fetch the route on success.
 */
export function QuestionsTable({ rows, assignableTests }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  // Open-state flags for the action dialogs.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [difficultyOpen, setDifficultyOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  // Stale-selection cleanup: if rows change (filter applied), drop ids that
  // are no longer in view.
  const visibleIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);

  function toggleOne(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }
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

  function runBulkDifficulty(difficulty: "EASY" | "MEDIUM" | "HARD") {
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

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-12 px-6 py-4">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={
                      rows.length > 0 &&
                      rows.every((r) => selected.has(r.id))
                    }
                    ref={(el) => {
                      if (!el) return;
                      const anySelected = rows.some((r) => selected.has(r.id));
                      const allSelected = rows.every((r) => selected.has(r.id));
                      el.indeterminate = anySelected && !allSelected;
                    }}
                    onChange={selectAll}
                    className="h-4 w-4 cursor-pointer rounded border-input text-primary focus:ring-ring"
                  />
                </th>
                <th className="px-6 py-4 font-semibold">Stem</th>
                <th className="px-6 py-4 font-semibold">Section</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Domain</th>
                <th className="px-6 py-4 font-semibold">Difficulty</th>
                <th className="px-6 py-4 font-semibold">Used in</th>
                <th className="px-6 py-4 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((r) => {
                const isSelected = selected.has(r.id);
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "transition-colors hover:bg-muted/30",
                      isSelected && "bg-primary/5",
                    )}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        aria-label="Select question"
                        checked={isSelected}
                        onChange={() => toggleOne(r.id)}
                        className="h-4 w-4 cursor-pointer rounded border-input text-primary focus:ring-ring"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/questions/${r.id}`}
                        className="line-clamp-2 max-w-md font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {r.stemPreview}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={r.sectionType === "MATH" ? "purple" : "success"}>
                        {r.sectionType === "MATH" ? "Math" : "R&W"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={r.type === "MULTIPLE_CHOICE" ? "outline" : "info"}>
                        {r.type === "MULTIPLE_CHOICE" ? "MC" : "SPR"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">{r.domain}</td>
                    <td className="px-6 py-4">
                      <Badge variant={difficultyVariant(r.difficulty)}>
                        {r.difficulty}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {r.assignmentCount === 0 ? (
                        <span className="text-xs text-muted-foreground font-medium">Unassigned</span>
                      ) : (
                        <Badge variant="secondary">
                          {r.assignmentCount} module{r.assignmentCount === 1 ? "" : "s"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/questions/${r.id}`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <RowDeleteButton questionId={r.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="ghost" onClick={() => setDifficultyOpen(false)}>
                Cancel
              </Button>
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
