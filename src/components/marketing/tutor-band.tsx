import Link from "next/link";
import {
  ArrowRight,
  FileSpreadsheet,
  FolderInput,
  Layers,
  Send,
  Users,
  Library,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TUTOR_BAND_FEATURES } from "@/lib/tutor-features";

/**
 * The tutor band (T3.8) — `id="for-tutors"`.
 *
 * **Inverted, on `--brand-navy`, because that is the admin product's own
 * colour.** Everything above this section is the student product in indigo; a
 * reader scrolling into a navy band has arrived somewhere else, which is exactly
 * what the section is saying. It is the one place outside `/admin` the token is
 * used, and it is used for the thing the token means rather than as decoration.
 *
 * **Flat `bg-brand-navy`, not the admin bar's three-stop wash.** `AdminNav`
 * runs `from-brand-navy via-brand-navy-light to-brand-navy`; reproducing that
 * here would put a second gradient element on `/`, whose budget is one and whose
 * one is the hero's demo rail. The band reads as the admin product without
 * borrowing its gradient.
 *
 * `globals.css` already routes `:focus-visible` inside `.bg-brand-navy` to a
 * white ring, so the CTA and the anchor keep a 3:1 indicator on this surface
 * without anything being added here.
 *
 * The six lines are `TUTOR_FEATURES`, and each one names a route that exists —
 * see the note in that module. No student-facing claim is repeated here and no
 * number is quoted: this band's job is to say the admin product is real and
 * hand off to `/for-tutors`.
 */

/** Icons live at the call site so the copy module stays free of `lucide-react`. */
const FEATURE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "question-bank": Library,
  "test-assembly": Layers,
  groups: Users,
  assignment: Send,
  "csv-export": FileSpreadsheet,
  "json-import": FolderInput,
};

export function TutorBand() {
  return (
    <section id="for-tutors" className="scroll-mt-16 bg-brand-navy text-white">
      <div className="container mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_1.3fr] lg:gap-16">
          <div>
            <p className="eyebrow text-white/60">For tutors and schools</p>
            <h2 className="mt-3 text-h2">The admin side is the product too</h2>
            <p className="mt-4 max-w-[52ch] text-body-lg text-white/75">
              Everything a student sits is something somebody built here first. Write the
              questions, assemble the test, put your students in a group, assign it, then
              read every attempt back question by question.
            </p>

            <div className="mt-8">
              {/*
                One button. The band's job is to route a tutor to the page that
                answers them, and a second control here would split it.

                White on navy rather than a stock variant: `secondary` is
                `bg-card text-foreground`, which is a light button in the light
                theme and a *dark* one in the dark theme — on a surface that is
                navy in both, only one of those reads. The pair is the same one
                `Tabs`'s inverted tone and `AdminNavLinks` already use on this
                colour. The focus ring follows `theme-toggle.tsx` on the admin
                bar: `ring-ring` is indigo and falls below 3:1 here, and
                `ring-offset-background` would draw the gap in the page's
                background rather than the band's.
              */}
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="border-transparent bg-white text-brand-navy hover:bg-white/90 hover:text-brand-navy focus-visible:ring-white focus-visible:ring-offset-brand-navy"
              >
                <Link href="/for-tutors">
                  See what tutors get
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>

          <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {TUTOR_BAND_FEATURES.map((feature) => {
              const Icon = FEATURE_ICONS[feature.id];
              return (
                <li key={feature.id}>
                  <div className="flex items-center gap-2.5">
                    {Icon && (
                      <Icon className="h-4 w-4 shrink-0 text-white/70" aria-hidden />
                    )}
                    <h3 className="text-body font-semibold text-white">{feature.title}</h3>
                  </div>
                  <p className="mt-1.5 text-body text-white/70">{feature.description}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
