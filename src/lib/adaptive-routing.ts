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
