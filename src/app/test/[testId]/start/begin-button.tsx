"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  testId: string;
}

/**
 * Best-effort: ask the browser for fullscreen as part of the user's click
 * gesture, then create the attempt and navigate into the test. Fullscreen is
 * not required — the click still proceeds if the user denies it.
 */
export function BeginButton({ testId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setError(null);
    try {
      // Request fullscreen first so the request comes inside the user gesture.
      await document.documentElement.requestFullscreen().catch(() => {});
    } catch {
      /* ignore */
    }
    startTransition(async () => {
      const res = await fetch(`/api/tests/${testId}/start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not start test.");
        return;
      }
      router.push(`/test/attempt/${data.attemptId}`);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Starting…" : "Begin test"}
      </button>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <p className="mt-3 text-xs text-muted-foreground">
        The test opens in fullscreen. Keyboard shortcuts: A/B/C/D choose an answer,{" "}
        <kbd className="rounded border border-border bg-muted px-1">←</kbd>{" "}
        /{" "}
        <kbd className="rounded border border-border bg-muted px-1">→</kbd>{" "}
        navigate,{" "}
        <kbd className="rounded border border-border bg-muted px-1">M</kbd>{" "}
        marks for review,{" "}
        <kbd className="rounded border border-border bg-muted px-1">E</kbd>{" "}
        toggles the answer eliminator.
      </p>
    </div>
  );
}
