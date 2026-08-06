"use client";

import * as React from "react";
import "./globals.css";

/**
 * Last-resort boundary: catches failures in the root layout itself, which
 * means the layout's `<html>`/`<body>`, fonts, theme script and providers are
 * all gone. Everything here is therefore self-contained — own document shell,
 * own stylesheet import, plain anchors instead of `next/link`, and no
 * dependency on `Button` or any other primitive that assumes providers.
 *
 * The theme script never ran, so this renders in the light palette only.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <main className="container mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            The app didn&apos;t load
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Something failed on our side before the page could render. Reload to
            try again — your attempt data is safe.
          </p>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            {/* The root layout is what failed, so a reload — not `reset()` —
                is the recovery: it re-runs the layout from scratch. */}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Try again
            </button>
            <a
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Back to dashboard
            </a>
          </div>

          {error.digest && (
            <p className="mt-6 text-xs text-muted-foreground">
              Reference code <span className="font-mono">{error.digest}</span>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
