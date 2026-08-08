import { BarChart3, ListChecks, UserPlus } from "lucide-react";

/**
 * "Three easy steps" — sign-up to first scored attempt.
 *
 * Carries `id="how-it-works"` for the header nav; `scroll-mt-16` clears the
 * sticky bar, same as `Features`.
 */
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-16 border-y border-border/40 bg-card/30"
    >
      <div className="container mx-auto max-w-6xl px-4 py-24">
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
          {/* Connecting gradient line (desktop) */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-10 hidden h-[2px] md:block"
            style={{
              background: "linear-gradient(90deg, transparent 10%, hsl(var(--primary) / 0.2) 20%, hsl(var(--primary) / 0.2) 80%, transparent 90%)",
            }}
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
