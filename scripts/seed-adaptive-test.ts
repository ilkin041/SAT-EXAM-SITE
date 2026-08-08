/**
 * Seeds the one public ADAPTIVE test (T3.6).
 *
 *   npm run db:seed-adaptive-test
 *
 * Adaptive routing has been fully implemented and unit-tested since long before
 * this script (`src/lib/adaptive-routing.ts`, `ModuleResult.routedTo`, the
 * 600-point EASY cap in `src/lib/scoring.ts`). What did not exist was a single
 * public test a visitor could take that would route them: all five were
 * `LINEAR`, and structurally linear too — one `MIXED` Module 2 per section,
 * with no `EASY`/`HARD` pair to choose between. So the landing page could not
 * claim adaptive without describing the code rather than the product, which is
 * the rule the hero copy already follows.
 *
 * This assembles that test out of the existing bank rather than inventing
 * questions. Nothing here is authored content, so open decision 4 is untouched:
 * these questions already serve on `/practice` to logged-out visitors, and no
 * stem from this test appears anywhere on the landing page — the capability
 * tile draws a diagram of the mechanism, not a screenshot of a question.
 *
 * **Math only, and that is a real configuration, not a shortcut.** The bank
 * holds 2 EASY and 8 HARD Reading and Writing questions against 65 EASY and 59
 * HARD in Math; an adaptive R&W section built on ten questions would be a
 * routing decision between two modules that barely differ. `getScoreFidelity`
 * has handled section-only attempts since before T2.2, and "Practice Test 0" is
 * already a public Math-only test, so this follows a shape the product and the
 * score report both already support.
 *
 * Shape, all with fixed ids so re-running is idempotent:
 *
 *   Section 1 · MATH · 35 min per module (2100s, matching the rest of the bank)
 *     Module 1 · MIXED · 22 questions — 6 easy, 10 medium, 6 hard
 *     Module 2 · HARD  · 22 questions — 16 hard, 6 medium
 *     Module 2 · EASY  · 22 questions — 16 easy, 6 medium
 *
 * The three modules are **disjoint**: 66 distinct questions, sliced out of
 * difficulty lists sorted by id, so nobody meets the same question twice and
 * the selection is the same on every run. Re-running replaces each module's
 * question list wholesale rather than appending.
 *
 * `adaptiveThreshold` stays at the schema default of 0.6. The landing tile
 * reads that number off this row rather than hardcoding "60%", so changing it
 * here changes the diagram.
 */
import { PrismaClient, type Difficulty } from "@prisma/client";
import { isRoutableAdaptiveTest } from "../src/lib/adaptive-routing";

const prisma = new PrismaClient();

// ---------- Fixed ids ----------

const TEST_ID = "adaptive-math-public";
const SECTION_ID = "adaptive-math-section";
const MODULE_1_ID = "adaptive-math-m1";
const MODULE_2_HARD_ID = "adaptive-math-m2-hard";
const MODULE_2_EASY_ID = "adaptive-math-m2-easy";

const MODULE_TIME_LIMIT = 2100; // 35 minutes, the same as every Math module in the bank
const QUESTIONS_PER_MODULE = 22;

/**
 * How many of each difficulty each module takes. Module 1 is genuinely mixed —
 * routing off a module that leans one way would decide the branch before the
 * student did. The two Module 2s lean without being pure: a "harder set" of
 * nothing but HARD is a cliff, and the real exam's second module is a shift in
 * emphasis, not a different subject.
 */
const COMPOSITION: Record<string, Record<Difficulty, number>> = {
  module1: { EASY: 6, MEDIUM: 10, HARD: 6, MIXED: 0 },
  module2Hard: { EASY: 0, MEDIUM: 6, HARD: 16, MIXED: 0 },
  module2Easy: { EASY: 16, MEDIUM: 6, HARD: 0, MIXED: 0 },
};

