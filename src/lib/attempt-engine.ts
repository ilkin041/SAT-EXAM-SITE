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
import { canAccessTest, type TestAccessUser } from "@/lib/test-access";
import {
  readRenderedQuestion,
  type RenderedChoice,
} from "@/lib/rendered-question";
import {
  AttemptTransitionConflict,
  lockAttempt,
  transitionAttempt,
} from "@/lib/attempt-transitions";

/** Standard break between Reading-Writing and Math sections. */
export const BREAK_SECONDS = 10 * 60;
/** Allows requests already in flight when the visible timer reaches zero. */
export const DEADLINE_GRACE_SECONDS = 10;

export class AttemptMutationError extends Error {
  constructor(
    message: string,
    readonly code: "TIME_EXPIRED" | "MODULE_NOT_STARTED" | "ATTEMPT_EXPIRED",
  ) {
    super(message);
    this.name = "AttemptMutationError";
  }
}

export function calculateModuleDeadline(startedAt: Date, timeLimitSeconds: number): Date {
  return new Date(
    startedAt.getTime() + (timeLimitSeconds + DEADLINE_GRACE_SECONDS) * 1000,
  );
}

export function isModuleDeadlineExpired(deadline: Date, now = Date.now()): boolean {
  return now > deadline.getTime();
}

type Transaction = Prisma.TransactionClient;

function moduleTimeLimit(module: {
  moduleNumber: number;
  section: { module1TimeLimit: number; module2TimeLimit: number };
}) {
  return module.moduleNumber === 1
    ? module.section.module1TimeLimit
    : module.section.module2TimeLimit;
}

async function scoreCurrentModuleForExpiry(
  tx: Transaction,
  attemptId: string,
  moduleId: string,
) {
  const questionLinks = await tx.moduleQuestion.findMany({
    where: { moduleId },
    select: { questionId: true },
  });
  const questionIds = questionLinks.map((link) => link.questionId);
  const correct = await tx.answer.count({
    where: { attemptId, questionId: { in: questionIds }, isCorrect: true },
  });
  await tx.moduleResult.upsert({
    where: { attemptId_moduleId: { attemptId, moduleId } },
    create: {
      attemptId,
      moduleId,
      correctCount: correct,
      totalCount: questionIds.length,
      routedTo: null,
    },
    update: {
      correctCount: correct,
      totalCount: questionIds.length,
      routedTo: null,
    },
  });
}

async function expireAttemptInTransaction(
  tx: Transaction,
  attempt: TestAttempt,
  now: Date,
) {
  if (attempt.currentModuleId && attempt.moduleStartedAt) {
    await scoreCurrentModuleForExpiry(tx, attempt.id, attempt.currentModuleId);
  }
  await transitionAttempt(tx, {
    attemptId: attempt.id,
    expectedStatus: "IN_PROGRESS",
    expectedModuleId: attempt.currentModuleId,
    data: {
      status: "EXPIRED",
      completedAt: now,
      currentSectionId: null,
      currentModuleId: null,
      moduleStartedAt: null,
      moduleDeadlineAt: null,
      breakStartedAt: null,
    },
  });
}

async function deadlineForAttempt(tx: Transaction, attempt: TestAttempt) {
  if (!attempt.currentModuleId || !attempt.moduleStartedAt) return null;
  if (attempt.moduleDeadlineAt) return attempt.moduleDeadlineAt;
  const currentModule = await tx.module.findUnique({
    where: { id: attempt.currentModuleId },
    select: {
      moduleNumber: true,
      section: { select: { module1TimeLimit: true, module2TimeLimit: true } },
    },
  });
  if (!currentModule) throw new Error("Module not found");
  const deadline = calculateModuleDeadline(
    attempt.moduleStartedAt,
    moduleTimeLimit(currentModule),
  );
  await transitionAttempt(tx, {
    attemptId: attempt.id,
    expectedStatus: "IN_PROGRESS",
    expectedModuleId: attempt.currentModuleId,
    data: { moduleDeadlineAt: deadline },
  });
  return deadline;
}

type ReconcileResult = "active" | "break" | "advanced" | "expired" | "closed";

