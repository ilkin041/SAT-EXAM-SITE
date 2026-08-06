"use client";

import * as React from "react";
import { ErrorState } from "@/components/error-state";

/**
 * Covers the test lobby at `/test/[testId]/start`. The live test interface
 * lives under `/test/attempt/[attemptId]` — a different segment — and keeps
 * its own state machine.
 */
export default function TestLobbyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container mx-auto max-w-3xl px-4 py-16">
      <ErrorState
        title="This test didn't load"
        description="Something failed on our side before the test started. Try again — no attempt was created and nothing was scored."
        reset={reset}
        digest={error.digest}
      />
    </main>
  );
}
