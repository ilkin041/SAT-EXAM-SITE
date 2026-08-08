/**
 * Seeds everything `npm run gen:screenshots` photographs (T3.5).
 *
 *   npm run db:seed-screenshot-fixture
 *   npm run gen:screenshots
 *
 * The landing page's screenshot tabs are *real screens*, which means a real
 * account has to be sitting in a real attempt when Chrome takes the picture. It
 * also means the pixels end up on the most-crawled page in the app, so open
 * decision 4 applies with full force: **no question that appears in a
 * screenshot may be third-party content.** The bank references "Official SAT
 * Practice Test 4", so the three questions authored here — like the three in
 * `seed-demo-questions.ts` — were written for this repo, carry no third-party
 * text, and are flagged `publicDemo`, which is the auditable record of exactly
 * that claim. If you add to `SCREEN_QUESTIONS`, you are asserting the same
 * thing about what you add.
 *
 * That constraint is also why the fixture module holds four questions rather
 * than the real exam's 27: four is how many originally-authored Reading and
 * Writing questions exist. The interface shot is therefore a short practice
 * module, which the product genuinely supports (`getScoreFidelity` has handled
 * section-only attempts since before T2.2), and no callout on the landing page
 * claims otherwise. Author more R&W questions here and the number grows.
 *
 * What it creates, all with fixed ids so re-running is idempotent:
 *
 *   - `Jordan Avery <jordan.avery@example.com>` (STUDENT) and a Group that
 *     grants the fixture test — the test is `isPublic: false`, so without the
 *     group `canAccessTest` refuses and the interface renders nothing.
 *   - A two-section fixture test whose sections hold **one** module each. A
 *     Section's `module1TimeLimit` / `module2TimeLimit` are columns, not rows;
 *     nothing requires a Module 2 to exist, and one that existed with no
 *     questions would be a broken module the screenshots could walk into.
 *   - An IN_PROGRESS attempt parked on the passage question, carrying the two
 *     things the interface shot has to show: an `Annotation` (the highlight —
 *     `AnnotatedPassage` fetches these on mount, so a seeded row renders) and
 *     an `Answer` whose `eliminatedChoices` strikes a choice through.
 *   - A COMPLETED attempt over the same six questions for the review shot,
 *     with question 1 answered wrong so the shot shows the explanation doing
 *     its job.
 *   - A COMPLETED attempt on the oldest full-length test in the bank for the
 *     score-report shot. That page renders scores, domains and difficulty —
 *     never a stem — so it is the one shot that can stand on licensed
 *     questions. It is skipped, loudly, if no full-length test exists.
 *
 * The IN_PROGRESS attempt's `moduleDeadlineAt` is set 24 minutes out, so the
 * timer in the screenshot reads a real remaining time. Capture soon after
 * seeding: once that deadline passes, `reconcileAttemptLifecycle` expires the
 * attempt and the interface redirects instead of rendering.
 *
 * Note on `$`: `renderRichToHtml` treats `$…$` as inline LaTeX, so a literal
 * currency sign would silently open a math span. Same rule as the demo seed.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { questionContentHash } from "../src/lib/question-content-hash";
import { renderQuestionHtml } from "../src/lib/rendered-question";

const prisma = new PrismaClient();

// ---------- Fixed ids ----------

const USER_ID = "screens-student";
const USER_EMAIL = "jordan.avery@example.com";
const USER_PASSWORD = "screenshots123";
const GROUP_ID = "screens-group";
const TEST_ID = "screens-test";
const RW_SECTION_ID = "screens-section-rw";
const RW_MODULE_ID = "screens-module-rw";
const MATH_SECTION_ID = "screens-section-math";
const MATH_MODULE_ID = "screens-module-math";
const LIVE_ATTEMPT_ID = "screens-attempt-live";
const REVIEW_ATTEMPT_ID = "screens-attempt-review";
const REPORT_ATTEMPT_ID = "screens-attempt-report";

/** Authored in `seed-demo-questions.ts`; reused here rather than duplicated. */
const DEMO_RW_QUESTION_ID = "demo-rw-words-in-context";
const DEMO_MATH_QUESTION_IDS = ["demo-math-rate"];

