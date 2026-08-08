import { BarChart3, BookOpenCheck, LayoutGrid } from "lucide-react";

/**
 * "Everything you need" — the product tour.
 *
 * Carries `id="product"`, which is what the header's Product nav item scrolls
 * to. `scroll-mt-16` clears the sticky 56px bar; without it the heading lands
 * underneath the header it was reached from.
 */
export function Features() {
  return (
    <section id="product" className="relative scroll-mt-16 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
        aria-hidden
      />
      <div className="container relative mx-auto max-w-6xl px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-caption font-semibold text-primary">
            Features
          </span>
          <h2 className="mt-4 text-h2">Everything you need</h2>
          <p className="mx-auto mt-3 max-w-[52ch] text-body-lg text-muted-foreground">
            A focused, distraction-free testing interface backed by the tooling a tutor needs.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <Feature
            icon={LayoutGrid}
            title="Adaptive Testing"
            description="Module 2 difficulty routes from Module 1 performance — exactly how the real Digital SAT works."
            tint="bg-blue-500/10"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <Feature
            icon={BookOpenCheck}
            title="Full Question Bank"
            description="Build your own library of math and reading-and-writing questions, then assign them across tests."
            tint="bg-violet-500/10"
            iconColor="text-violet-600 dark:text-violet-400"
          />
          <Feature
            icon={BarChart3}
            title="Detailed Results"
            description="200–800 scaled scores per section, total out of 1600, and a per-domain breakdown of every attempt."
            tint="bg-emerald-500/10"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
        </div>
      </div>
    </section>
  );
}

function Feature({
  icon: Icon,
  title,
  description,
  tint,
  iconColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  /** Flat surface tint, shared by the icon tile and the hover wash. */
  tint: string;
  iconColor: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-7 shadow-card transition-all duration-200 hover:shadow-elevated hover:-translate-y-1">
      {/* Hover wash — flat since T1.8; three gradient tiles is three signatures. */}
      <div
        className={`pointer-events-none absolute inset-0 ${tint} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
        aria-hidden
      />

      <div className="relative">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint} ${iconColor} shadow-sm`}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <h3 className="mt-5 text-h3">{title}</h3>
        <p className="mt-2 text-body-lg text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
