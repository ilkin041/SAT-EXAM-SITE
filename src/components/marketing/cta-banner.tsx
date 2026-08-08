import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Closing call to action (copy and structure: T3.8).
 *
 * **One button.** It had three — `Get Started Free`, `Log in` and `Try a
 * sample` — stacked in a band about 280px tall under a single headline, which
 * is three ways of saying "decide something" to a reader who has just finished
 * the page. A closing band that offers a choice is a closing band that does not
 * close. `Log in` is already in the header on every scroll position, and the
 * sample test is the hero's own CTA and the FAQ's, so neither is lost.
 *
 * The one that stays is the account, because that is the only thing this band
 * can offer that the rest of the page has not: a visitor here has already been
 * given a question to answer in the hero and a full test at `/practice` without
 * signing up for anything.
 *
 * The sub-line under the headline is a fact about the product — there is no
 * payment step anywhere in it — and not a claim about how many people use it.
 * The old one ("Join students already practicing…") was social proof with the
 * number filed off, which is the shape of the thing this task exists to keep
 * off the page.
 */
export function CtaBanner() {
  return (
    <section className="relative overflow-hidden">
      {/* Flat tint — was a three-stop wash competing with the hero CTA. */}
      <div className="absolute inset-0 bg-primary/5" aria-hidden />
      <div className="container relative mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-h2 text-ink">Start your first timed test</h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-body-lg text-muted-foreground">
            An account keeps your attempts, your score history and your weakest domains in
            one place. It takes an email and a password, and there is no payment step to
            get past.
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/signup">
                Create a free account
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
