import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isRoutableAdaptiveTest } from "@/lib/adaptive-routing";
import { EASY_ROUTE_CAP } from "@/lib/scoring";

/**
 * What the landing page's adaptive tile is allowed to say (T3.6).
 *
 * The server half; `isRoutableAdaptiveTest` is the pure half and lives in
 * `src/lib/adaptive-routing.ts` next to the routing decision it guards. Same
 * split as `site-stats.ts` against `stats-banner.tsx`.
 *
 * This exists because the claim kept drifting from the data. Adaptive routing
 * has been implemented and tested for a long time; what changed in T3.6 is that
 * a public test finally exists that exercises it (`npm run
 * db:seed-adaptive-test`). Rather than hardcode "60%" into the diagram and trust
 * a future reader to notice when the seed changes, the tile reads the threshold
 * off the row a visitor would actually be routed by. If that row is deleted,
 * the tile disappears — so the acceptance criterion ("the adaptive claim matches
 * what a new signup finds") is enforced by the page rather than by a promise.
 */

export interface AdaptiveCapability {
  /** `adaptiveThreshold` as whole percent, e.g. 60. Rendered in the diagram. */
  thresholdPercent: number;
  /** The scaled-score ceiling on a section routed to the easier Module 2. */
  easyRouteCap: number;
  /** Questions in the first section's Module 1 — the module the routing reads. */
  module1Questions: number;
}

const CACHE_TAG = "landing-adaptive-capability";

/**
 * Cached for an hour for the same reason the stats strip and the demo are: `/`
 * is a dynamic route (`LandingHeader` calls `auth()`), so a segment
 * `revalidate` would do nothing, and none of this belongs in front of the
 * landing page on every visit.
 */
const getAdaptiveCapability = unstable_cache(
  async (): Promise<AdaptiveCapability | null> => {
    // Prisma cannot express "has both an EASY and a HARD Module 2 with
    // questions" in a `where`, so the shape is read and the predicate applied
    // in TypeScript — the same reason `/practice` filters its ready tests in
    // JavaScript rather than SQL.
    const candidates = await prisma.test.findMany({
      where: { isPublic: true, mode: "ADAPTIVE" },
      // Oldest first: if several qualify, the tile describes the one that has
      // been on offer longest rather than whichever was seeded last.
      orderBy: { createdAt: "asc" },
      select: {
        mode: true,
        adaptiveThreshold: true,
        sections: {
          orderBy: { order: "asc" },
          select: {
            modules: {
              select: {
                moduleNumber: true,
                difficulty: true,
                _count: { select: { moduleQuestions: true } },
              },
            },
          },
        },
      },
    });

    const routable = candidates.find((test) =>
      isRoutableAdaptiveTest({
        mode: test.mode,
        sections: test.sections.map((section) => ({
          modules: section.modules.map((module) => ({
            moduleNumber: module.moduleNumber,
            difficulty: module.difficulty,
            questionCount: module._count.moduleQuestions,
          })),
        })),
      }),
    );
    if (!routable) return null;

    // `isRoutableAdaptiveTest` has already established that every section holds
    // a filled Module 1, so this cannot be undefined — but the fallback keeps
    // the tile off rather than printing `0 questions` if that ever stops
    // being true.
    const module1Questions =
      routable.sections[0]?.modules.find((module) => module.moduleNumber === 1)?._count
        .moduleQuestions ?? 0;
    if (module1Questions === 0) return null;

    return {
      thresholdPercent: Math.round(routable.adaptiveThreshold * 100),
      easyRouteCap: EASY_ROUTE_CAP,
      module1Questions,
    };
  },
  [CACHE_TAG],
  { revalidate: 3600, tags: [CACHE_TAG] },
);

/**
 * Never throws and never guesses. `null` means "no public test would route a
 * visitor", which the bento renders by dropping the large tile entirely and
 * promoting the next capability into the slot — not a greyed-out tile and not a
 * "coming soon". Same degradation as the demo and the stats strip, including
 * the try/catch that hides it when the database is unreachable: `/` is the one
 * page that otherwise survives an outage.
 */
export async function loadAdaptiveCapability(): Promise<AdaptiveCapability | null> {
  try {
    return await getAdaptiveCapability();
  } catch (error) {
    console.error("[adaptive-capability] query failed, demoting the tile", error);
    return null;
  }
}
