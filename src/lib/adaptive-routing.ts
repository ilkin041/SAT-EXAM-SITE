import type { Difficulty, TestMode } from "@prisma/client";

/**
 * Pure decision: given a student's Module 1 performance and the test's mode + threshold,
 * which Module 2 difficulty should the engine serve?
 *
 *   - LINEAR  → always MIXED (single Module 2 per section).
 *   - ADAPTIVE → fraction correct ≥ threshold routes to HARD, otherwise EASY.
 *
 * Exported separately from the DB-touching engine so it can be unit-tested
 * without a database.
 */
export function chooseModule2Difficulty(params: {
  mode: TestMode;
  adaptiveThreshold: number;
  correctCount: number;
  totalCount: number;
}): Difficulty {
  if (params.mode === "LINEAR") return "MIXED";
  const fraction = params.totalCount > 0 ? params.correctCount / params.totalCount : 0;
  return fraction >= params.adaptiveThreshold ? "HARD" : "EASY";
}

/** One module's shape, as far as routability is concerned. */
export interface RoutableModule {
  moduleNumber: number;
  difficulty: Difficulty;
  questionCount: number;
}

/** One test's shape, as far as routability is concerned. */
export interface RoutableTest {
  mode: TestMode;
  sections: { modules: RoutableModule[] }[];
}

/**
 * Can a student who starts this test actually be *routed*?
 *
 * `mode: ADAPTIVE` alone is not enough, and the difference is what the landing
 * page's capability tile turns on (T3.6). `pickNextModule` falls back to "any
 * Module 2 in this section" when the difficulty it wants is missing, so an
 * ADAPTIVE test whose sections hold a single `MIXED` Module 2 runs perfectly
 * well and routes nobody — the student's Module 1 score changes nothing. A
 * claim resting on `mode` would then be true of the column and false of the
 * experience.
 *
 * Routable means: adaptive, at least one section, and **every** section has a
 * Module 1 and both a `HARD` and an `EASY` Module 2, each holding questions. An
 * empty module is a module the engine can serve and the student cannot answer,
 * which is the same predicate `/practice` uses to decide a test is startable.
 *
 * Pure so a test can pin it without a database — same split as `site-stats.ts`
 * against `stats-banner.tsx`.
 */
export function isRoutableAdaptiveTest(test: RoutableTest): boolean {
  if (test.mode !== "ADAPTIVE") return false;
  if (test.sections.length === 0) return false;

  return test.sections.every((section) => {
    const filled = (moduleNumber: number, difficulty: Difficulty) =>
      section.modules.some(
        (module) =>
          module.moduleNumber === moduleNumber &&
          module.difficulty === difficulty &&
          module.questionCount > 0,
      );
    return (
      filled(1, "MIXED") && filled(2, "HARD") && filled(2, "EASY")
    );
  });
}