/**
 * The question the tutor shot opens in the editor. Deliberately **not** in the
 * fixture test: the editor warns, correctly and in a large amber banner, when a
 * student is mid-attempt on a test containing the question, and the in-progress
 * attempt this same script creates would trip it on every capture.
 */
const EDITOR_QUESTION_ID = "demo-math-linear-equation";

/**
 * The phrase the seeded highlight covers. Looked up in the passage's plain text
 * rather than hardcoded as offsets: `AnnotatedPassage` measures offsets by
 * concatenating text nodes, so stripping tags from the same HTML gives the same
 * numbers, and editing the passage above can no longer silently move the
 * highlight onto the wrong words.
 */
const HIGHLIGHT_PHRASE = "does not always pass along what it receives";

// ---------- Authored questions ----------

interface ScreenQuestion {
  id: string;
  domainId: string;
  skillId: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  passage: string;
  stem: string;
  choices: { label: "A" | "B" | "C" | "D"; text: string }[];
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
}

const SCREEN_QUESTIONS: ScreenQuestion[] = [
  {
    id: "screens-rw-central-idea",
    domainId: "info-ideas",
    skillId: "info-ideas-central",
    difficulty: "MEDIUM",
    passage:
      "<p>Cold-water corals build reefs at depths no sunlight reaches, which rules " +
      "out the algal partners that feed their tropical relatives. For decades this " +
      "was treated as a puzzle about thrift: how does a reef grow where nothing " +
      "photosynthesizes? Moorings placed on the Norwegian shelf suggest the question " +
      "was aimed at the wrong quantity. Those reefs sit directly in the path of " +
      "internal waves that break against the slope twice a day, and each break " +
      "delivers a pulse of sinking plankton. The corals are not eking out a scarce " +
      "supply of food. They are parked at a conveyor belt.</p>",
    stem: "<p>Which choice best states the main idea of the text?</p>",
    choices: [
      {
        label: "A",
        text: "Cold-water corals grow more slowly than tropical corals because they have no algal partners.",
      },
      {
        label: "B",
        text: "Measurements suggest cold-water reefs succeed because of where they sit, not because they use food sparingly.",
      },
      {
        label: "C",
        text: "Internal waves are the main reason cold-water and tropical reefs look different from each other.",
      },
      {
        label: "D",
        text: "Researchers have established that sunlight is unnecessary for any reef-building coral.",
      },
    ],
    correctAnswer: "B",
    explanation:
      "<p>The text sets up an old explanation and replaces it. The old one is thrift " +
      "— a reef surviving on very little. The new one is the last two sentences: the " +
      "corals sit where breaking internal waves deliver plankton twice a day, so they " +
      "are &ldquo;parked at a conveyor belt.&rdquo; That is choice B: position, not " +
      "frugality.</p>" +
      "<p>A states a comparison the text never makes — nothing here is about growth " +
      "rate. C takes a detail from the new explanation and promotes it to a claim " +
      "about appearance, which the text does not discuss. D overreaches: the passage " +
      "is about one group of corals at depth, not about every reef-building coral.</p>",
  },
  {
    id: "screens-rw-transitions",
    domainId: "expression-ideas",
    skillId: "expression-transitions",
    difficulty: "EASY",
    passage:
      "<p>The botanist Ynés Mexía collected her first plant specimen at fifty-one, an " +
      "age by which most of her contemporaries had finished their fieldwork. Over the " +
      "next thirteen years she gathered roughly 150,000 specimens across Mexico and " +
      "South America, among them dozens of species new to science. ______ her late " +
      "start, she ranks among the most productive collectors in the history of North " +
      "American botany.</p>",
    stem: "<p>Which choice completes the text with the most logical transition?</p>",
    choices: [
      { label: "A", text: "In addition to" },
      { label: "B", text: "Because of" },
      { label: "C", text: "Despite" },
      { label: "D", text: "As with" },
    ],
    correctAnswer: "C",
    explanation:
      "<p>The two ideas pull against each other: starting at fifty-one should have " +
      "left her less time, and instead she out-collected almost everyone. A transition " +
      "that marks a concession is what the sentence needs, so <em>Despite</em> — " +
      "choice C.</p>" +
      "<p>A adds the late start to the achievement rather than setting it against it. " +
      "B makes the late start the cause of her output, which reverses the logic. D " +
      "signals a comparison to something similar, and no comparison case is on the " +
      "page.</p>",
  },
  {
    id: "screens-rw-inferences",
    domainId: "info-ideas",
    skillId: "info-ideas-inferences",
    difficulty: "HARD",
    passage:
      "<p>When a honeybee colony outgrows its hive, half the workers leave with the " +
      "old queen and cluster on a branch while scouts go looking for a cavity. A " +
      "scout who finds a promising site comes back and dances for it, and the better " +
      "the site, the longer she dances. A scout who is recruited to another bee&rsquo;s " +
      "site stops advertising her own. No tally is ever taken. The swarm&rsquo;s choice, " +
      "then, is not the site the most scouts favoured at the outset but rather ______</p>",
    stem: "<p>Which choice most logically completes the text?</p>",
    choices: [
      { label: "A", text: "the site whose advocates are the last ones still dancing." },
      { label: "B", text: "the cavity that the old queen inspects first." },
      { label: "C", text: "the site closest to the branch the swarm has clustered on." },
      { label: "D", text: "whichever site the first scout to return described." },
    ],
    correctAnswer: "A",
    explanation:
      "<p>Two rules in the text do the work. Dance length tracks site quality, and a " +
      "recruited scout stops advertising her own find. Together they mean advertising " +
      "for the weaker sites drains away while advertising for the best one does not — " +
      "so the site left with dancers is the one the swarm takes. Choice A.</p>" +
      "<p>B and C name factors the text never mentions: the queen inspects nothing " +
      "here, and distance is not a criterion. D contradicts the mechanism outright — " +
      "if order of return decided it, dance length would be irrelevant.</p>",
  },
];

