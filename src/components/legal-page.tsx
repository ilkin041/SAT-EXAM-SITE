import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Shell for the footer's Privacy / Terms / Contact stubs.
 *
 * These exist so the footer links resolve instead of 404ing. T3.8 replaces the
 * bodies with real content; this wrapper can stay.
 */
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="container mx-auto max-w-2xl px-4 py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to home
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
        {title}
      </h1>

      <div className="mt-6 space-y-4 max-w-[52ch] text-[1.0625rem] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </main>
  );
}
