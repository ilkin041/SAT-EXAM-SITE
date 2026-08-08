/**
 * Seeds the three originally-authored questions behind the landing page's demo
 * (T3.3), and flags them `publicDemo`.
 *
 * Why a separate script rather than rows in `prisma/seed.ts`: open decision 4.
 * The main bank references "Official SAT Practice Test 4", so nothing in it may
 * be shown to a logged-out visitor. These three were written for this repo and
 * carry no third-party content — that is the entire reason they exist, and
 * keeping them in their own file is what makes the claim auditable. If you add
 * to this file, you are asserting the same thing about what you add.
 *
 * Idempotent: fixed ids, upserted. Re-run after editing the content here and
 * the live rows follow, `renderedHtml` included.
 *
 *   npm run db:seed-demo-questions
 *
 * Deliberately does *not* touch any other question's `publicDemo`. Turning the
 * demo off is a tutor action in the question form, not a side effect of a seed.
 *
 * Note on `$`: `renderRichToHtml` treats `$…$` as inline LaTeX, so a literal
 * currency sign in a stem would silently open a math span. These questions use
 * no currency for that reason.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { questionContentHash } from "../src/lib/question-content-hash";
import { renderQuestionHtml } from "../src/lib/rendered-question";

const prisma = new PrismaClient();

interface DemoSeed {
  id: string;
  sectionType: "READING_WRITING" | "MATH";
  domainId: string;
  skillId: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  passage: string | null;
  stem: string;
  choices: { label: "A" | "B" | "C" | "D"; text: string }[];
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
}

const SEEDS: DemoSeed[] = [
  {
    id: "demo-rw-words-in-context",
    sectionType: "READING_WRITING",
    domainId: "craft-structure",
    skillId: "craft-words",
    difficulty: "MEDIUM",
    passage:
      "<p>Mycorrhizal fungi thread through soil in filaments so fine that a single " +
      "teaspoon of forest floor can hold several kilometres of them. Early accounts " +
      "described these networks as plumbing: water and phosphorus travel one way, " +
      "sugar travels the other, and the fungus is the pipe. Field measurements have " +
      "complicated that account. When a seedling is shaded and short of carbon, the " +
      "fungus linking it to a larger tree does not always pass along what it " +
      "receives, and what it does pass along it appears to price. The fungus, on this " +
      "reading, is less a pipe than a <em>broker</em>.</p>",
    stem: "<p>As used in the text, what does the word <em>broker</em> most nearly mean?</p>",
    choices: [
      { label: "A", text: "An intermediary that trades on its own account" },
      { label: "B", text: "A messenger that relays a signal without altering it" },
      { label: "C", text: "An owner that controls the entire supply of a resource" },
      { label: "D", text: "A reservoir that holds a resource until it is needed" },
    ],
    correctAnswer: "A",
    explanation:
      "<p>The sentence sets <em>broker</em> against <em>pipe</em>, so the word has to " +
      "mean something a passive conduit is not. The two clauses before it say what " +
      "that is: the fungus &ldquo;does not always pass along what it receives,&rdquo; " +
      "and it &ldquo;appears to price&rdquo; what it does pass along. That is an " +
      "intermediary acting in its own interest — choice A.</p>" +
      "<p>B is the pipe the text is arguing against. C overstates it: the fungus " +
      "sets terms, but the text never says it controls the supply. D describes " +
      "storage, and nothing in the passage says the fungus holds carbon back for " +
      "later rather than trading it.</p>",
  },
  {
    id: "demo-math-linear-equation",
    sectionType: "MATH",
    domainId: "algebra",
    skillId: "algebra-linear-equations-one-variable",
    difficulty: "EASY",
    passage: null,
    stem: "<p>$3(x - 4) + 5 = 2x + 7$</p><p>What value of $x$ satisfies the equation above?</p>",
    choices: [
      { label: "A", text: "$2$" },
      { label: "B", text: "$6$" },
      { label: "C", text: "$14$" },
      { label: "D", text: "$26$" },
    ],
    correctAnswer: "C",
    explanation:
      "<p>Distribute on the left: $3x - 12 + 5 = 2x + 7$, so $3x - 7 = 2x + 7$.</p>" +
      "<p>Subtract $2x$ from both sides to get $x - 7 = 7$, then add $7$: $x = 14$.</p>" +
      "<p>Check it in the original equation: $3(14 - 4) + 5 = 35$ and $2(14) + 7 = 35$.</p>",
  },
  {
    id: "demo-math-rate",
    sectionType: "MATH",
    domainId: "problem-solving-data-analysis",
    skillId: "psda-ratios-rates-units",
    difficulty: "MEDIUM",
    passage: null,
    stem:
      "<p>A cyclist rides $24$ kilometres in $90$ minutes. At this rate, how many " +
      "kilometres does she ride in $2$ hours?</p>",
    choices: [
      { label: "A", text: "$30$" },
      { label: "B", text: "$32$" },
      { label: "C", text: "$36$" },
      { label: "D", text: "$48$" },
    ],
    correctAnswer: "B",
    explanation:
      "<p>Put both times in the same unit first. $90$ minutes is $1.5$ hours, so the " +
      "rate is $24 \\div 1.5 = 16$ kilometres per hour.</p>" +
      "<p>In $2$ hours she rides $16 \\times 2 = 32$ kilometres.</p>" +
      "<p>Choice D, $48$, is what you get by treating $90$ minutes as one hour and " +
      "doubling — the mistake this question is built to catch.</p>",
  },
];

async function main() {
  // The taxonomy tables are the source of truth (T2.2). If they have not been
  // seeded, fail with the command that fixes it rather than an FK error.
  for (const seed of SEEDS) {
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
  }

  for (const seed of SEEDS) {
    const shared = {
      sectionType: seed.sectionType,
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
      // Same rule as every other write path: populate `renderedHtml` here or
      // the route silently goes back to rendering KaTeX per request.
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
    console.log(`  ✓ ${seed.id}`);
  }

  const flagged = await prisma.question.count({ where: { publicDemo: true } });
  console.log(`\n${SEEDS.length} demo question(s) seeded. ${flagged} flagged publicDemo in total.`);
  if (flagged > SEEDS.length) {
    console.log(
      "Note: more than three questions carry publicDemo. The landing demo shows the " +
        "three oldest by createdAt — check /admin/questions if that is not what you want.",
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
