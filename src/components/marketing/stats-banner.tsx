import { BookOpenCheck, LayoutGrid, Target, Zap } from "lucide-react";

/**
 * The four-tile figure strip under the hero.
 *
 * **These numbers are hardcoded and two of them are claims the product cannot
 * back from data** — "236+ Practice Questions" is stale (the bank holds 280)
 * and "4 Full-Length Tests" counts seeded rows, not published ones. That is a
 * copy-rule violation this task did not introduce and does not fix: T3.2
 * replaces the strip with a live count query, and inventing a query here would
 * collide with it. Left verbatim, flagged.
 */
const STATS = [
  { value: "1600", label: "Max SAT Score", icon: Target },
  { value: "236+", label: "Practice Questions", icon: BookOpenCheck },
  { value: "4", label: "Full-Length Tests", icon: LayoutGrid },
  { value: "Free", label: "Sample Test", icon: Zap },
];

export function StatsBanner() {
  return (
    <section className="border-y border-border/40 bg-card/60 backdrop-blur-sm">
      <div className="container mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-8 sm:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center text-center">
            <stat.icon className="mb-2 h-5 w-5 text-primary/70" aria-hidden />
            <div className="text-h2 tabular text-foreground">{stat.value}</div>
            <div className="mt-0.5 text-caption text-muted-foreground">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
