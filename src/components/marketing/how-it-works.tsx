import { BarChart3, ListChecks, UserPlus } from "lucide-react";

/**
 * "Three easy steps" — sign-up to first scored attempt.
 *
 * Carries `id="how-it-works"` for the header nav; `scroll-mt-16` clears the
 * sticky bar.
 *
 * T3.8 kept the three numbered steps — they are a real sequence, which is the
 * one thing that earns a numbered list — and changed two things. The section
 * was `py-24` flat while every other one is `py-16 md:py-24`, so it was the
 * tallest block on the page for the least content. And the connector between
 * the steps was a `linear-gradient` at `--primary / 0.2`, which measured about
 * 1.1:1 against the section behind it: not a faint line, an invisible one. It
 * is now a solid `bg-border`, which is the rule the rest of the app draws, and
 * it is inset to run between the step badges instead of fading out at the page
 * edges — the fade existed to hide ends that no longer stick out. Losing the
 * gradient is a bonus: `/`'s budget is one and the hero's demo rail has it.
 */
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-16 border-y border-border/40 bg-card/30"
    >
      <div className="container mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-caption font-semibold text-primary">
            How it works
          </span>
          <h2 className="mt-4 text-h2">Three easy steps</h2>
          <p className="mx-auto mt-3 max-w-[52ch] text-body-lg text-muted-foreground">
            From sign-up to your first scored attempt in minutes.
          </p>
        </div>

        {/* Steps with connecting line */}
        <div className="relative mt-14">
          {/*
            The line sits *behind* three opaque cards, so the only parts of it
            anybody ever sees are the two `gap-6` gaps between them. The old
            fade to transparent at 10%/90% was therefore spent on ends the cards
            already cover, while the gaps got the flat middle of a
            `--primary / 0.2` gradient — measured against the section behind it,
            **1.35:1**.

            `bg-border` is the obvious replacement and it is *worse*: 1.24:1.
            The app's divider colour is tuned to sit next to a border it is
            separating, not to be seen on its own across a 24px gap. So this is
            `muted-foreground / 50`, measured at **1.96:1** — the same neutral
            the section's own body copy is drawn in, at half strength. It
            inverts with the theme for free, which a hand-picked grey would not.

            A ratio, not a floor: the element is `aria-hidden` decoration and the
            sequence is already carried by the numbered badges, so 3:1 is not the
            bar. It just has to be a line you can see.
          */}
          <div
            className="pointer-events-none absolute inset-x-0 top-10 hidden h-0.5 bg-muted-foreground/50 md:block"
            aria-hidden
          />

          <ol className="relative grid gap-8 md:grid-cols-3 md:gap-6">
            <Step
              n={1}
              icon={UserPlus}
              title="Sign up and log in"
              description="Free account creation. Admin users can also be set up to manage tests."
            />
            <Step
              n={2}
              icon={ListChecks}
              title="Choose a practice test"
              description="Pick from your library of full-length or section-only practice tests."
            />
            <Step
              n={3}
              icon={BarChart3}
              title="Get your score and review"
              description="See your scaled score and walk through every question with explanations."
            />
          </ol>
        </div>
      </div>
    </section>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  description,
}: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <li className="group relative rounded-2xl border border-border/60 bg-card p-7 shadow-card transition-all duration-200 hover:shadow-elevated hover:-translate-y-1">
      {/* Step number badge with glow */}
      <div className="absolute -top-3.5 left-7">
        <span className="relative inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2.5 text-caption tabular font-bold text-primary-foreground shadow-md">
          {n}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <h3 className="text-h3">{title}</h3>
      </div>
      <p className="mt-3 text-body-lg text-muted-foreground">{description}</p>
    </li>
  );
}
