import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Difficulty, SectionType, TestMode } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  completeAttempt,
  endBreakAndStartModule,
  loadAttemptState,
  reconcileAttemptLifecycle,
  saveAnswer,
  startAttempt,
  submitCurrentModule,
} from "@/lib/attempt-engine";

type ModuleFixture = {
  id: string;
  questionId: string;
  difficulty: Difficulty;
};

type SectionFixture = {
  id: string;
  module1: ModuleFixture;
  module2Easy?: ModuleFixture;
  module2Hard?: ModuleFixture;
  module2Linear?: ModuleFixture;
};

async function addQuestion(moduleId: string, sectionType: SectionType, index: number) {
  const question = await prisma.question.create({
    data: {
      contentHash: randomUUID(),
      sectionType,
      type: "MULTIPLE_CHOICE",
      // Ids from the controlled vocabulary (T2.2) — `domainId` is a required
      // FK, so the taxonomy must be seeded before this suite runs.
      domainId: sectionType === "MATH" ? "algebra" : "info-ideas",
      skillId: null,
      difficulty: "MEDIUM",
      passage: null,
      stem: `Integration question ${randomUUID()}`,
      choices: [
        { label: "A", text: "Correct" },
        { label: "B", text: "Incorrect" },
        { label: "C", text: "Incorrect" },
        { label: "D", text: "Incorrect" },
      ],
      correctAnswer: "A",
      acceptedAnswers: [],
      explanation: "This explanation must never reach the attempt client.",
    },
  });
  await prisma.moduleQuestion.create({
    data: { moduleId, questionId: question.id, order: index },
  });
  return question.id;
}

async function createSection(params: {
  testId: string;
  mode: TestMode;
  order: number;
  type: SectionType;
  omitHard?: boolean;
}): Promise<SectionFixture> {
  const section = await prisma.section.create({
    data: {
      testId: params.testId,
      type: params.type,
      order: params.order,
      module1TimeLimit: 3_600,
      module2TimeLimit: 3_600,
    },
  });
  const module1 = await prisma.module.create({
    data: { sectionId: section.id, moduleNumber: 1, difficulty: "MIXED" },
  });
  const fixture: SectionFixture = {
    id: section.id,
    module1: {
      id: module1.id,
      questionId: await addQuestion(module1.id, params.type, 1),
      difficulty: "MIXED",
    },
  };

  if (params.mode === "LINEAR") {
    const module2 = await prisma.module.create({
      data: { sectionId: section.id, moduleNumber: 2, difficulty: "MIXED" },
    });
    fixture.module2Linear = {
      id: module2.id,
      questionId: await addQuestion(module2.id, params.type, 2),
      difficulty: "MIXED",
    };
    return fixture;
  }

  const easy = await prisma.module.create({
    data: { sectionId: section.id, moduleNumber: 2, difficulty: "EASY" },
  });
  fixture.module2Easy = {
    id: easy.id,
    questionId: await addQuestion(easy.id, params.type, 2),
    difficulty: "EASY",
  };

  if (!params.omitHard) {
    const hard = await prisma.module.create({
      data: { sectionId: section.id, moduleNumber: 2, difficulty: "HARD" },
    });
    fixture.module2Hard = {
      id: hard.id,
      questionId: await addQuestion(hard.id, params.type, 3),
      difficulty: "HARD",
    };
  }
  return fixture;
}

async function createLifecycleTest(mode: TestMode) {
  const test = await prisma.test.create({
    data: {
      title: `${mode} lifecycle ${randomUUID()}`,
      mode,
      isPublic: true,
      adaptiveThreshold: 0.5,
    },
  });
  const readingWriting = await createSection({
    testId: test.id,
    mode,
    order: 1,
    type: "READING_WRITING",
  });
  const math = await createSection({
    testId: test.id,
    mode,
    order: 2,
    type: "MATH",
  });
  return { test, readingWriting, math };
}

