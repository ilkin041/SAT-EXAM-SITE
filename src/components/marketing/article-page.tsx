import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";

/**
 * Shell for the three long-form public pages T3.8 adds — `/scoring`,
 * `/sat-format` and `/for-tutors`.
 *
 * `LegalPage` already does header, `h1`, footer, but it is `max-w-2xl` of muted
 * prose, which is right for terms and wrong for a page with tables, sub-headings
 * and a call to action in it. This one is `max-w-3xl`, gives the page a lede in
 * the reading colour rather than the muted one, and leaves the body entirely to
 * the caller.
 *
 * `sections` is not offered, deliberately, for the same reason `LegalPage` does
 * not offer it: the header's nav items are in-page anchors on `/`, and a nav
 * that both navigates and jumps is a different control from the one the reader
 * used on the landing page. That also keeps `MarketingHeader`'s `mobileNav` slot
 * empty here, so none of these pages pays the 26 kB for a `Sheet` they have no
 * nav to put in.
 */
export function ArticlePage({
  eyebrow,
  title,
  lede,
  children,
}: {
  /** Mono label above the title — the section of the site this belongs to. */
  eyebrow: string;
  title: string;
  /** One or two sentences under the `h1`. Not muted: this is read, not skimmed. */
  lede: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />

      <main className="container mx-auto max-w-3xl px-4 py-16">
        <p className="eyebrow text-primary">{eyebrow}</p>
        <h1 className="mt-3 text-h1 text-ink">{title}</h1>
        <p className="mt-5 max-w-[52ch] text-body-lg text-foreground">{lede}</p>

        {children}
      </main>

      <MarketingFooter />
    </div>
  );
}

/**
 * One `h2` and its body. Every long-form page here is a stack of these, so the
 * rhythm between them is set once instead of per page.
 */
export function ArticleSection({
  id,
  title,
  children,
}: {
  /** Optional `#` target, so a paragraph can be linked to from elsewhere. */
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-20 first:mt-14">
      <h2 className="text-h2 text-ink">{title}</h2>
      <div className="mt-4 max-w-[62ch] space-y-4 text-body-lg text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
