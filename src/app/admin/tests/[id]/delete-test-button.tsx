"use client";

import { useTransition } from "react";
import { deleteTest } from "../actions";

export function DeleteTestButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (
      !confirm(
        "Delete this test permanently? All sections, modules, questions, and attempts will be removed.",
      )
    )
      return;
    startTransition(async () => {
      await deleteTest(id);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-md border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete test"}
    </button>
  );
}
