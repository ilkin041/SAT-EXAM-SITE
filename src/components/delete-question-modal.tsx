"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteQuestion,
  getQuestionAssignments,
  type QuestionAssignment,
} from "@/app/admin/questions/actions";
import { useToast } from "./toast";

interface Props {
  open: boolean;
  questionId: string | null;
  /** If known up front (e.g. on the edit page), pass it to skip the fetch. */
  initialAssignments?: QuestionAssignment[];
  onClose: () => void;
  /** If set, navigate here on success. Defaults to `/admin/questions`. */
  redirectTo?: string;
}

/**
 * Confirmation modal for deleting a question from the bank. Lists every module
 * the question is assigned to so the admin sees the blast radius before
 * confirming. The checklist is informational only — there's no per-row choice;
 * the whole question is either kept or deleted.
 */
export function DeleteQuestionModal({
  open,
  questionId,
  initialAssignments,
  onClose,
  redirectTo = "/admin/questions",
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignments, setAssignments] = useState<QuestionAssignment[] | null>(
    initialAssignments ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  // Hydrate assignments on open when not pre-supplied.
  useEffect(() => {
    if (!open || !questionId) return;
    if (initialAssignments) {
      setAssignments(initialAssignments);
      return;
    }
    let cancelled = false;
    setLoadingAssignments(true);
    setError(null);
    void getQuestionAssignments(questionId)
      .then((data) => {
        if (!cancelled) setAssignments(data);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message || "Could not load assignments");
      })
      .finally(() => {
        if (!cancelled) setLoadingAssignments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, questionId, initialAssignments]);

  // Esc closes when the modal is open and we're not mid-delete.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  function onConfirm() {
    if (!questionId) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteQuestion(questionId);
      if (!res.ok) {
        setError(res.error || "Delete failed");
        return;
      }
      onClose();
      toast("Question deleted");
      router.push(redirectTo);
      router.refresh();
    });
  }

  if (!open || !questionId) return null;

  const empty = assignments && assignments.length === 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex animate-in fade-in items-center justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-labelledby="delete-q-title"
        className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl"
      >
        <h2 id="delete-q-title" className="text-lg font-semibold">
          Delete this question?
        </h2>

        {loadingAssignments && !assignments ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading assignments…</p>
        ) : empty ? (
          <p className="mt-3 text-sm text-muted-foreground">
            This question is not assigned to any test. It will be permanently deleted from
            the question bank.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              This question is currently assigned to the following modules. Removing it
              will also remove it from those tests.
            </p>
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 text-sm">
              {(assignments ?? []).map((a) => (
                <li key={a.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked
                    readOnly
                    disabled
                    aria-label="Affected module"
                    className="mt-0.5 shrink-0 cursor-not-allowed accent-destructive"
                  />
                  <span>
                    <span className="font-medium">{a.testTitle}</span>{" "}
                    <span className="text-muted-foreground">
                      → {a.sectionType === "READING_WRITING" ? "Reading & Writing" : "Math"}{" "}
                      → Module {a.moduleNumber}
                      {a.difficulty !== "MIXED" && ` (${a.difficulty})`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {error && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || loadingAssignments}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
