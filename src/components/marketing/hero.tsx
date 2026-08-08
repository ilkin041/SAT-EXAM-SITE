import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveQuestionDemoClient } from "@/components/marketing/live-question-demo-client";
import type { DemoQuestion } from "@/lib/demo-question";

/**
 * Landing hero (T3.4).
 *
 * The demo is the hero. Everything above it — eyebrow, headline, sub-copy, two
 * buttons — exists to get a visitor into the panel, so the column is narrow,
 * centred and short, and the page's one bold element is the thing you can
 * actually use. That is also where the page's one gradient lives now: the rail
 * across the top of the demo panel. Policy allows `--gradient-primary` to be
 * the primary CTA *or* the hero signature, and a headline gradient span and a
 * gradient button were both taking it from the element that earns it.
 *
 * What went: the `MockTestCard` behind `lg:block` (a picture of the product,
 * hidden from every phone, replaced by the product), the three green-check
 * items (the stats strip says the same things one section down, with numbers),
 * and the `Sparkles` pill badge (the eyebrow is the label).
 *
 * Height is content-driven. `py-16 md:py-24` is the marketing section rhythm
 * and there is no `min-h-screen` — padding to fill a viewport would push the
 * demo below the fold on exactly the laptops it is meant to catch.
 */

interface Props {
  /**
   * Empty when nothing is flagged `publicDemo`, or when the database could not
   * be reached. The hero then renders no panel and its primary CTA points at
   * `/practice` instead of at a `#demo` anchor that is not on the page — a
   * dead anchor is worse than a different destination.
   */
  demoQuestions: DemoQuestion[];
}

export function Hero({ demoQuestions }: Props) {
  const hasDemo = demoQuestions.length > 0;

  return (
    <section className="relative overflow-hidden">
      {/* One static bloom — the 15s `animated-gradient-bg` pan and the two
          blurred orbs went in T0.7 — over a field of empty answer bubbles at
          3%. Both are texture: neither is counted against the budget. */}
      <div className="hero-bloom pointer-events-none absolute inset-0" aria-hidden />
      <div className="bubble-lattice pointer-events-none absolute inset-0" aria-hidden />

      <div className="container relative mx-auto max-w-5xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-[52ch] text-center">
          <p className="eyebrow hero-rise text-primary [--rise-step:0]">
            Bluebook-style Digital SAT practice
          </p>

          <h1 className="hero-rise mt-4 text-display text-ink [--rise-step:1]">
            Practice the Digital SAT the way you&rsquo;ll actually take it.
          </h1>

          {/*
            Every clause here is checkable, which is the rule. "Adaptive" is
            deliberately absent: routing is implemented and tested, but all five
            public tests are `LINEAR`, so the claim would describe the code
            rather than what a visitor gets. It goes in when the data does.
          */}
          <p className="hero-rise mt-6 text-body-lg text-muted-foreground [--rise-step:2]">
            Full-length, timed practice tests in the same interface as the real exam — same
            timer, same eliminator, same highlighter. You get a 200–800 score per section, a
            breakdown of every domain you missed, and an explanation for every question.
          </p>

          <div className="hero-rise mt-8 flex flex-wrap justify-center gap-3 [--rise-step:3]">
            <Button asChild size="lg">
              <Link href={hasDemo ? "#demo" : "/practice"}>
                {hasDemo ? "Try a question" : "Try a sample test"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/signup">Create free account</Link>
            </Button>
          </div>
        </div>

        {hasDemo && (
          <div id="demo" className="hero-rise mt-12 [--rise-step:4]">
            <h2 className="sr-only">Answer a real question</h2>
            <LiveQuestionDemoClient questions={demoQuestions} />
            <p className="mt-4 text-center text-caption text-muted-foreground">
              Real questions from the bank. Nothing is saved and no account is needed.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