async function main() {
  // ---------- Draw the questions ----------

  // Sorted by id so the slices below are deterministic: the same 66 questions
  // on every run, in the same modules, which is what makes this idempotent
  // rather than merely re-runnable.
  const pool: Record<Difficulty, string[]> = {
    EASY: [],
    MEDIUM: [],
    HARD: [],
    MIXED: [],
  };
  const mathQuestions = await prisma.question.findMany({
    where: { domain: { sectionType: "MATH" } },
    select: { id: true, difficulty: true },
    orderBy: { id: "asc" },
  });
  for (const question of mathQuestions) pool[question.difficulty].push(question.id);

  const needed: Record<Difficulty, number> = { EASY: 0, MEDIUM: 0, HARD: 0, MIXED: 0 };
  for (const module of Object.values(COMPOSITION)) {
    for (const [difficulty, count] of Object.entries(module)) {
      needed[difficulty as Difficulty] += count;
    }
  }
  for (const [difficulty, count] of Object.entries(needed)) {
    const have = pool[difficulty as Difficulty].length;
    if (have < count) {
      throw new Error(
        `Not enough ${difficulty} Math questions: need ${count}, bank holds ${have}. ` +
          `Author more, or adjust COMPOSITION in this script.`,
      );
    }
  }

  // A moving cursor per difficulty is what keeps the three modules disjoint.
  const taken: Record<Difficulty, number> = { EASY: 0, MEDIUM: 0, HARD: 0, MIXED: 0 };
  const draw = (module: keyof typeof COMPOSITION): string[] => {
    const ids: string[] = [];
    for (const [difficulty, count] of Object.entries(COMPOSITION[module])) {
      const key = difficulty as Difficulty;
      ids.push(...pool[key].slice(taken[key], taken[key] + count));
      taken[key] += count;
    }
    return ids;
  };

  const module1Ids = draw("module1");
  const module2HardIds = draw("module2Hard");
  const module2EasyIds = draw("module2Easy");

  // ---------- Test, section, modules ----------

  // `createdById` is nullable and `SetNull` on delete, so an admin-less database
  // seeds an ownerless test rather than failing.
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const testFields = {
    title: "Adaptive Practice — Math",
    description:
      "A two-module Math section in adaptive mode. Module 1 is 22 mixed-difficulty questions; " +
      "how you do on it decides which Module 2 you are served. A section routed to the easier " +
      "Module 2 scores out of 600 rather than 800 — the same rule the Digital SAT uses.",
    mode: "ADAPTIVE" as const,
    isPublic: true,
    adaptiveThreshold: 0.6,
    createdById: admin?.id ?? null,
  };

  await prisma.test.upsert({
    where: { id: TEST_ID },
    create: { id: TEST_ID, ...testFields },
    update: testFields,
  });

  const sectionFields = {
    testId: TEST_ID,
    type: "MATH" as const,
    order: 1,
    module1TimeLimit: MODULE_TIME_LIMIT,
    module2TimeLimit: MODULE_TIME_LIMIT,
  };
  await prisma.section.upsert({
    where: { id: SECTION_ID },
    create: { id: SECTION_ID, ...sectionFields },
    update: sectionFields,
  });

  const modules: { id: string; moduleNumber: number; difficulty: Difficulty; questionIds: string[] }[] = [
    { id: MODULE_1_ID, moduleNumber: 1, difficulty: "MIXED", questionIds: module1Ids },
    { id: MODULE_2_HARD_ID, moduleNumber: 2, difficulty: "HARD", questionIds: module2HardIds },
    { id: MODULE_2_EASY_ID, moduleNumber: 2, difficulty: "EASY", questionIds: module2EasyIds },
  ];

  for (const module of modules) {
    const fields = {
      sectionId: SECTION_ID,
      moduleNumber: module.moduleNumber,
      difficulty: module.difficulty,
    };
    await prisma.module.upsert({
      where: { id: module.id },
      create: { id: module.id, ...fields },
      update: fields,
    });

    // Replace rather than append — `order` is a Float and a second run that
    // added 22 more rows would double the module rather than re-seed it.
    await prisma.moduleQuestion.deleteMany({ where: { moduleId: module.id } });
    await prisma.moduleQuestion.createMany({
      data: module.questionIds.map((questionId, index) => ({
        moduleId: module.id,
        questionId,
        order: index + 1,
      })),
    });

    console.log(
      `  ✓ Module ${module.moduleNumber} (${module.difficulty}) — ${module.questionIds.length} questions`,
    );
  }

  // ---------- Verify against the predicate the landing page uses ----------

  // The tile turns on `isRoutableAdaptiveTest`, so this asserts the same thing
  // the page will ask rather than trusting the writes above.
  const seeded = await prisma.test.findUniqueOrThrow({
    where: { id: TEST_ID },
    select: {
      mode: true,
      sections: {
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
  const routable = isRoutableAdaptiveTest({
    mode: seeded.mode,
    sections: seeded.sections.map((section) => ({
      modules: section.modules.map((module) => ({
        moduleNumber: module.moduleNumber,
        difficulty: module.difficulty,
        questionCount: module._count.moduleQuestions,
      })),
    })),
  });
  if (!routable) {
    throw new Error(
      "Seeded test is not routable — the landing page would still hide the adaptive tile.",
    );
  }

  const distinct = new Set([...module1Ids, ...module2HardIds, ...module2EasyIds]).size;
  console.log(
    `\n"${testFields.title}" seeded: public, ADAPTIVE, threshold ${testFields.adaptiveThreshold}, ` +
      `${distinct} distinct questions across ${modules.length} modules.`,
  );
  if (distinct !== QUESTIONS_PER_MODULE * modules.length) {
    console.warn(
      `Warning: expected ${QUESTIONS_PER_MODULE * modules.length} distinct questions. ` +
        `A repeat means the draw cursors overlapped.`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
