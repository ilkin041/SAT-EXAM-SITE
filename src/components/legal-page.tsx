import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";

/**
 * Shell for the footer's Privacy / Terms / Contact stubs.
 *
 * These exist so the footer links resolve instead of 404ing. T3.8 replaces the
 * bodies with real content; this wrapper can stay.
 *
 * T3.1 gave it the shared marketing chrome. It previously offered a lone "Back
 * to home" link, which is the wrong exit for a page reached from the footer of
 * the page it goes back to. `sections` is empty: the header's nav items are
 * in-page anchors on `/`, and an anchor that navigates *and* jumps is a
 * different control from the one the reader clicked on the landing page.
 */
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />

      <main className="container mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-h1 text-ink">{title}</h1>

        <div className="mt-6 max-w-[52ch] space-y-4 text-body-lg text-muted-foreground">
          {children}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
