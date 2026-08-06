"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ErrorStateProps {
  /** What failed, in the user's terms. One sentence. */
  title: string;
  /** What happened and what is safe. One or two sentences. No apology. */
  description: string;
  /** Next.js hands this to every error boundary — re-renders the segment. */
  reset: () => void;
  /** Where "back" goes. Defaults to the student dashboard. */
  backHref?: string;
  backLabel?: string;
  /** The digest Next.js attaches to server errors, shown for support. */
  digest?: string;
}

/**
 * Shared body for every `error.tsx`. Boundaries stay thin: they pick the
 * copy and the escape hatch, this owns the layout.
 */
export function ErrorState({
  title,
  description,
  reset,
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
  digest,
}: ErrorStateProps) {
  const router = useRouter();
  const [retrying, setRetrying] = React.useState(false);

  /**
   * `reset()` alone only re-renders the boundary from the cached RSC payload,
   * so a failed server component fails again with no request going out. The
   * refresh is what actually re-runs the segment on the server; reset clears
   * the boundary once the new payload lands.
   */
  const retry = () => {
    setRetrying(true);
    React.startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-border/80 bg-card px-6 py-12 text-center shadow-sm">
      <div className="mb-5 rounded-2xl bg-destructive/10 p-4 text-destructive">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </div>

      <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      <div className="mt-7 flex flex-col gap-2 sm:flex-row">
        <Button onClick={retry} loading={retrying}>
          Try again
        </Button>
        <Button asChild variant="secondary">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </div>

      {digest && (
        <p className="mt-6 text-xs text-muted-foreground">
          Reference code <span className="font-mono">{digest}</span>
        </p>
      )}
    </div>
  );
}
