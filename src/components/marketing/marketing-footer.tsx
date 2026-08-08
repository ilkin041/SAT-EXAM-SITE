import Link from "next/link";
import { BrandMark } from "@/components/marketing/brand-mark";
import { FOOTER_COLUMNS } from "@/lib/marketing-nav";
import { SITE_NAME } from "@/lib/site";

/**
 * Shared marketing footer — four columns over a brand row.
 *
 * The old landing footer opened with a 2px `linear-gradient` rule. That was a
 * second gradient element on a page whose budget is one, and it was inline
 * `style` besides, so it went rather than moving to a token.
 *
 * The year is computed on the server at render time. It never reaches a client
 * component, so there is no hydration mismatch to guard against, and it is not
 * a date the reader is meant to act on — `formatDate` is for those.
 */
export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/40 bg-card/30">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_2fr]">
          <div>
            <BrandMark size="sm" />
            <p className="mt-3 max-w-[38ch] text-body text-muted-foreground">
              Timed, full-length Digital SAT practice in the format students meet
              on test day.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {FOOTER_COLUMNS.map((column) => (
              <nav key={column.heading} aria-labelledby={`footer-${column.heading}`}>
                <h2
                  id={`footer-${column.heading}`}
                  className="eyebrow text-muted-foreground"
                >
                  {column.heading}
                </h2>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={`${column.heading}-${link.href}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="text-body text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-border/40 pt-6 text-caption text-muted-foreground">
          <span className="tabular">{year}</span> {SITE_NAME}. Built for SAT
          preparation.
        </div>
      </div>
    </footer>
  );
}