// ---------- Helpers ----------

/** Text-node text of a rendered HTML string, which is what offsets count. */
function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

async function upsertQuestion(seed: ScreenQuestion) {
  const domain = await prisma.domain.findUnique({ where: { id: seed.domainId } });
  const skill = await prisma.skill.findUnique({ where: { id: seed.skillId } });
  if (!domain || !skill) {
    throw new Error(
      `Taxonomy row missing for ${seed.id} (domain ${seed.domainId}, skill ${seed.skillId}). ` +
        "Run `npm run db:seed-taxonomy` first.",
    );
  }
  if (skill.domainId !== domain.id) {
    throw new Error(`Skill ${seed.skillId} does not belong to domain ${seed.domainId}.`);
  }

  const shared = {
    sectionType: "READING_WRITING" as const,
    type: "MULTIPLE_CHOICE" as const,
    domainId: seed.domainId,
    skillId: seed.skillId,
    difficulty: seed.difficulty,
    passage: seed.passage,
    stem: seed.stem,
    choices: seed.choices,
    correctAnswer: seed.correctAnswer,
    explanation: seed.explanation,
    publicDemo: true,
    contentHash: questionContentHash({ stem: seed.stem, passage: seed.passage }),
    // Same rule as every other write path (T2.1): populate `renderedHtml` here
    // or the route silently goes back to rendering KaTeX per request.
    renderedHtml: renderQuestionHtml({
      stem: seed.stem,
      passage: seed.passage,
      explanation: seed.explanation,
      choices: seed.choices,
    }) as unknown as Prisma.InputJsonValue,
  };

  await prisma.question.upsert({
    where: { id: seed.id },
    create: { id: seed.id, ...shared },
    update: shared,
  });
}

/**
 * The landing demo shows the three oldest `publicDemo` questions
 * (`DEMO_QUESTION_COUNT`, ordered by `createdAt`). These four are newer, so it
 * keeps showing the three it always showed — but only if the demo seed ran
 * first. Check rather than assume: on a fresh database, seeding in the wrong
 * order would quietly swap one of the landing page's three questions.
 */
async function assertDemoQuestionsAreOlder() {
  const oldest = await prisma.question.findMany({
    where: { publicDemo: true, type: "MULTIPLE_CHOICE" },
    orderBy: { createdAt: "asc" },
    take: 3,
    select: { id: true },
  });
  const ours = new Set([...SCREEN_QUESTIONS.map((q) => q.id)]);
  const intruder = oldest.find((q) => ours.has(q.id));
  if (oldest.length < 3 || intruder) {
    throw new Error(
      "The three oldest publicDemo questions are not the landing demo's three" +
        (intruder ? ` (${intruder.id} is among them)` : "") +
        ". Run `npm run db:seed-demo-questions` before this script.",
    );
  }
}

