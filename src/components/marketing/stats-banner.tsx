import { unstable_cache } from "next/cache";
import { BadgeCheck, BookOpenCheck, LayoutGrid, Zap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  buildSiteStatTiles,
  type SiteStatCounts,
  type SiteStatKey,
} from "@/lib/site-stats";

/**
 * The figure strip under the hero. Every number is a live count, rounded down
 * (T3.2). `1600 Max SAT Score` is gone — a fact about the exam is not a
 * statistic about this product.
 *
 * The strip renders two, three or four tiles depending on what the data earns,
 * which is why the row is a centred `flex-wrap` rather than a fixed four-column
 * grid: a three-tile strip in a four-column grid sits off-centre.
 */

/** How long a figure may be stale. One hour, per T3.2. */
const STATS_REVALIDATE_SECONDS = 3600;

/**
 * `export const revalidate` on `src/app/page.tsx` would do nothing: the landing
 * header calls `auth()`, which reads cookies, so `/` is a dynamic route and has
 * been since before this task (`docs/baselines.md` lists it as `ƒ`). Segment
 * revalidation only applies to a segment Next can statically generate. Caching
 * the *query* instead gets the intended behaviour on the route as it actually
 * renders, and keeps it when T3.3 and T3.4 add more dynamic work to the page.
 *
 * The counts are deliberately three `count()` calls rather than one raw query:
 * each is index-served, they run concurrently, and they run at most once an
 * hour.
 */
const getSiteStatCounts = unstable_cache(
  async (): Promise<SiteStatCounts> => {
    const [questions, publicTests, completedAttempts] = await Promise.all([
      prisma.question.count(),
      /*
       * The same predicate `/practice` filters by, expressed as a count: a
       * public test with an empty module cannot be started, and a strip that
       * claims five when that page offers three is the hardcoded-number problem
       * with extra steps. Prisma cannot say "every module has a question", so
       * this says "no section is broken" instead.
       */
      prisma.test.count({
        where: {
          isPublic: true,
          sections: {
            some: {},
            none: {
              OR: [
                { modules: { none: {} } },
                { modules: { some: { moduleQuestions: { none: {} } } } },
              ],
            },
          },
        },
      }),
      prisma.testAttempt.count({ where: { status: "COMPLETED" } }),
    ]);

    return { questions, publicTests, completedAttempts };
  },
  ["landing-site-stats"],
  { revalidate: STATS_REVALIDATE_SECONDS },
);

const TILE_ICONS: Record<SiteStatKey, typeof BookOpenCheck> = {
  questions: BookOpenCheck,
  tests: LayoutGrid,
  completed: BadgeCheck,
  free: Zap,
};

export async function StatsBanner() {
  let counts: SiteStatCounts;
  try {
    counts = await getSiteStatCounts();
  } catch (error) {
    // `/` is the one page that otherwise touches no database, so an outage used
    // to leave it standing. Keep that: no strip beats a strip of guesses.
    console.error("[stats-banner] count query failed, hiding the strip", error);
    return null;
  }

  const tiles = buildSiteStatTiles(counts);

  return (
    <section className="border-y border-border/40 bg-card/60 backdrop-blur-sm">
      <div className="container mx-auto flex max-w-6xl flex-wrap justify-center gap-x-8 gap-y-8 px-4 py-8">
        {tiles.map((tile) => {
          const Icon = TILE_ICONS[tile.key];
          return (
            <div
              key={tile.key}
              className="flex min-w-[7rem] flex-1 basis-[calc(50%-2rem)] flex-col items-center text-center sm:basis-0"
            >
              <Icon className="mb-2 h-5 w-5 text-primary/70" aria-hidden />
              <div
                className={
                  tile.numeric
                    ? "text-h2 tabular text-foreground"
                    : "text-h2 text-foreground"
                }
              >
                {tile.value}
              </div>
              <div className="mt-0.5 text-caption text-muted-foreground">{tile.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
