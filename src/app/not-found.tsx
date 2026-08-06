import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * App-wide 404. Server component — nothing to retry here, so it offers routes
 * instead of a reset. Works logged out, hence "home" rather than "dashboard"
 * as the primary way out.
 */
export default function NotFound() {
  return (
    <main className="container mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="mb-5 rounded-2xl bg-muted p-4 text-muted-foreground">
        <Compass className="h-7 w-7" aria-hidden />
      </div>

      <p className="text-sm font-semibold text-muted-foreground">404</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
        This page doesn&apos;t exist
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        The address is wrong or the page has moved. Pick up where you left off
        below.
      </p>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/practice">Browse practice tests</Link>
        </Button>
      </div>
    </main>
  );
}
