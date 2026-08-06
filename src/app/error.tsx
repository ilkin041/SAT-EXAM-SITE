"use client";

import * as React from "react";
import { ErrorState } from "@/components/error-state";

/**
 * App-wide error boundary. Catches anything below the root layout that has no
 * closer boundary of its own; the nav and theme still render around it.
 */
export default function AppError({
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
        title="This page didn't load"
        description="Something failed on our side. Try again — your attempt data is safe."
        reset={reset}
        digest={error.digest}
      />
    </main>
  );
}
