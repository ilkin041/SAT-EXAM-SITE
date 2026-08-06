"use client";

import * as React from "react";
import { ErrorState } from "@/components/error-state";

/** Dashboard boundary. "Back to dashboard" would reload the broken segment,
 *  so the escape hatch points at the practice list instead. */
export default function DashboardError({
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
    <main className="container mx-auto max-w-6xl px-4 py-16">
      <ErrorState
        title="Your dashboard didn't load"
        description="Something failed on our side. Try again — your tests and past attempts are safe."
        reset={reset}
        backHref="/practice"
        backLabel="Browse practice tests"
        digest={error.digest}
      />
    </main>
  );
}
