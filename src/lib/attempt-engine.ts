import { Prisma } from "@prisma/client";
import type {
  Module,
  Question,
  Section,
  Test,
  TestAttempt,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAnswerCorrect } from "@/lib/answer-matching";
import { chooseModule2Difficulty } from "@/lib/adaptive-routing";

/** Standard break between Reading-Writing and Math sections. */
export const BREAK_SECONDS = 10 * 60;

// ---------- Start a new attempt ----------

export async function startAttempt(params: { testId: string; userId: string | null }) {
  const test = await prisma.test.findUnique({
    where: { id: params.testId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: { modules: { orderBy: [{ moduleNumber: "asc" }, { difficulty: "asc" }] } },
      },
    },
  });
  if (!test) throw new Error("Test not found");
  if (!params.userId && !test.isPublic) {
    throw new Error("This test requires login");
  }

  const firstSection = test.sections[0];
  if (!firstSection) throw new Error("Test has no sections");
  const firstModule = firstSection.modules.find((m) => m.moduleNumber === 1);
  if (!firstModule) throw new Error("First section is missing Module 1");

  // Make sure all sections have at least one Module 1.
  for (const s of test.sections) {
    if (!s.modules.some((m) => m.moduleNumber === 1)) {
      throw new Error(`Section ${s.id} is missing Module 1`);
    }
  }

  // Refuse to start if any module in the test has zero questions assigned.
  // For adaptive tests, both Module 2 variants must be populated since we don't
  // know which the student will route to until after Module 1 scoring.
  const emptyModules = await prisma.module.findMany({
    where: {
      section: { testId: test.id },
      moduleQuestions: { none: {} },
    },
    include: { section: { select: { type: true } } },
  });
  if (emptyModules.length > 0) {
    const labels = emptyModules.map(
      (m) =>
        `${m.section.type === "READING_WRITING" ? "R&W" : "Math"} M${m.moduleNumber}` +
        (m.difficulty === "MIXED" ? "" : ` (${m.difficulty})`),
    );
    throw new Error(
      `This test has empty modules: ${labels.join(", ")}. Add questions in the admin test builder before starting.`,
    );
  }

  const attempt = await prisma.testAttempt.create({
    data: {
      testId: test.id,
      userId: params.userId,
      currentSectionId: firstSection.id,
      currentModuleId: firstModule.id,
      currentQuestionIndex: 0,
      moduleStartedAt: new Date(),
      breakStartedAt: null,
      status: "IN_PROGRESS",
    },
  });

  return attempt;
}

// ---------- Load attempt state for client ----------

export interface AttemptState {
  attempt: TestAttempt;
  test: Test;
  section: Section;
  module: Module;
  questions: ClientQuestion[];
  answers: ClientAnswer[];
  timeLimitSeconds: number;
  moduleStartedAt: string | null;
  breakStartedAt: string | null;
  isOnBreak: boolean;
  serverNow: number;
  /** Module 1 indexes in this section's progression — used for navigator/header labels. */
  moduleNumber: number;
  totalModulesInSection: number;
  /** Index of this section among ordered sections (0-based). */
  sectionIndex: number;
  totalSections: number;
}

export interface ClientQuestion {
  id: string;
  order: number;
  type: "MULTIPLE_CHOICE" | "STUDENT_PRODUCED_RESPONSE";
  passage: string | null;
  stem: string;
  imageUrl: string | null;
  imagePosition: "TOP" | "INLINE";
  imageMaxWidth: number | null;
  choices: { label: "A" | "B" | "C" | "D"; text: string }[] | null;
}

export interface ClientAnswer {
  questionId: string;
  response: string;
  isMarkedForReview: boolean;
  eliminatedChoices: ("A" | "B" | "C" | "D")[];
  timeSpent: number;
}

