import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { FAQ_ITEMS, type FaqItem } from "@/lib/faq";
import { faqPageJsonLd } from "@/lib/json-ld";

/**
 * The FAQ section (T3.7) — eight items, the first one open.
 *
 * Rendered twice: as `id="faq"` on the landing page, and as the whole of
 * `/faq`. One component, so the two cannot say different things, and the
 * `FAQPage` JSON-LD ships from in here rather than from either page for the
 * same reason — a page that renders the accordion cannot forget the graph, and
 * a page that does not render it cannot emit one.
 *
 * **The copy is `src/lib/faq.ts` and nothing here adds to it.** Same split as
 * `product-screens.ts` against `screenshot-tabs-client.tsx` and `site-stats.ts`
 * against `stats-banner.tsx`, but here it is load-bearing rather than tidy: the
 * acceptance criterion is that the structured data matches the visible content
 * exactly, so an answer paragraph that exists only in the JSX would break it.
 * The links under the accordion are outside every item and belong to the
 * section, not to an answer.
 *
 * **This is `<details>`/`<summary>`, not the `Accordion` primitive, and the
 * reason is the acceptance criterion.** T1.6's `Accordion` wraps Radix, and
 * Radix's Content renders `isOpen && children` — a closed panel is not hidden,
 * it is *absent*. `forceMount` does not help: it seeds `isPresent` to true, so
 * every panel renders permanently open instead. Either way the server HTML
 * holds one answer while the graph claims eight, and Googlebot renders a page
 * but does not click it. Google's own guidance allows an answer hidden behind
 * an expander precisely because it is still in the markup; an answer that
 * arrives only on click is a mismatch between structured data and page content,
 * which is the one thing this task must not ship.
 *
 * `<details>` keeps every closed answer in the DOM, and gets there with no
 * client JavaScript at all — the section costs `/` nothing, works before
 * hydration and works with JS off. It is also a native disclosure widget:
 * `<summary>` is focusable and Enter/Space-operable for free, its expanded
 * state is exposed without an `aria-expanded` we would have to maintain, and
 * `globals.css` already names `<summary>` in the elements its `:focus-visible`
 * ring covers. The one thing given up is Up/Down arrow roving between rows,
 * which is a convenience on a list of eight, and single-open behaviour, which
 * needs state and therefore a client component. **`Accordion` stays the right
 * answer anywhere the content is not being crawled** — see the note in
 * `src/components/ui/accordion.tsx`.
 *
 * `headingLevel` follows the outline of whichever page is rendering it. On `/`
 * the section heading is an `h2` under the hero's `h1`, so a question is an
 * `h3`. On `/faq` the section heading *is* the page's `h1` and a question is an
 * `h2`. A heading is permitted as the sole content of a `<summary>`, which is
 * what keeps the questions in the document outline rather than being eight
 * unlabelled buttons.
 */
export function Faq({
  headingLevel = 2,
}: {
  /** The section title's level. `1` on `/faq`, `2` as a section of `/`. */
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <section id="faq" className="scroll-mt-16">
      <JsonLd data={faqPageJsonLd()} />

      <div className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-primary">Questions</p>
          <Heading className="mt-3 text-h2 text-ink">Before you start</Heading>
          <p className="mx-auto mt-3 max-w-[52ch] text-body-lg text-muted-foreground">
            The eight things worth knowing, answered plainly. If something here reads like
            marketing, it is a bug.
          </p>
        </div>

        <div className="mt-12 rounded-2xl border border-border/60 bg-card px-6 shadow-card md:px-8">
          {FAQ_ITEMS.map((item, index) => (
            // The first item is open, the rest are collapsed. `open` is an
            // initial state on `<details>`, not a controlled one, so this is a
            // default the reader can close — not something that snaps back.
            <FaqRow
              key={item.id}
              item={item}
              questionLevel={headingLevel === 1 ? 2 : 3}
              defaultOpen={index === 0}
            />
          ))}
        </div>

        {/* Outside the disclosure list on purpose: an answer is a plain string
            in the structured data, so a link inside one would be content the
            graph cannot carry. These belong to the section.

            The `/scoring` link is the one T3.7 could not add. The prompt asked
            for it on the score answer; there was no such route, and an anchor
            to a page that does not exist is a broken link. T3.8 built the page,
            and the link lands here rather than inside the answer string for the
            reason above — the answer still says everything it said. */}
        <p className="mt-8 text-center text-body text-muted-foreground">
          Still deciding?{" "}
          <Link
            href="/practice"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Take a practice test
          </Link>{" "}
          without an account, read{" "}
          <Link
            href="/scoring"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            how the score is worked out
          </Link>
          , or{" "}
          <Link
            href="/contact"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            ask something that is not here
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

/**
 * One question and its answer.
 *
 * The row reproduces `AccordionItem` + `AccordionTrigger` class for class — the
 * bottom rule, the `py-5` row, the chevron that turns — so the section looks
 * like the rest of the design system even though it is not built on it. The
 * chevron reads `group-open:` rather than Radix's `group-data-[state=open]:`,
 * which is the only difference in the markup.
 *
 * `list-none` plus the `::-webkit-details-marker` reset removes the native
 * triangle. Both are needed: Safari still uses the WebKit pseudo-element and
 * ignores `list-style` on a summary.
 */
function FaqRow({
  item,
  questionLevel,
  defaultOpen,
}: {
  item: FaqItem;
  questionLevel: 2 | 3;
  defaultOpen: boolean;
}) {
  const Question = questionLevel === 2 ? "h2" : "h3";

  return (
    <details
      id={item.id}
      open={defaultOpen}
      className="group scroll-mt-20 border-b border-border last:border-b-0"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-body font-semibold text-foreground transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
        {/* The heading is the whole of the summary's content, which is what the
            HTML spec allows and what keeps these in the document outline. */}
        <Question className="text-body font-semibold">{item.question}</Question>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>

      <div className="max-w-[62ch] space-y-3 pb-6 text-body text-muted-foreground">
        {item.answer.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </details>
  );
}
