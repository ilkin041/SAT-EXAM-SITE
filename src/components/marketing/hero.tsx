import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MockTestCard } from "@/components/marketing/mock-test-card";

/**
 * Landing hero. Owns the page's one gradient — `Button variant="accent"` on
 * "Sign Up Free" — so nothing else above the fold may take a second.
 *
 * T3.4 rebuilds the copy and the right-hand column; this is the T3.1 split of
 * what `src/app/page.tsx` already had, moved verbatim.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* One static bloom, replacing the 15s gradient pan and two blurred orbs. */}
      <div className="hero-bloom pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
        aria-hidden
      />

      <div className="container relative mx-auto grid max-w-6xl gap-12 px-4 py-24 lg:grid-cols-2 lg:items-center lg:py-32">
        <div>
          {/* Pill badge */}
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-caption font-semibold text-primary shadow-sm backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Bluebook-style practice platform
          </span>

          {/*
            T1.8: the second half was `text-gradient-primary`. The page's one
            gradient is the "Sign Up Free" CTA below — a headline and a CTA
            cannot both be the signature, and only one of them is clickable.
          */}
          <h1 className="mt-6 text-display text-ink">
            Digital SAT Practice, Built for Your Students
          </h1>

          <p className="mt-6 max-w-[52ch] text-body-lg text-muted-foreground">
            Full-length adaptive practice tests with the same format as the real exam.
            Detailed scoring, domain breakdowns, and an answer-review interface students
            actually want to use.
          </p>

          {/* Quick highlights */}
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-body text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
              Timed modules
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
              200–800 scoring
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
              Free sample available
            </span>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="accent">
              <Link href="/signup">
                Sign Up Free
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/practice">Try a sample</Link>
            </Button>
          </div>
        </div>

        {/* Decorative test-card mockup */}
        <div className="relative hidden lg:block">
          <MockTestCard />
        </div>
      </div>
    </section>
  );
}
