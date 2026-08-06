import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  testAttempt: { findUnique: vi.fn() },
  module: { findUnique: vi.fn() },
  section: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/test-access", () => ({
  canAccessTest: vi.fn().mockResolvedValue(true),
}));

import { loadAttemptState } from "@/lib/attempt-engine";

describe("ClientQuestion payload security boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("never sends answers or explanations from the full question row", async () => {
    const test = {
      id: "test-1",
      title: "SAT Practice",
      isPublic: true,
      createdById: null,
    };
    const startedAt = new Date("2026-08-06T10:00:00.000Z");

    prismaMock.testAttempt.findUnique.mockResolvedValue({
      id: "attempt-1",
      testId: test.id,
      status: "IN_PROGRESS",
      currentModuleId: "module-1",
      currentQuestionIndex: 0,
      moduleStartedAt: startedAt,
      breakStartedAt: null,
      answers: [],
      test,
    });
    prismaMock.module.findUnique.mockResolvedValue({
      id: "module-1",
      sectionId: "section-1",
      moduleNumber: 1,
      difficulty: "MIXED",
      section: {
        id: "section-1",
        testId: test.id,
        type: "MATH",
        order: 1,
        module1TimeLimit: 1_920,
        module2TimeLimit: 1_920,
        test,
      },
      moduleQuestions: [
        {
          order: 1,
          question: {
            id: "question-1",
            type: "MULTIPLE_CHOICE",
            passage: null,
            stem: "What is 2 + 2?",
            imageUrl: null,
            imagePosition: "INLINE",
            imageMaxWidth: null,
            choices: [
              { label: "A", text: "3" },
              { label: "B", text: "4" },
            ],
            correctAnswer: "B",
            acceptedAnswers: ["4"],
            explanation: "Two plus two equals four.",
          },
        },
      ],
    });
    prismaMock.section.findMany.mockResolvedValue([{ id: "section-1", order: 1 }]);

    const state = await loadAttemptState("attempt-1", { id: "student-1" });
    const clientQuestion = state?.questions[0];

    expect(clientQuestion).toBeDefined();
    expect(clientQuestion).not.toHaveProperty("correctAnswer");
    expect(clientQuestion).not.toHaveProperty("acceptedAnswers");
    expect(clientQuestion).not.toHaveProperty("explanation");
  });
});
