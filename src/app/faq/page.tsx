import type { Metadata } from "next";
import { Faq } from "@/components/marketing/faq";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { pageMetadata } from "@/lib/site";

/**
 * `/faq` — the same eight items the landing page carries, on their own URL.
 *
 * It renders the identical component rather than a copy of the copy, so the two
 * cannot drift and the `FAQPage` graph is emitted once here too. `headingLevel`
 * is the only difference: this page has no hero above it, so the section title
 * is the page's `h1` and each question moves up to an `h2`.
 *
 * `sections` is empty on the header for the same reason `LegalPage` leaves it
 * empty — the nav items are in-page anchors on `/`, and an anchor that
 * navigates *and* jumps is a different control from the one the reader clicked.
 * The FAQ item in that nav points at `/#faq`, which is the section on `/`; this
 * page is where a search result lands.
 */
export const metadata: Metadata = pageMetadata({
  title: "FAQ",
  description:
    "What this is, where the questions come from, how the 200–800 score is worked out, what it costs, and what is stored about you.",
  path: "/faq",
  og: { title: "Frequently asked questions", eyebrow: "FAQ" },
});

export default function FaqPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />

      <main>
        <Faq headingLevel={1} />
      </main>

      <MarketingFooter />
    </div>
  );
}
