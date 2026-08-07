"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteQuestion,
  getQuestionAssignments,
  type QuestionAssignment,
} from "@/app/admin/questions/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
} from "@/components/ui/modal";
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
 *
 * On `Modal` since T1.5. The hand-rolled version it replaced had no focus trap
 * — Tab walked out of the panel into the page behind it — and re-implemented
 * Esc as a `window` keydown listener, which fired for every mounted instance
 * whether or not it was the top layer.
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

  if (!questionId) return null;

  const empty = assignments && assignments.length === 0;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        // Nothing dismisses a delete that is already in flight.
        if (!next && !pending) onClose();
      }}
    >
      <ModalContent
        variant="destructive"
        size="lg"
        dismissable={!pending}
        title="Delete this question?"
        description={
          assignments === null
            ? "Checking which tests use this question…"
            : empty
              ? "This question is not assigned to any test. It will be permanently deleted from the question bank."
              : "This question is currently assigned to the modules below. Removing it will also remove it from those tests."
        }
      >
        <ModalBody>
          {loadingAssignments && !assignments ? (
            <p className="text-body text-muted-foreground">
              Loading assignments…
            </p>
          ) : empty ? null : (
            <ul className="space-y-2 rounded-lg border border-border bg-paper-sunk p-3 text-body">
              {(assignments ?? []).map((a) => (
                <li key={a.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked
                    readOnly
                    disabled
                    aria-label="Affected module"
                    className="mt-1 shrink-0 cursor-not-allowed accent-destructive"
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
          )}

          {error && (
            <Alert variant="destructive" live title="Delete failed" className="mt-4">
              {error}
            </Alert>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            loading={pending}
            disabled={loadingAssignments}
          >
            {pending ? "Deleting…" : "Delete permanently"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