async function upsertFixtureTest(adminId: string | null) {
  await prisma.test.upsert({
    where: { id: TEST_ID },
    create: {
      id: TEST_ID,
      title: "Practice Set 1",
      description: "Screenshot fixture — not published to students.",
      mode: "LINEAR",
      isPublic: false,
      createdById: adminId,
    },
    update: { title: "Practice Set 1", mode: "LINEAR", isPublic: false },
  });

  const sections = [
    {
      id: RW_SECTION_ID,
      type: "READING_WRITING" as const,
      order: 1,
      moduleId: RW_MODULE_ID,
      // 32 minutes, the real Digital SAT R&W module allotment.
      timeLimit: 1920,
      questionIds: [
        "screens-rw-central-idea",
        DEMO_RW_QUESTION_ID,
        "screens-rw-transitions",
        "screens-rw-inferences",
      ],
    },
    {
      id: MATH_SECTION_ID,
      type: "MATH" as const,
      order: 2,
      moduleId: MATH_MODULE_ID,
      // 35 minutes.
      timeLimit: 2100,
      questionIds: DEMO_MATH_QUESTION_IDS,
    },
  ];

  for (const section of sections) {
    await prisma.section.upsert({
      where: { id: section.id },
      create: {
        id: section.id,
        testId: TEST_ID,
        type: section.type,
        order: section.order,
        module1TimeLimit: section.timeLimit,
        module2TimeLimit: section.timeLimit,
      },
      update: { order: section.order, module1TimeLimit: section.timeLimit },
    });
    await prisma.module.upsert({
      where: { id: section.moduleId },
      create: {
        id: section.moduleId,
        sectionId: section.id,
        moduleNumber: 1,
        difficulty: "MIXED",
      },
      update: { moduleNumber: 1, difficulty: "MIXED" },
    });

    for (const [index, questionId] of section.questionIds.entries()) {
      const exists = await prisma.question.findUnique({ where: { id: questionId } });
      if (!exists) {
        throw new Error(
          `Question ${questionId} is missing. Run \`npm run db:seed-demo-questions\` first.`,
        );
      }
      await prisma.moduleQuestion.upsert({
        where: { moduleId_questionId: { moduleId: section.moduleId, questionId } },
        create: { moduleId: section.moduleId, questionId, order: index + 1 },
        update: { order: index + 1 },
      });
    }

    // Upsert adds but never removes. Without this, dropping a question from the
    // list above would leave it in the module and in every shot of it.
    await prisma.moduleQuestion.deleteMany({
      where: { moduleId: section.moduleId, questionId: { notIn: section.questionIds } },
    });
  }

  return sections;
}

interface AnswerSeed {
  questionId: string;
  response: string;
  isCorrect: boolean;
  timeSpent: number;
  eliminatedChoices?: ("A" | "B" | "C" | "D")[];
  isMarkedForReview?: boolean;
}

async function writeAnswers(attemptId: string, answers: AnswerSeed[]) {
  for (const a of answers) {
    const data = {
      response: a.response,
      isCorrect: a.isCorrect,
      isMarkedForReview: a.isMarkedForReview ?? false,
      timeSpent: a.timeSpent,
      eliminatedChoices: (a.eliminatedChoices ?? []) as unknown as Prisma.InputJsonValue,
    };
    await prisma.answer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: a.questionId } },
      create: { attemptId, questionId: a.questionId, ...data },
      update: data,
    });
  }
}

/** Grading data, captured the way the engine captures it at serve time. */
async function writeSnapshots(attemptId: string, moduleId: string, questionIds: string[]) {
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, type: true, correctAnswer: true, acceptedAnswers: true },
  });
  await prisma.attemptQuestionSnapshot.createMany({
    data: questions.map((q) => ({
      attemptId,
      moduleId,
      questionId: q.id,
      questionType: q.type,
      correctAnswer: q.correctAnswer,
      acceptedAnswers:
        q.acceptedAnswers === null
          ? Prisma.DbNull
          : (q.acceptedAnswers as Prisma.InputJsonValue),
    })),
    skipDuplicates: true,
  });
}