/** Lazy lifecycle enforcement used by every attempt read and the nightly sweep. */
export async function reconcileAttemptLifecycle(
  attemptId: string,
  now = new Date(),
): Promise<ReconcileResult> {
  return prisma.$transaction(async (tx) => {
    await lockAttempt(tx, attemptId);
    const attempt = await tx.testAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.status !== "IN_PROGRESS") return "closed";

    if (attempt.breakStartedAt && !attempt.moduleStartedAt && attempt.currentModuleId) {
      const breakEndsAt = new Date(attempt.breakStartedAt.getTime() + BREAK_SECONDS * 1000);
      if (now < breakEndsAt) return "break";
      const nextModule = await tx.module.findUnique({
        where: { id: attempt.currentModuleId },
        select: {
          moduleNumber: true,
          section: { select: { module1TimeLimit: true, module2TimeLimit: true } },
        },
      });
      if (!nextModule) throw new Error("Module not found");
      const deadline = calculateModuleDeadline(breakEndsAt, moduleTimeLimit(nextModule));
      if (isModuleDeadlineExpired(deadline, now.getTime())) {
        await expireAttemptInTransaction(tx, attempt, now);
        return "expired";
      }
      await transitionAttempt(tx, {
        attemptId,
        expectedStatus: "IN_PROGRESS",
        expectedModuleId: attempt.currentModuleId,
        data: {
          moduleStartedAt: breakEndsAt,
          moduleDeadlineAt: deadline,
          breakStartedAt: null,
        },
      });
      return "advanced";
    }

    const deadline = await deadlineForAttempt(tx, attempt);
    if (!deadline) return "active";
    if (isModuleDeadlineExpired(deadline, now.getTime())) {
      await expireAttemptInTransaction(tx, attempt, now);
      return "expired";
    }
    return "active";
  }, { timeout: 60_000 });
}

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

  const startedAt = new Date();
  const attempt = await prisma.testAttempt.create({
    data: {
      testId: test.id,
      userId: params.userId,
      currentSectionId: firstSection.id,
      currentModuleId: firstModule.id,
      currentQuestionIndex: 0,
      moduleStartedAt: startedAt,
      moduleDeadlineAt: calculateModuleDeadline(startedAt, firstSection.module1TimeLimit),
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
  /**
   * Rendered and sanitized on the server. The test interface is a client
   * component, so shipping raw `$…$` here would mean shipping KaTeX with it.
   */
  passageHtml: string | null;
  stemHtml: string;
  imageUrl: string | null;
  imagePosition: "TOP" | "INLINE";
  imageMaxWidth: number | null;
  choices: RenderedChoice[] | null;
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
  user: TestAccessUser | null | undefined,
): Promise<AttemptState | null> {
  await reconcileAttemptLifecycle(attemptId);
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: true,
      answers: true,
    },
  });
  if (!attempt) return null;
  if (!(await canAccessTest(user, attempt.test))) return null;

  // Closed attempts have no current module payload.
  if (attempt.status !== "IN_PROGRESS" || !attempt.currentModuleId) {
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

  // Capture grading fields from these exact in-memory Question rows before they
  // are projected to the client. A later admin edit cannot change this attempt.
  if (!isOnBreak) {
    await prisma.attemptQuestionSnapshot.createMany({
      data: currentModule.moduleQuestions.map((mq) => ({
        attemptId,
        moduleId: currentModule.id,
        questionId: mq.question.id,
        questionType: mq.question.type,
        correctAnswer: mq.question.correctAnswer,
        acceptedAnswers:
          mq.question.acceptedAnswers === null
            ? Prisma.DbNull
            : (mq.question.acceptedAnswers as Prisma.InputJsonValue),
      })),
      skipDuplicates: true,
    });
  }

  const { test: sectionTest, ...sectionFields } = currentModule.section;
  // `currentModule` was loaded with full Question rows for server-side assembly.
  // Never return its relation fields: they contain answer keys and explanations.
  const moduleFields: Module = {
    id: currentModule.id,
    sectionId: currentModule.sectionId,
    moduleNumber: currentModule.moduleNumber,
    difficulty: currentModule.difficulty,
  };
  return {
    attempt,
    test: sectionTest,
    section: sectionFields,
    module: moduleFields,
    questions: moduleQuestions.map((q, i) => {
      const rendered = readRenderedQuestion(q);
      return {
        id: q.id,
        order: i + 1, // display position within the module
        type: q.type,
        passageHtml: rendered.passage,
        stemHtml: rendered.stem,
        imageUrl: q.imageUrl,
        imagePosition: q.imagePosition,
        imageMaxWidth: q.imageMaxWidth,
        choices: rendered.choices,
      };
    }),
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
  const outcome = await prisma.$transaction(async (tx) => {
    await lockAttempt(tx, params.attemptId);
    const attempt = await tx.testAttempt.findUnique({ where: { id: params.attemptId } });
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.status === "EXPIRED") return "expired" as const;
    if (attempt.status !== "IN_PROGRESS") throw new Error("Attempt is not in progress");
    if (!attempt.currentModuleId || !attempt.moduleStartedAt) {
      throw new AttemptMutationError("The module has not started", "MODULE_NOT_STARTED");
    }
    const deadline = await deadlineForAttempt(tx, attempt);
    if (!deadline || isModuleDeadlineExpired(deadline)) {
      await expireAttemptInTransaction(tx, attempt, new Date());
      return "expired" as const;
    }

    // Verify the question is in the locked current module.
    const link = await tx.moduleQuestion.findUnique({
      where: {
        moduleId_questionId: {
          moduleId: attempt.currentModuleId,
          questionId: params.questionId,
        },
      },
      include: { question: true },
    });
    if (!link) throw new Error("Question is not in the current module");

    let snapshot = await tx.attemptQuestionSnapshot.findUnique({
      where: {
        attemptId_questionId: {
          attemptId: params.attemptId,
          questionId: params.questionId,
        },
      },
    });
    if (!snapshot) {
      snapshot = await tx.attemptQuestionSnapshot.create({
        data: {
          attemptId: params.attemptId,
          moduleId: attempt.currentModuleId,
          questionId: link.question.id,
          questionType: link.question.type,
          correctAnswer: link.question.correctAnswer,
          acceptedAnswers:
            link.question.acceptedAnswers === null
              ? Prisma.DbNull
              : (link.question.acceptedAnswers as Prisma.InputJsonValue),
        },
      });
    }

    const isCorrect = isAnswerCorrect(
      {
        type: snapshot.questionType,
        correctAnswer: snapshot.correctAnswer,
        acceptedAnswers: snapshot.acceptedAnswers,
      } as Pick<Question, "type" | "correctAnswer" | "acceptedAnswers">,
      params.response,
    );
    const existingAnswer = await tx.answer.findUnique({
      where: {
        attemptId_questionId: {
          attemptId: params.attemptId,
          questionId: params.questionId,
        },
      },
      select: { timeSpent: true },
    });
    const accumulatedTime = Math.max(
      existingAnswer?.timeSpent ?? 0,
      Math.max(0, params.timeSpent),
    );

    await tx.answer.upsert({
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
        timeSpent: accumulatedTime,
      },
      update: {
        response: params.response,
        isCorrect,
        isMarkedForReview: params.isMarkedForReview,
        eliminatedChoices: params.eliminatedChoices as unknown as Prisma.InputJsonValue,
        // The client sends the accumulated absolute value, not a delta.
        timeSpent: accumulatedTime,
      },
    });

    if (typeof params.currentQuestionIndex === "number") {
      await transitionAttempt(tx, {
        attemptId: params.attemptId,
        expectedStatus: "IN_PROGRESS",
        expectedModuleId: attempt.currentModuleId,
        data: { currentQuestionIndex: params.currentQuestionIndex },
      });
    }
    return "saved" as const;
  }, { timeout: 60_000 });

  if (outcome === "expired") {
    throw new AttemptMutationError("Time expired for this module", "TIME_EXPIRED");
  }
}