export async function loadAttemptState(
  attemptId: string,
): Promise<AttemptState | null> {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: true,
      answers: true,
    },
  });
  if (!attempt) return null;

  // Completed attempts: return what we have, with no current module fields.
  if (attempt.status === "COMPLETED" || !attempt.currentModuleId) {
    return null;
  }

  const currentModule = await prisma.module.findUnique({
    where: { id: attempt.currentModuleId },
    include: {
      section: { include: { test: true } },
      moduleQuestions: {
        orderBy: { order: "asc" },
        include: { question: true },
      },
    },
  });
  if (!currentModule) return null;

  // Flatten the join rows into a plain ordered list of questions.
  const moduleQuestions = currentModule.moduleQuestions.map((mq) => mq.question);

  const sections = await prisma.section.findMany({
    where: { testId: attempt.testId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  const sectionIndex = sections.findIndex((s) => s.id === currentModule.sectionId);

  const timeLimit =
    currentModule.moduleNumber === 1
      ? currentModule.section.module1TimeLimit
      : currentModule.section.module2TimeLimit;

  const isOnBreak = attempt.moduleStartedAt === null && attempt.breakStartedAt !== null;

  const { test: sectionTest, ...sectionFields } = currentModule.section;
  return {
    attempt,
    test: sectionTest,
    section: sectionFields,
    module: currentModule,
    questions: moduleQuestions.map((q, i) => ({
      id: q.id,
      order: i + 1, // display position within the module
      type: q.type,
      passage: q.passage,
      stem: q.stem,
      imageUrl: q.imageUrl,
      imagePosition: q.imagePosition,
      imageMaxWidth: q.imageMaxWidth,
      choices: q.choices as ClientQuestion["choices"],
    })),
    answers: attempt.answers
      .filter((a) => moduleQuestions.some((q) => q.id === a.questionId))
      .map((a) => ({
        questionId: a.questionId,
        response: a.response,
        isMarkedForReview: a.isMarkedForReview,
        eliminatedChoices: (a.eliminatedChoices as ("A" | "B" | "C" | "D")[]) ?? [],
        timeSpent: a.timeSpent,
      })),
    timeLimitSeconds: timeLimit,
    moduleStartedAt: attempt.moduleStartedAt?.toISOString() ?? null,
    breakStartedAt: attempt.breakStartedAt?.toISOString() ?? null,
    isOnBreak,
    serverNow: Date.now(),
    moduleNumber: currentModule.moduleNumber,
    totalModulesInSection: 2,
    sectionIndex,
    totalSections: sections.length,
  };
}

// ---------- Save a single answer ----------

export async function saveAnswer(params: {
  attemptId: string;
  questionId: string;
  response: string;
  isMarkedForReview: boolean;
  eliminatedChoices: ("A" | "B" | "C" | "D")[];
  timeSpent: number;
  currentQuestionIndex?: number;
}) {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: params.attemptId },
  });
  if (!attempt) throw new Error("Attempt not found");
  if (attempt.status !== "IN_PROGRESS") {
    throw new Error("Attempt is not in progress");
  }
  if (!attempt.currentModuleId) throw new Error("No current module");

  // Verify the question is in the current module via the join table.
  const link = await prisma.moduleQuestion.findUnique({
    where: {
      moduleId_questionId: {
        moduleId: attempt.currentModuleId,
        questionId: params.questionId,
      },
    },
    include: { question: true },
  });
  if (!link) {
    throw new Error("Question is not in the current module");
  }
  const question = link.question;

  const isCorrect = isAnswerCorrect(question, params.response);

  await prisma.answer.upsert({
    where: {
      attemptId_questionId: {
        attemptId: params.attemptId,
        questionId: params.questionId,
      },
    },
    create: {
      attemptId: params.attemptId,
      questionId: params.questionId,
      response: params.response,
      isCorrect,
      isMarkedForReview: params.isMarkedForReview,
      eliminatedChoices: params.eliminatedChoices as unknown as Prisma.InputJsonValue,
      timeSpent: params.timeSpent,
    },
    update: {
      response: params.response,
      isCorrect,
      isMarkedForReview: params.isMarkedForReview,
      eliminatedChoices: params.eliminatedChoices as unknown as Prisma.InputJsonValue,
      timeSpent: { increment: Math.max(0, params.timeSpent) },
    },
  });

  if (typeof params.currentQuestionIndex === "number") {
    await prisma.testAttempt.update({
      where: { id: params.attemptId },
      data: { currentQuestionIndex: params.currentQuestionIndex },
    });
  }
}

// ---------- Submit current module ----------

export interface SubmitModuleResult {
  status: "next_module" | "break" | "completed";
  /** When status=break: time remaining (seconds) of the break. */
  breakRemainingSeconds?: number;
}

