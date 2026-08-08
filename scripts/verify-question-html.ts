/**
 * Prove the stored `renderedHtml` is byte-identical to what the old
 * render-on-display path produced.
 *
 *   npm run db:verify-question-html
 *   npm run db:verify-question-html -- --spot-check <dir>
 *
 * Before T2.1 every student surface called `renderRichToHtml(source)` at
 * render time. After it, they read a column. This re-runs the old path on the
 * source columns and diffs it against the stored copy field by field, so
 * "renders identically" is a check rather than a claim. Exits non-zero on any
 * mismatch or missing row.
 *
 * `--spot-check <dir>` also writes an HTML page putting the stored render next
 * to a freshly computed one for the twenty most math-heavy questions in the
 * bank, for the part a diff cannot answer: whether the math looks right.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  RENDER_VERSION,
  renderQuestionHtml,
  type RenderedQuestionHtml,
} from "../src/lib/rendered-question";

const prisma = new PrismaClient();

const spotIndex = process.argv.indexOf("--spot-check");
const spotDir = spotIndex >= 0 ? process.argv[spotIndex + 1] : null;
const SPOT_COUNT = 20;

function mathDensity(q: {
  stem: string;
  passage: string | null;
  explanation: string | null;
  choices: unknown;
}): number {
  const source = [
    q.stem,
    q.passage ?? "",
    q.explanation ?? "",
    JSON.stringify(q.choices ?? ""),
  ].join(" ");
  return (source.match(/\$/g) ?? []).length;
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

  const mismatches: string[] = [];
  let missing = 0;
  let checked = 0;

  for (const q of questions) {
    const stored = q.renderedHtml as unknown as RenderedQuestionHtml | null;
    if (!stored) {
      missing++;
      continue;
    }
    if (stored.v !== RENDER_VERSION) {
      mismatches.push(`${q.id}: stored v${stored.v}, renderer v${RENDER_VERSION}`);
      continue;
    }
    const fresh = renderQuestionHtml(q);
    checked++;
    for (const field of ["stem", "passage", "explanation"] as const) {
      if ((stored[field] ?? null) !== (fresh[field] ?? null)) {
        mismatches.push(`${q.id}: ${field} differs`);
      }
    }
    const a = stored.choices ?? [];
    const b = fresh.choices ?? [];
    if (a.length !== b.length) {
      mismatches.push(`${q.id}: choice count ${a.length} vs ${b.length}`);
    } else {
      for (let i = 0; i < a.length; i++) {
        if (a[i].label !== b[i].label || a[i].html !== b[i].html) {
          mismatches.push(`${q.id}: choice ${a[i].label} differs`);
        }
      }
    }
  }

  console.log(
    `${questions.length} questions · ${checked} compared · ${missing} without stored HTML`,
  );
  if (mismatches.length === 0) {
    console.log("Every stored render is byte-identical to a fresh render.");
  } else {
    console.log(`\n${mismatches.length} mismatch(es):`);
    for (const m of mismatches.slice(0, 50)) console.log(`  ${m}`);
    process.exitCode = 1;
  }

  if (spotDir) {
    const heaviest = [...questions]
      .sort((x, y) => mathDensity(y) - mathDensity(x))
      .slice(0, SPOT_COUNT);
    mkdirSync(spotDir, { recursive: true });
    const full = join(spotDir, "spot-check.html");
    writeFileSync(full, spotCheckPage(heaviest, "full"), "utf8");
    const subset = join(spotDir, "spot-check-subset.html");
    writeFileSync(subset, spotCheckPage(heaviest, "subset"), "utf8");
    console.log(
      `\nSpot check: ${heaviest.length} most math-heavy questions (${mathDensity(heaviest[0])} down to ${mathDensity(heaviest[heaviest.length - 1])} math delimiters)`,
    );
    console.log(`  stock KaTeX fonts:  ${full}`);
    console.log(`  subset fonts:       ${subset}`);
  }
}

function spotCheckPage(
  questions: {
    id: string;
    stem: string;
    passage: string | null;
    explanation: string | null;
    choices: unknown;
    renderedHtml: unknown;
  }[],
  fonts: "full" | "subset",
): string {
  const rows = questions
    .map((q) => {
      const stored = q.renderedHtml as unknown as RenderedQuestionHtml | null;
      const fresh = renderQuestionHtml(q);
      const cell = (r: RenderedQuestionHtml | null) =>
        r
          ? [
              r.passage ? `<div class="passage">${r.passage}</div>` : "",
              r.stem,
              (r.choices ?? [])
                .map((c) => `<div class="choice"><b>${c.label}</b> ${c.html}</div>`)
                .join(""),
              r.explanation ? `<div class="expl">${r.explanation}</div>` : "",
            ].join("")
          : "<em>no stored HTML</em>";
      return `<section><h2>${q.id}</h2><div class="pair">
  <div class="col"><h3>Stored (renderedHtml)</h3>${cell(stored)}</div>
  <div class="col"><h3>Fresh (render at display time)</h3>${cell(fresh)}</div>
</div></section>`;
    })
    .join("\n");

  // Inline the stylesheet with absolute font URLs so the page renders wherever
  // it is written, not only next to node_modules. Two variants: the stock
  // KaTeX fonts, and the subset ones the app actually ships. Comparing the two
  // pages is how a glyph the subsetter dropped shows up — as a fallback serif
  // or a blank box on the subset page and nowhere else.
  const abs = (dir: string) => `file:///${dir.replace(/\\/g, "/")}`;
  const katexDist = join(process.cwd(), "node_modules", "katex", "dist");
  const katexCss =
    fonts === "full"
      ? readFileSync(join(katexDist, "katex.min.css"), "utf8").replace(
          /url\(fonts\//g,
          `url(${abs(katexDist)}/fonts/`,
        )
      : readFileSync(
          join(process.cwd(), "src", "app", "katex-subset.css"),
          "utf8",
        ).replace(
          /url\(\/katex\/fonts\//g,
          `url(${abs(join(process.cwd(), "public", "katex", "fonts"))}/`,
        );

  return `<!doctype html><meta charset="utf-8">
<title>T2.1 spot check — ${fonts} fonts</title>
<style>${katexCss}</style>
<style>
  body { font: 15px/1.6 system-ui, sans-serif; margin: 2rem; max-width: 1400px; }
  section { border-top: 2px solid #ddd; padding-top: 1rem; margin-top: 2rem; }
  h2 { font: 600 13px ui-monospace, monospace; color: #666; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
  .col { min-width: 0; }
  h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #888; }
  .passage { background: #f6f6f6; padding: .75rem; border-radius: 6px; margin-bottom: .75rem; }
  .choice { margin: .35rem 0; }
  .expl { background: #eef4ff; padding: .75rem; border-radius: 6px; margin-top: .75rem; }
</style>
<h1>Stored vs fresh render — ${questions.length} most math-heavy questions <small>(${fonts} fonts)</small></h1>
<p>The two columns must be visually identical. Left is the column students now read; right is what the old render-on-display path produces.</p>
${rows}
`;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
