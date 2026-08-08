/**
 * Populate `Question.renderedHtml` for every question in the bank.
 *
 *   npm run db:backfill-question-html            # only rows that need it
 *   npm run db:backfill-question-html -- --all   # re-render everything
 *   npm run db:backfill-question-html -- --dry-run
 *
 * Idempotent: a row already carrying the current renderer version is skipped
 * unless `--all` is passed. Rows whose stored HTML has an older `v` are
 * re-rendered, which is how a renderer change rolls out.
 *
 * A question that produces a KaTeX error marker is reported by id rather than
 * silently written — `safeKatex` never throws, so a bad expression would
 * otherwise land in the bank looking fine.
 */
import { PrismaClient } from "@prisma/client";
import {
  RENDER_VERSION,
  renderQuestionHtml,
  type RenderedQuestionHtml,
} from "../src/lib/rendered-question";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const force = args.includes("--all");
const dryRun = args.includes("--dry-run");

/** `safeKatex` emits this instead of throwing when an expression is invalid. */
const MATH_ERROR = "[math error:";

function needsRender(stored: unknown): boolean {
  if (force) return true;
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return true;
  return (stored as Partial<RenderedQuestionHtml>).v !== RENDER_VERSION;
}

function errorFields(rendered: RenderedQuestionHtml): string[] {
  const bad: string[] = [];
  if (rendered.stem.includes(MATH_ERROR)) bad.push("stem");
  if (rendered.passage?.includes(MATH_ERROR)) bad.push("passage");
  if (rendered.explanation?.includes(MATH_ERROR)) bad.push("explanation");
  for (const c of rendered.choices ?? []) {
    if (c.html.includes(MATH_ERROR)) bad.push(`choice ${c.label}`);
  }
  return bad;
}

async function main() {
  const questions = await prisma.question.findMany({
    select: {
      id: true,
      stem: true,
      passage: true,
      explanation: true,
      choices: true,
      renderedHtml: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(
    `${questions.length} questions in the bank · renderer v${RENDER_VERSION}${force ? " · --all" : ""}${dryRun ? " · dry run" : ""}`,
  );

  let written = 0;
  let skipped = 0;
  const failures: { id: string; fields: string[] }[] = [];

  for (const q of questions) {
    if (!needsRender(q.renderedHtml)) {
      skipped++;
      continue;
    }
    const rendered = renderQuestionHtml(q);
    const bad = errorFields(rendered);
    if (bad.length > 0) failures.push({ id: q.id, fields: bad });

    if (!dryRun) {
      await prisma.question.update({
        where: { id: q.id },
        data: { renderedHtml: rendered as unknown as object },
      });
    }
    written++;
  }

  console.log(`${dryRun ? "Would write" : "Wrote"} ${written} · skipped ${skipped}`);

  if (failures.length === 0) {
    console.log("All questions rendered without a KaTeX error.");
  } else {
    console.log(`\n${failures.length} question(s) produced a math error:`);
    for (const f of failures) console.log(`  ${f.id} — ${f.fields.join(", ")}`);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
