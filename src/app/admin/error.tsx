"use client";

import * as React from "react";
import { ErrorState } from "@/components/error-state";

/** Admin boundary — renders inside the admin layout, so the nav stays put. */
export default function AdminError({
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
    <div className="py-8">
      <ErrorState
        title="This page didn't load"
        description="Something failed on our side. Try again — no question, test, or attempt data was changed."
        reset={reset}
        backHref="/admin"
        backLabel="Back to admin dashboard"
        digest={error.digest}
      />
    </div>
  );
}