async function seedLiveAttempt() {
  const shared = {
    userId: USER_ID,
    testId: TEST_ID,
    currentSectionId: RW_SECTION_ID,
    currentModuleId: RW_MODULE_ID,
    // The passage question is second in the module — the highlight and the
    // struck-through choice both belong to it.
    currentQuestionIndex: 1,
    status: "IN_PROGRESS" as const,
    startedAt: minutesAgo(8),
    moduleStartedAt: minutesAgo(8),
    moduleDeadlineAt: minutesFromNow(24),
    breakStartedAt: null,
    completedAt: null,
  };
  await prisma.testAttempt.upsert({
    where: { id: LIVE_ATTEMPT_ID },
    create: { id: LIVE_ATTEMPT_ID, ...shared },
    update: shared,
  });

  await writeAnswers(LIVE_ATTEMPT_ID, [
    { questionId: "screens-rw-central-idea", response: "B", isCorrect: true, timeSpent: 96 },
    {
      questionId: DEMO_RW_QUESTION_ID,
      response: "A",
      isCorrect: true,
      timeSpent: 41,
      // The eliminator, which is the point of this shot: D is struck through
      // whether or not the ABC toggle is on, and the capture script turns the
      // toggle on so the circles are visible too.
      eliminatedChoices: ["D"],
    },
  ]);
  await writeSnapshots(LIVE_ATTEMPT_ID, RW_MODULE_ID, [
    "screens-rw-central-idea",
    DEMO_RW_QUESTION_ID,
    "screens-rw-transitions",
    "screens-rw-inferences",
  ]);

  const passage = await prisma.question.findUnique({
    where: { id: DEMO_RW_QUESTION_ID },
    select: { renderedHtml: true, passage: true },
  });
  const renderedPassage =
    (passage?.renderedHtml as { passage?: string } | null)?.passage ?? passage?.passage ?? "";
  const text = plainText(renderedPassage);
  const start = text.indexOf(HIGHLIGHT_PHRASE);
  if (start < 0) {
    throw new Error(
      `Highlight phrase not found in ${DEMO_RW_QUESTION_ID}'s passage. ` +
        "Update HIGHLIGHT_PHRASE in this script to a phrase the passage contains.",
    );
  }
  const annotation = {
    attemptId: LIVE_ATTEMPT_ID,
    questionId: DEMO_RW_QUESTION_ID,
    startOffset: start,
    endOffset: start + HIGHLIGHT_PHRASE.length,
    text: HIGHLIGHT_PHRASE,
    color: "YELLOW" as const,
    note: null,
  };
  const existing = await prisma.annotation.findFirst({
    where: { attemptId: LIVE_ATTEMPT_ID, questionId: DEMO_RW_QUESTION_ID },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const kept = existing
    ? await prisma.annotation.update({ where: { id: existing.id }, data: annotation })
    : await prisma.annotation.create({ data: annotation });
  // Exactly one highlight, however many times someone has clicked around in
  // the fixture attempt since the last run. A stray second one would be in the
  // next screenshot.
  await prisma.annotation.deleteMany({
    where: { attemptId: LIVE_ATTEMPT_ID, NOT: { id: kept.id } },
  });
}

async function seedReviewAttempt() {
  const shared = {
    userId: USER_ID,
    testId: TEST_ID,
    status: "COMPLETED" as const,
    startedAt: minutesAgo(180),
    completedAt: minutesAgo(140),
    currentSectionId: null,
    currentModuleId: null,
    moduleStartedAt: null,
    moduleDeadlineAt: null,
    breakStartedAt: null,
  };
  await prisma.testAttempt.upsert({
    where: { id: REVIEW_ATTEMPT_ID },
    create: { id: REVIEW_ATTEMPT_ID, ...shared },
    update: shared,
  });

  // Question 1 is wrong on purpose: the review shot opens on it, so the picture
  // shows the mechanism — your answer, the right answer, and why.
  await writeAnswers(REVIEW_ATTEMPT_ID, [
    { questionId: "screens-rw-central-idea", response: "D", isCorrect: false, timeSpent: 74 },
    { questionId: DEMO_RW_QUESTION_ID, response: "A", isCorrect: true, timeSpent: 62 },
    { questionId: "screens-rw-transitions", response: "C", isCorrect: true, timeSpent: 29 },
    {
      questionId: "screens-rw-inferences",
      response: "D",
      isCorrect: false,
      timeSpent: 118,
      isMarkedForReview: true,
    },
    { questionId: "demo-math-rate", response: "B", isCorrect: true, timeSpent: 83 },
  ]);
  await writeSnapshots(REVIEW_ATTEMPT_ID, RW_MODULE_ID, [
    "screens-rw-central-idea",
    DEMO_RW_QUESTION_ID,
    "screens-rw-transitions",
    "screens-rw-inferences",
  ]);
  await writeSnapshots(REVIEW_ATTEMPT_ID, MATH_MODULE_ID, DEMO_MATH_QUESTION_IDS);

  for (const [moduleId, correct, total] of [
    [RW_MODULE_ID, 2, 4],
    [MATH_MODULE_ID, 1, 1],
  ] as const) {
    await prisma.moduleResult.upsert({
      where: { attemptId_moduleId: { attemptId: REVIEW_ATTEMPT_ID, moduleId } },
      create: { attemptId: REVIEW_ATTEMPT_ID, moduleId, correctCount: correct, totalCount: total },
      update: { correctCount: correct, totalCount: total },
    });
  }
}

/**
 * The score report is the one shot with no question text on it, so it can — and
 * has to — stand on a genuine full-length test: two sections, two modules each,
 * enough questions for the 200–800 conversion to mean anything.
 *
 * Correctness is assigned by a fixed pattern rather than at random, so the
 * report is the same every time it is photographed and the domain bars do not
 * shuffle between captures.
 */
async function seedReportAttempt() {
  const candidates = await prisma.test.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      sections: {
        orderBy: { order: "asc" },
        select: {
          type: true,
          modules: {
            orderBy: { moduleNumber: "asc" },
            select: {
              id: true,
              moduleQuestions: { orderBy: { order: "asc" }, select: { questionId: true } },
            },
          },
        },
      },
    },
  });

  const fullLength = candidates.find((t) => {
    if (t.id === TEST_ID) return false;
    const types = new Set(t.sections.map((s) => s.type));
    if (!types.has("READING_WRITING") || !types.has("MATH")) return false;
    return t.sections.every(
      (s) =>
        s.modules.length >= 2 &&
        s.modules.every((m) => m.moduleQuestions.length > 0),
    );
  });

  if (!fullLength) {
    console.log(
      "  ! No full-length test found (two sections, two populated modules each).\n" +
        "    Skipping the score-report attempt — `gen:screenshots` will tell you the same thing.",
    );
    return;
  }

  const shared = {
    userId: USER_ID,
    testId: fullLength.id,
    status: "COMPLETED" as const,
    startedAt: minutesAgo(600),
    completedAt: minutesAgo(430),
    currentSectionId: null,
    currentModuleId: null,
    moduleStartedAt: null,
    moduleDeadlineAt: null,
    breakStartedAt: null,
  };
  await prisma.testAttempt.upsert({
    where: { id: REPORT_ATTEMPT_ID },
    create: { id: REPORT_ATTEMPT_ID, ...shared },
    update: shared,
  });

  // Wipe first: the pattern below is positional, so a stale answer from an
  // earlier fixture test would survive as an orphan and skew the domain bars.
  await prisma.answer.deleteMany({ where: { attemptId: REPORT_ATTEMPT_ID } });
  await prisma.moduleResult.deleteMany({ where: { attemptId: REPORT_ATTEMPT_ID } });

  // Reading and Writing runs a little ahead of Math, and Module 2 a little
  // ahead of Module 1 — the shape of a student who warmed up.
  const missEvery: Record<string, number> = { READING_WRITING: 5, MATH: 4 };

  for (const section of fullLength.sections) {
    for (const [moduleIndex, mod] of section.modules.entries()) {
      const questionIds = mod.moduleQuestions.map((mq) => mq.questionId);
      if (questionIds.length === 0) continue;
      const stride = missEvery[section.type] + moduleIndex;
      let correctCount = 0;

      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true, correctAnswer: true, type: true, choices: true },
      });
      const byId = new Map(questions.map((q) => [q.id, q]));

      for (const [i, questionId] of questionIds.entries()) {
        const q = byId.get(questionId);
        if (!q) continue;
        const isCorrect = i % stride !== 0;
        if (isCorrect) correctCount += 1;
        await writeAnswers(REPORT_ATTEMPT_ID, [
          {
            questionId,
            response: isCorrect ? q.correctAnswer : wrongResponse(q),
            isCorrect,
            // 40–115s, deterministic, so the time card reads plausibly.
            timeSpent: 40 + ((i * 17) % 76),
          },
        ]);
      }

      await prisma.moduleResult.upsert({
        where: { attemptId_moduleId: { attemptId: REPORT_ATTEMPT_ID, moduleId: mod.id } },
        create: {
          attemptId: REPORT_ATTEMPT_ID,
          moduleId: mod.id,
          correctCount,
          totalCount: questionIds.length,
        },
        update: { correctCount, totalCount: questionIds.length },
      });
      await writeSnapshots(REPORT_ATTEMPT_ID, mod.id, questionIds);
    }
  }

  return fullLength.id;
}

