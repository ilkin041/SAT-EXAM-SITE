import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Closing call to action. T3.8 rewrites the copy. */
export function CtaBanner() {
  return (
    <section className="relative overflow-hidden">
      {/* Flat tint — was a three-stop wash competing with the hero CTA. */}
      <div className="absolute inset-0 bg-primary/5" aria-hidden />
      <div className="container relative mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-h2">Ready to boost your SAT score?</h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-body-lg text-muted-foreground">
            Join students already practicing with full-length, timed practice tests.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {/* Solid: the hero's "Sign Up Free" is the page's one accent. */}
            <Button asChild size="lg">
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
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
      </div>
    </section>
  );
}