async function answerCorrectly(attemptId: string, questionId: string) {
  await saveAnswer({
    attemptId,
    questionId,
    response: "A",
    isMarkedForReview: false,
    eliminatedChoices: [],
    timeSpent: 5,
    currentQuestionIndex: 0,
  });
}

describe("attempt lifecycle against Postgres", () => {
  beforeEach(async () => {
    await prisma.test.deleteMany();
    await prisma.question.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it.each(["ADAPTIVE", "LINEAR"] as const)(
    "drives a %s attempt through routing, break, reset, and completion",
    async (mode) => {
      const fixture = await createLifecycleTest(mode);
      const firstM2 =
        mode === "ADAPTIVE"
          ? fixture.readingWriting.module2Hard!
          : fixture.readingWriting.module2Linear!;
      const secondM2 =
        mode === "ADAPTIVE" ? fixture.math.module2Hard! : fixture.math.module2Linear!;

      const attempt = await startAttempt({ testId: fixture.test.id, userId: null });
      expect(attempt.currentModuleId).toBe(fixture.readingWriting.module1.id);
      expect(attempt.status).toBe("IN_PROGRESS");

      const initialState = await loadAttemptState(attempt.id, null);
      expect(initialState?.questions).toHaveLength(1);
      expect(JSON.stringify(initialState)).not.toMatch(
        /correctAnswer|acceptedAnswers|explanation/,
      );

      await answerCorrectly(attempt.id, fixture.readingWriting.module1.questionId);
      await expect(submitCurrentModule(attempt.id, fixture.readingWriting.module1.id)).resolves.toEqual({
        status: "next_module",
      });
      let persisted = await prisma.testAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
      expect(persisted.currentModuleId).toBe(firstM2.id);
      expect(persisted.currentQuestionIndex).toBe(0);
      expect(persisted.moduleStartedAt).not.toBeNull();

      await answerCorrectly(attempt.id, firstM2.questionId);
      await expect(submitCurrentModule(attempt.id, firstM2.id)).resolves.toMatchObject({ status: "break" });
      persisted = await prisma.testAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
      expect(persisted.currentModuleId).toBe(fixture.math.module1.id);
      expect(persisted.currentQuestionIndex).toBe(0);
      expect(persisted.moduleStartedAt).toBeNull();
      expect(persisted.moduleDeadlineAt).toBeNull();
      expect(persisted.breakStartedAt).not.toBeNull();

      const breakState = await loadAttemptState(attempt.id, null);
      expect(breakState?.isOnBreak).toBe(true);
      expect(JSON.stringify(breakState)).not.toMatch(
        /correctAnswer|acceptedAnswers|explanation/,
      );

      await endBreakAndStartModule(attempt.id);
      persisted = await prisma.testAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
      expect(persisted.moduleStartedAt).not.toBeNull();
      expect(persisted.moduleDeadlineAt).not.toBeNull();
      expect(persisted.breakStartedAt).toBeNull();

      await answerCorrectly(attempt.id, fixture.math.module1.questionId);
      await expect(submitCurrentModule(attempt.id, fixture.math.module1.id)).resolves.toEqual({
        status: "next_module",
      });
      persisted = await prisma.testAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
      expect(persisted.currentModuleId).toBe(secondM2.id);

      await answerCorrectly(attempt.id, secondM2.questionId);
      await expect(submitCurrentModule(attempt.id, secondM2.id)).resolves.toEqual({ status: "completed" });
      persisted = await prisma.testAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
      expect(persisted).toMatchObject({
        status: "COMPLETED",
        currentSectionId: null,
        currentModuleId: null,
        moduleStartedAt: null,
        moduleDeadlineAt: null,
        breakStartedAt: null,
      });
      expect(await loadAttemptState(attempt.id, null)).toBeNull();
      expect(await prisma.moduleResult.count({ where: { attemptId: attempt.id } })).toBe(4);
    },
  );

  it("falls back to the available M2 when the targeted HARD variant is missing", async () => {
    const test = await prisma.test.create({
      data: {
        title: `Missing hard variant ${randomUUID()}`,
        mode: "ADAPTIVE",
        isPublic: true,
        adaptiveThreshold: 0.5,
      },
    });
    const section = await createSection({
      testId: test.id,
      mode: "ADAPTIVE",
      order: 1,
      type: "MATH",
      omitHard: true,
    });

    const attempt = await startAttempt({ testId: test.id, userId: null });
    await answerCorrectly(attempt.id, section.module1.questionId);
    await expect(submitCurrentModule(attempt.id, section.module1.id)).resolves.toEqual({
      status: "next_module",
    });

    const persisted = await prisma.testAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
    expect(persisted.currentModuleId).toBe(section.module2Easy!.id);
    const result = await prisma.moduleResult.findUniqueOrThrow({
      where: {
        attemptId_moduleId: { attemptId: attempt.id, moduleId: section.module1.id },
      },
    });
    expect(result.correctCount).toBe(1);
    expect(result.routedTo).toBe(section.module2Easy!.id);
  });

  it("makes concurrent submits for the same module idempotent", async () => {
    const fixture = await createLifecycleTest("LINEAR");
    const attempt = await startAttempt({ testId: fixture.test.id, userId: null });
    await loadAttemptState(attempt.id, null);
    await answerCorrectly(attempt.id, fixture.readingWriting.module1.questionId);

    const results = await Promise.all([
      submitCurrentModule(attempt.id, fixture.readingWriting.module1.id),
      submitCurrentModule(attempt.id, fixture.readingWriting.module1.id),
    ]);

    expect(results).toEqual([{ status: "next_module" }, { status: "next_module" }]);
    const persisted = await prisma.testAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
    expect(persisted.currentModuleId).toBe(fixture.readingWriting.module2Linear!.id);
    expect(await prisma.moduleResult.count({ where: { attemptId: attempt.id } })).toBe(1);
    expect(
      await prisma.moduleResult.findUnique({
        where: {
          attemptId_moduleId: {
            attemptId: attempt.id,
            moduleId: fixture.readingWriting.module2Linear!.id,
          },
        },
      }),
    ).toBeNull();
  });

  it("grades from the question snapshot after the live answer key is edited", async () => {
    const test = await prisma.test.create({
      data: { title: `Snapshot ${randomUUID()}`, mode: "LINEAR", isPublic: true },
    });
    const section = await createSection({
      testId: test.id,
      mode: "LINEAR",
      order: 1,
      type: "MATH",
    });
    const attempt = await startAttempt({ testId: test.id, userId: null });
    await loadAttemptState(attempt.id, null);

    await prisma.question.update({
      where: { id: section.module1.questionId },
      data: { correctAnswer: "B" },
    });
    await answerCorrectly(attempt.id, section.module1.questionId);
    await saveAnswer({
      attemptId: attempt.id,
      questionId: section.module1.questionId,
      response: "A",
      isMarkedForReview: false,
      eliminatedChoices: [],
      timeSpent: 8,
    });
    const answer = await prisma.answer.findUniqueOrThrow({
      where: {
        attemptId_questionId: {
          attemptId: attempt.id,
          questionId: section.module1.questionId,
        },
      },
    });
    expect(answer.isCorrect).toBe(true);
    expect(answer.timeSpent).toBe(8);
    expect(answer.createdAt).toBeInstanceOf(Date);

    await submitCurrentModule(attempt.id, section.module1.id);
    const result = await prisma.moduleResult.findUniqueOrThrow({
      where: { attemptId_moduleId: { attemptId: attempt.id, moduleId: section.module1.id } },
    });
    expect(result.correctCount).toBe(1);
  });

  it("scores saved work and marks an overdue module EXPIRED", async () => {
    const test = await prisma.test.create({
      data: { title: `Expiry ${randomUUID()}`, mode: "LINEAR", isPublic: true },
    });
    const section = await createSection({
      testId: test.id,
      mode: "LINEAR",
      order: 1,
      type: "MATH",
    });
    const attempt = await startAttempt({ testId: test.id, userId: null });
    await loadAttemptState(attempt.id, null);
    await answerCorrectly(attempt.id, section.module1.questionId);
    const now = new Date();
    await prisma.testAttempt.update({
      where: { id: attempt.id },
      data: { moduleDeadlineAt: new Date(now.getTime() - 1_000) },
    });

    await expect(reconcileAttemptLifecycle(attempt.id, now)).resolves.toBe("expired");
    const expired = await prisma.testAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
    expect(expired.status).toBe("EXPIRED");
    expect(expired.currentModuleId).toBeNull();
    const result = await prisma.moduleResult.findUniqueOrThrow({
      where: { attemptId_moduleId: { attemptId: attempt.id, moduleId: section.module1.id } },
    });
    expect(result.correctCount).toBe(1);
  });

  it("bounds an expired break and expires an absurdly late resume", async () => {
    const fixture = await createLifecycleTest("LINEAR");
    const now = new Date();
    const breakStartedAt = new Date(now.getTime() - 11 * 60 * 1_000);
    const resumable = await prisma.testAttempt.create({
      data: {
        testId: fixture.test.id,
        currentSectionId: fixture.math.id,
        currentModuleId: fixture.math.module1.id,
        moduleStartedAt: null,
        moduleDeadlineAt: null,
        breakStartedAt,
        status: "IN_PROGRESS",
      },
    });

    await expect(reconcileAttemptLifecycle(resumable.id, now)).resolves.toBe("advanced");
    const advanced = await prisma.testAttempt.findUniqueOrThrow({ where: { id: resumable.id } });
    expect(advanced.moduleStartedAt?.getTime()).toBe(
      breakStartedAt.getTime() + 10 * 60 * 1_000,
    );
    expect(advanced.moduleDeadlineAt).not.toBeNull();

    const farTooLate = await prisma.testAttempt.create({
      data: {
        testId: fixture.test.id,
        currentSectionId: fixture.math.id,
        currentModuleId: fixture.math.module1.id,
        moduleStartedAt: null,
        moduleDeadlineAt: null,
        breakStartedAt: new Date(now.getTime() - 3 * 60 * 60 * 1_000),
        status: "IN_PROGRESS",
      },
    });
    await expect(reconcileAttemptLifecycle(farTooLate.id, now)).resolves.toBe("expired");
    expect(
      (await prisma.testAttempt.findUniqueOrThrow({ where: { id: farTooLate.id } })).status,
    ).toBe("EXPIRED");
  });

  it("rejects on-demand completion before final-module submission", async () => {
    const fixture = await createLifecycleTest("LINEAR");
    const attempt = await startAttempt({ testId: fixture.test.id, userId: null });

    await expect(completeAttempt(attempt.id)).rejects.toThrow(
      "Only final-module submission can complete an attempt",
    );
    expect(
      (await prisma.testAttempt.findUniqueOrThrow({ where: { id: attempt.id } })).status,
    ).toBe("IN_PROGRESS");
  });

  it("appends concurrent integrity events without dropping rows", async () => {
    const fixture = await createLifecycleTest("LINEAR");
    const attempt = await startAttempt({ testId: fixture.test.id, userId: null });
    const occurredAt = new Date();

    await Promise.all(
      Array.from({ length: 24 }, (_, index) =>
        prisma.attemptEvent.create({
          data: {
            attemptId: attempt.id,
            type: index % 2 === 0 ? "BLUR" : "FOCUS",
            occurredAt: new Date(occurredAt.getTime() + index),
          },
        }),
      ),
    );

    await expect(
      prisma.attemptEvent.count({ where: { attemptId: attempt.id } }),
    ).resolves.toBe(24);
  });
});
