"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <Button
        type="button"
        onClick={go}
        loading={pending}
        size="lg"
        className="w-full sm:w-auto"
      >
        {pending ? "Starting…" : "Begin test"}
        {!pending && <ArrowRight className="h-4 w-4" />}
      </Button>
      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
