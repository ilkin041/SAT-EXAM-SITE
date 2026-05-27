"use client";

import { useState } from "react";
import { DeleteQuestionModal } from "@/components/delete-question-modal";

/**
 * The "✕" button on each question-bank row. Opens the delete modal lazily —
 * the modal itself fetches the question's assignments via the server action,
 * so the list page doesn't have to over-query.
 */
export function RowDeleteButton({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        title="Delete question"
        aria-label="Delete question"
        className="rounded p-1 text-xs text-destructive hover:bg-destructive/10"
      >
        ✕
      </button>
      <DeleteQuestionModal
        open={open}
        questionId={questionId}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