// ---------- Submit current module ----------

export interface SubmitModuleResult {
  status: "next_module" | "break" | "completed";
  /** When status=break: time remaining (seconds) of the break. */
  breakRemainingSeconds?: number;
}

type SubmitOutcome =
  | { kind: "expired" }
  | { kind: "result"; result: SubmitModuleResult };

export async function submitCurrentModule(
  attemptId: string,
  expectedModuleId: string,
): Promise<SubmitModuleResult> {
  let outcome: SubmitOutcome;
  try {
    outcome = await prisma.$transaction(async (tx): Promise<SubmitOutcome> => {
    await lockAttempt(tx, attemptId);
    const attempt = await tx.testAttempt.findUnique({
      where: { id: attemptId },
      include: { test: true },
    });
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.status === "COMPLETED") {
      return { kind: "result" as const, result: { status: "completed" as const } };
    }
    if (attempt.status === "EXPIRED") return { kind: "expired" as const };
    if (attempt.status !== "IN_PROGRESS") throw new Error("Attempt is not in progress");

    // A duplicate request for the module that just advanced is a successful
    // no-op. It must never score the newly current module.
    if (attempt.currentModuleId !== expectedModuleId) {
      if (attempt.breakStartedAt) {
        return {
          kind: "result" as const,
          result: { status: "break" as const, breakRemainingSeconds: BREAK_SECONDS },
        };
      }
      return {
        kind: "result" as const,
        result: { status: "next_module" as const },
      };
    }
    if (!attempt.currentModuleId || !attempt.moduleStartedAt) {
      throw new AttemptMutationError("The module has not started", "MODULE_NOT_STARTED");
    }
    const deadline = await deadlineForAttempt(tx, attempt);
    if (!deadline || isModuleDeadlineExpired(deadline)) {
      await expireAttemptInTransaction(tx, attempt, new Date());
      return { kind: "expired" as const };
    }

    const currentModule = await tx.module.findUnique({
      where: { id: attempt.currentModuleId },
      include: {
        section: true,
        moduleQuestions: {
          orderBy: { order: "asc" },
          select: { questionId: true },
        },
      },
    });
    if (!currentModule) throw new Error("Module not found");
    const questionIds = currentModule.moduleQuestions.map((mq) => mq.questionId);
    // Answer.isCorrect was computed from the immutable attempt snapshot.
    const correct = await tx.answer.count({
      where: { attemptId, questionId: { in: questionIds }, isCorrect: true },
    });

    const next = await pickNextModule(tx, {
      test: attempt.test,
      currentModule,
      correctCount: correct,
      totalCount: questionIds.length,
    });

    await tx.moduleResult.upsert({
      where: { attemptId_moduleId: { attemptId, moduleId: currentModule.id } },
      create: {
        attemptId,
        moduleId: currentModule.id,
        correctCount: correct,
        totalCount: questionIds.length,
        routedTo: next?.id ?? null,
      },
      update: {
        correctCount: correct,
        totalCount: questionIds.length,
        routedTo: next?.id ?? null,
      },
    });

    if (!next) {
      await transitionAttempt(tx, {
        attemptId,
        expectedStatus: "IN_PROGRESS",
        expectedModuleId,
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          currentModuleId: null,
          currentSectionId: null,
          moduleStartedAt: null,
          moduleDeadlineAt: null,
          breakStartedAt: null,
        },
      });
      return { kind: "result" as const, result: { status: "completed" as const } };
    }

    const crossesSection = next.sectionId !== currentModule.sectionId;
    if (crossesSection) {
      const now = new Date();
      await transitionAttempt(tx, {
        attemptId,
        expectedStatus: "IN_PROGRESS",
        expectedModuleId,
        data: {
          currentSectionId: next.sectionId,
          currentModuleId: next.id,
          currentQuestionIndex: 0,
          moduleStartedAt: null,
          moduleDeadlineAt: null,
          breakStartedAt: now,
        },
      });
      return {
        kind: "result" as const,
        result: { status: "break" as const, breakRemainingSeconds: BREAK_SECONDS },
      };
    }

    const startedAt = new Date();
    await transitionAttempt(tx, {
      attemptId,
      expectedStatus: "IN_PROGRESS",
      expectedModuleId,
      data: {
        currentSectionId: next.sectionId,
        currentModuleId: next.id,
        currentQuestionIndex: 0,
        moduleStartedAt: startedAt,
        moduleDeadlineAt: calculateModuleDeadline(startedAt, moduleTimeLimit(next)),
        breakStartedAt: null,
      },
    });
      return { kind: "result", result: { status: "next_module" } };
    }, { timeout: 60_000 });
  } catch (error) {
    if (!(error instanceof AttemptTransitionConflict)) throw error;
    // The losing concurrent transaction rolled back. Return the winner's
    // committed transition as the idempotent result for this module token.
    const latest = await prisma.testAttempt.findUnique({ where: { id: attemptId } });
    if (!latest) throw new Error("Attempt not found");
    if (latest.status === "COMPLETED") return { status: "completed" };
    if (latest.status === "EXPIRED") {
      throw new AttemptMutationError("This attempt has expired", "ATTEMPT_EXPIRED");
    }
    if (latest.currentModuleId !== expectedModuleId) {
      return latest.breakStartedAt
        ? { status: "break", breakRemainingSeconds: BREAK_SECONDS }
        : { status: "next_module" };
    }
    throw error;
  }

  if (outcome.kind === "expired") {
    throw new AttemptMutationError("This attempt has expired", "ATTEMPT_EXPIRED");
  }
  return outcome.result;
}

