"use client";

import * as React from "react";
import { ErrorState } from "@/components/error-state";

/** Covers the score report and the answer review below it. */
export default function ResultsError({
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
    <main className="container mx-auto max-w-4xl px-4 py-16">
      <ErrorState
        title="This score report didn't load"
        description="Something failed while scoring this attempt. Try again — your answers are stored and nothing was lost."
        reset={reset}
        digest={error.digest}
      />
    </main>
  );
}