export async function submitCurrentModule(attemptId: string): Promise<SubmitModuleResult> {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: { test: true },
  });
  if (!attempt) throw new Error("Attempt not found");
  if (attempt.status !== "IN_PROGRESS") {
    throw new Error("Attempt is not in progress");
  }
  if (!attempt.currentModuleId) throw new Error("No current module");

  const currentModule = await prisma.module.findUnique({
    where: { id: attempt.currentModuleId },
    include: {
      section: true,
      moduleQuestions: {
        orderBy: { order: "asc" },
        include: {
          question: {
            select: { id: true, type: true, correctAnswer: true, acceptedAnswers: true },
          },
        },
      },
    },
  });
  if (!currentModule) throw new Error("Module not found");

  const moduleQuestions = currentModule.moduleQuestions.map((mq) => mq.question);

  const moduleAnswers = await prisma.answer.findMany({
    where: {
      attemptId,
      questionId: { in: moduleQuestions.map((q) => q.id) },
    },
  });

  let correct = 0;
  for (const q of moduleQuestions) {
    const a = moduleAnswers.find((x) => x.questionId === q.id);
    if (a && isAnswerCorrect(q, a.response)) correct++;
  }

  const next = await pickNextModule({
    test: attempt.test,
    currentModule,
    correctCount: correct,
    totalCount: moduleQuestions.length,
  });

  await prisma.moduleResult.upsert({
    where: { attemptId_moduleId: { attemptId, moduleId: currentModule.id } },
    create: {
      attemptId,
      moduleId: currentModule.id,
      correctCount: correct,
      totalCount: moduleQuestions.length,
      routedTo: next?.id ?? null,
    },
    update: {
      correctCount: correct,
      totalCount: moduleQuestions.length,
      routedTo: next?.id ?? null,
    },
  });

  if (!next) {
    await prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        currentModuleId: null,
        currentSectionId: null,
        moduleStartedAt: null,
        breakStartedAt: null,
      },
    });
    return { status: "completed" };
  }

  const crossesSection = next.sectionId !== currentModule.sectionId;
  if (crossesSection) {
    const now = new Date();
    await prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        currentSectionId: next.sectionId,
        currentModuleId: next.id,
        currentQuestionIndex: 0,
        moduleStartedAt: null,
        breakStartedAt: now,
      },
    });
    return { status: "break", breakRemainingSeconds: BREAK_SECONDS };
  }

  // Same section: auto-start next module immediately.
  await prisma.testAttempt.update({
    where: { id: attemptId },
    data: {
      currentSectionId: next.sectionId,
      currentModuleId: next.id,
      currentQuestionIndex: 0,
      moduleStartedAt: new Date(),
      breakStartedAt: null,
    },
  });
  return { status: "next_module" };
}

/**
 * Pick the next module in the test progression.
 *  - From Module 1 → Module 2 of the same section:
 *      LINEAR: the single Module 2.
 *      ADAPTIVE: routed by `adaptiveThreshold` (≥ → HARD, < → EASY).
 *  - From Module 2 → Module 1 of the next ordered section.
 *  - End of last section → null (test complete).
 */
async function pickNextModule(params: {
  test: Test;
  currentModule: Module & { section: Section };
  correctCount: number;
  totalCount: number;
}): Promise<(Module & { section: Section }) | null> {
  const { test, currentModule, correctCount, totalCount } = params;

  if (currentModule.moduleNumber === 1) {
    if (test.mode === "LINEAR") {
      return prisma.module.findFirst({
        where: { sectionId: currentModule.sectionId, moduleNumber: 2 },
        include: { section: true },
        orderBy: { difficulty: "asc" },
      });
    }
    // Adaptive routing — decision made by a pure function (see adaptive-routing.ts).
    const target = chooseModule2Difficulty({
      mode: test.mode,
      adaptiveThreshold: test.adaptiveThreshold,
      correctCount,
      totalCount,
    });
    const routed = await prisma.module.findFirst({
      where: { sectionId: currentModule.sectionId, moduleNumber: 2, difficulty: target },
      include: { section: true },
    });
    if (routed) return routed;
    // Fallback: any Module 2 in this section.
    return prisma.module.findFirst({
      where: { sectionId: currentModule.sectionId, moduleNumber: 2 },
      include: { section: true },
    });
  }

  // Module 2 → next section's Module 1
  const nextSection = await prisma.section.findFirst({
    where: { testId: test.id, order: { gt: currentModule.section.order } },
    orderBy: { order: "asc" },
  });
  if (!nextSection) return null;

  const m1 = await prisma.module.findFirst({
    where: { sectionId: nextSection.id, moduleNumber: 1 },
    include: { section: true },
  });
  return m1;
}

// ---------- End break, start the next module ----------

export async function endBreakAndStartModule(attemptId: string) {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
  });
  if (!attempt) throw new Error("Attempt not found");
  if (attempt.status !== "IN_PROGRESS") throw new Error("Attempt not in progress");
  if (attempt.moduleStartedAt) return; // already running
  await prisma.testAttempt.update({
    where: { id: attemptId },
    data: { moduleStartedAt: new Date(), breakStartedAt: null },
  });
}

// ---------- Final completion ----------

export async function completeAttempt(attemptId: string) {
  const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new Error("Attempt not found");
  if (attempt.status === "COMPLETED") return;
  await prisma.testAttempt.update({
    where: { id: attemptId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}
