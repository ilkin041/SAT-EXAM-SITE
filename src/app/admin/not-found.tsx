import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Admin 404 — reached when a record id in the URL no longer exists, so the
 * copy names that case rather than a mistyped address. Renders inside the
 * admin layout, keeping the nav available.
 */
export default function AdminNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <div className="mb-5 rounded-2xl bg-muted p-4 text-muted-foreground">
        <Compass className="h-7 w-7" aria-hidden />
      </div>

      <p className="text-sm font-semibold text-muted-foreground">404</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
        This record doesn&apos;t exist
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        It was deleted, or the address is wrong. Open the list to find what you
        were looking for.
      </p>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button asChild>
          <Link href="/admin">Back to admin dashboard</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/admin/questions">Question bank</Link>
        </Button>
      </div>
    </div>
  );
}