/** Any answer that is not the key — a label for MC, a bare number for SPR. */
function wrongResponse(q: {
  correctAnswer: string;
  type: string;
  choices: Prisma.JsonValue;
}): string {
  if (q.type === "MULTIPLE_CHOICE") {
    const labels = Array.isArray(q.choices)
      ? (q.choices as { label?: string }[]).map((c) => c?.label).filter(Boolean)
      : ["A", "B", "C", "D"];
    return (labels as string[]).find((l) => l !== q.correctAnswer) ?? "A";
  }
  return q.correctAnswer === "0" ? "1" : "0";
}

// ---------- Main ----------

async function main() {
  for (const seed of SCREEN_QUESTIONS) {
    await upsertQuestion(seed);
    console.log(`  ✓ question ${seed.id}`);
  }
  await assertDemoQuestionsAreOlder();

  const hashed = await bcrypt.hash(USER_PASSWORD, 10);
  await prisma.user.upsert({
    where: { id: USER_ID },
    create: {
      id: USER_ID,
      email: USER_EMAIL,
      name: "Jordan Avery",
      role: "STUDENT",
      password: hashed,
    },
    update: { email: USER_EMAIL, name: "Jordan Avery", role: "STUDENT", password: hashed },
  });
  console.log(`  ✓ student ${USER_EMAIL} / ${USER_PASSWORD}`);

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  await upsertFixtureTest(admin?.id ?? null);
  console.log("  ✓ fixture test Practice Set 1");

  const editorInFixture = await prisma.moduleQuestion.count({
    where: { questionId: EDITOR_QUESTION_ID, module: { section: { testId: TEST_ID } } },
  });
  if (editorInFixture > 0) {
    throw new Error(
      `${EDITOR_QUESTION_ID} is in the fixture test, so the editor shot would carry ` +
        "the in-flight-attempt warning. Take it out of the module lists above.",
    );
  }

  // The fixture test is not public, so access comes from a group. Without it
  // `canAccessTest` refuses and the interface renders nothing at all.
  await prisma.group.upsert({
    where: { id: GROUP_ID },
    create: {
      id: GROUP_ID,
      name: "Screenshot fixture",
      description: "Grants the screenshot student access to the fixture test.",
      users: { connect: { id: USER_ID } },
      tests: { connect: { id: TEST_ID } },
    },
    update: {
      users: { connect: { id: USER_ID } },
      tests: { connect: { id: TEST_ID } },
    },
  });

  await seedLiveAttempt();
  console.log(`  ✓ in-progress attempt ${LIVE_ATTEMPT_ID} (highlight + eliminated choice)`);
  await seedReviewAttempt();
  console.log(`  ✓ completed attempt ${REVIEW_ATTEMPT_ID} (answer review)`);
  const reportTestId = await seedReportAttempt();
  if (reportTestId) {
    console.log(`  ✓ completed full-length attempt ${REPORT_ATTEMPT_ID} on ${reportTestId}`);
  }

  console.log(
    "\nFixture ready. The in-progress module expires in 24 minutes — run " +
      "`npm run gen:screenshots` now.",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
