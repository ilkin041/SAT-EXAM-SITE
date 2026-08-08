import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
  testAttempt: { findUnique: vi.fn(), updateMany: vi.fn() },
  module: { findUnique: vi.fn() },
  section: { findMany: vi.fn() },
  attemptQuestionSnapshot: { createMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/test-access", () => ({
  canAccessTest: vi.fn().mockResolvedValue(true),
}));

import { loadAttemptState } from "@/lib/attempt-engine";

const test = {
  id: "test-1",
  title: "SAT Practice",
  isPublic: true,
  createdById: null,
};

const secretQuestions = [
  {
    id: "mcq-1",
    type: "MULTIPLE_CHOICE",
    passage: "A short passage",
    stem: "What is 2 + 2?",
    imageUrl: null,
    imagePosition: "INLINE",
    imageMaxWidth: null,
    choices: [
      { label: "A", text: "3" },
      { label: "B", text: "4" },
    ],
    correctAnswer: "B",
    acceptedAnswers: [],
    explanation: "Two plus two equals four.",
    // The pre-rendered blob carries the explanation too. The mapping must
    // pick fields off it rather than forward it whole.
    renderedHtml: {
      v: 1,
      stem: "<p>What is 2 + 2?</p>",
      passage: "<p>A short passage</p>",
      explanation: "<p>Two plus two equals four.</p>",
      choices: [
        { label: "A", html: "3" },
        { label: "B", html: "4" },
      ],
    },
  },
  {
    id: "spr-1",
    type: "STUDENT_PRODUCED_RESPONSE",
    passage: null,
    stem: "Enter one half.",
    imageUrl: null,
    imagePosition: "TOP",
    imageMaxWidth: 480,
    choices: null,
    correctAnswer: "1/2",
    acceptedAnswers: ["0.5", ".5"],
    explanation: "One half is 0.5.",
  },
];

function arrangePhase({
  moduleNumber,
  onBreak = false,
}: {
  moduleNumber: 1 | 2;
  onBreak?: boolean;
}) {
  const moduleId = `module-${moduleNumber}`;
  prismaMock.testAttempt.findUnique.mockResolvedValue({
    id: "attempt-1",
    testId: test.id,
    status: "IN_PROGRESS",
    currentModuleId: moduleId,
    currentQuestionIndex: 0,
    moduleStartedAt: onBreak ? null : new Date("2026-08-06T10:00:00.000Z"),
    moduleDeadlineAt: onBreak ? null : new Date("2099-08-06T11:00:00.000Z"),
    breakStartedAt: onBreak ? new Date("2099-08-06T10:30:00.000Z") : null,
    answers: [],
    test,
  });
  prismaMock.module.findUnique.mockResolvedValue({
    id: moduleId,
    sectionId: "section-1",
    moduleNumber,
    difficulty: moduleNumber === 1 ? "MIXED" : "HARD",
    section: {
      id: "section-1",
      testId: test.id,
      type: "MATH",
      order: 1,
      module1TimeLimit: 1_920,
      module2TimeLimit: 1_920,
      test,
    },
    moduleQuestions: secretQuestions.map((question, index) => ({
      order: index + 1,
      question,
    })),
  });
  prismaMock.section.findMany.mockResolvedValue([{ id: "section-1", order: 1 }]);
}

function expectNoSecrets(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("correctAnswer");
  expect(serialized).not.toContain("acceptedAnswers");
  expect(serialized).not.toContain("explanation");
}

describe("ClientQuestion payload security boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    prismaMock.testAttempt.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.attemptQuestionSnapshot.createMany.mockResolvedValue({ count: 2 });
  });

  it.each([
    { phase: "module 1", moduleNumber: 1 as const, onBreak: false },
    { phase: "module 2", moduleNumber: 2 as const, onBreak: false },
    { phase: "break before the next module", moduleNumber: 1 as const, onBreak: true },
  ])("does not serialize MCQ or SPR secrets during $phase", async ({ moduleNumber, onBreak }) => {
    arrangePhase({ moduleNumber, onBreak });

    const state = await loadAttemptState("attempt-1", { id: "student-1" });

    expect(state?.questions.map((question) => question.type)).toEqual([
      "MULTIPLE_CHOICE",
      "STUDENT_PRODUCED_RESPONSE",
    ]);
    expectNoSecrets(state);
  });

  it("returns no question payload after completion", async () => {
    prismaMock.testAttempt.findUnique.mockResolvedValue({
      id: "attempt-1",
      testId: test.id,
      status: "COMPLETED",
      currentModuleId: null,
      answers: [],
      test,
    });

    const state = await loadAttemptState("attempt-1", { id: "student-1" });

    expect(state).toBeNull();
    expectNoSecrets(state);
    expect(prismaMock.module.findUnique).not.toHaveBeenCalled();
  });
});