/**
 * Pick the next module in the test progression.
 *  - From Module 1 → Module 2 of the same section:
 *      LINEAR: the single Module 2.
 *      ADAPTIVE: routed by `adaptiveThreshold` (≥ → HARD, < → EASY).
 *  - From Module 2 → Module 1 of the next ordered section.
 *  - End of last section → null (test complete).
 */
async function pickNextModule(tx: Transaction, params: {
  test: Test;
  currentModule: Module & { section: Section };
  correctCount: number;
  totalCount: number;
}): Promise<(Module & { section: Section }) | null> {
  const { test, currentModule, correctCount, totalCount } = params;

  if (currentModule.moduleNumber === 1) {
    if (test.mode === "LINEAR") {
      return tx.module.findFirst({
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
    const routed = await tx.module.findFirst({
      where: { sectionId: currentModule.sectionId, moduleNumber: 2, difficulty: target },
      include: { section: true },
    });
    if (routed) return routed;
    // Fallback: any Module 2 in this section.
    return tx.module.findFirst({
      where: { sectionId: currentModule.sectionId, moduleNumber: 2 },
      include: { section: true },
    });
  }

  // Module 2 → next section's Module 1
  const nextSection = await tx.section.findFirst({
    where: { testId: test.id, order: { gt: currentModule.section.order } },
    orderBy: { order: "asc" },
  });
  if (!nextSection) return null;

  const m1 = await tx.module.findFirst({
    where: { sectionId: nextSection.id, moduleNumber: 1 },
    include: { section: true },
  });
  return m1;
}

// ---------- End break, start the next module ----------

export async function endBreakAndStartModule(attemptId: string) {
  const outcome = await prisma.$transaction(async (tx) => {
    await lockAttempt(tx, attemptId);
    const attempt = await tx.testAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.status === "EXPIRED") return "expired" as const;
    if (attempt.status !== "IN_PROGRESS") throw new Error("Attempt not in progress");
    if (attempt.moduleStartedAt) return "started" as const;
    if (!attempt.currentModuleId || !attempt.breakStartedAt) {
      throw new AttemptMutationError("The attempt is not on a break", "MODULE_NOT_STARTED");
    }
    const nextModule = await tx.module.findUnique({
      where: { id: attempt.currentModuleId },
      select: {
        moduleNumber: true,
        section: { select: { module1TimeLimit: true, module2TimeLimit: true } },
      },
    });
    if (!nextModule) throw new Error("Module not found");
    const now = new Date();
    const breakEndsAt = new Date(attempt.breakStartedAt.getTime() + BREAK_SECONDS * 1000);
    // Early manual resume is allowed. A late resume receives only the time that
    // remains from the scheduled end of the bounded break.
    const startedAt = now < breakEndsAt ? now : breakEndsAt;
    const deadline = calculateModuleDeadline(startedAt, moduleTimeLimit(nextModule));
    if (isModuleDeadlineExpired(deadline, now.getTime())) {
      await expireAttemptInTransaction(tx, attempt, now);
      return "expired" as const;
    }
    await transitionAttempt(tx, {
      attemptId,
      expectedStatus: "IN_PROGRESS",
      expectedModuleId: attempt.currentModuleId,
      data: {
        moduleStartedAt: startedAt,
        moduleDeadlineAt: deadline,
        breakStartedAt: null,
      },
    });
    return "started" as const;
  }, { timeout: 60_000 });

  if (outcome === "expired") {
    throw new AttemptMutationError("This attempt has expired", "ATTEMPT_EXPIRED");
  }
}

// ---------- Final completion ----------

export async function completeAttempt(attemptId: string) {
  const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new Error("Attempt not found");
  if (
    attempt.status !== "COMPLETED" ||
    attempt.currentModuleId !== null ||
    attempt.currentSectionId !== null
  ) {
    throw new Error("Only final-module submission can complete an attempt");
  }
}

/**
 * Reconcile every open attempt. Intended for the nightly Vercel cron.
 *
 * `expiredAttempts` is returned rather than just a count so the caller can record an
 * `attempt_abandoned` event per attempt (T2.3). The tracking lives in the cron
 * route, not here: this module is imported by the integration tests and by a
 * plain `tsx` script, neither of which has a request scope.
 */
export async function sweepStaleAttempts(now = new Date()) {
  const attempts = await prisma.testAttempt.findMany({
    where: { status: "IN_PROGRESS" },
    select: { id: true, userId: true, testId: true },
    orderBy: { startedAt: "asc" },
    take: 1_000,
  });
  const expiredAttempts: { id: string; userId: string | null; testId: string }[] = [];
  let expired = 0;
  let advanced = 0;
  for (const attempt of attempts) {
    const result = await reconcileAttemptLifecycle(attempt.id, now);
    if (result === "expired") {
      expired++;
      expiredAttempts.push(attempt);
    }
    if (result === "advanced") advanced++;
  }
  return { examined: attempts.length, expired, advanced, expiredAttempts };
}
