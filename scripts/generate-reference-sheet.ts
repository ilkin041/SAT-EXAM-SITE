/**
 * Typesets the reference-sheet formulas once and writes them out as a plain
 * string constant, so the client component that shows them imports no KaTeX.
 *
 *   npm run gen:reference-sheet
 *
 * `tests/reference-sheet.test.ts` re-renders the source and fails if the
 * generated file has drifted, so forgetting to re-run this is a red test
 * rather than a stale reference sheet in front of a student.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { REFERENCE_FORMULAS } from "../src/components/reference-sheet-formulas";
import { renderRichToHtml } from "../src/lib/rich-content";

const OUT = join(
  process.cwd(),
  "src",
  "components",
  "reference-sheet-formulas.generated.ts",
);

export function buildGeneratedSource(): string {
  const entries = REFERENCE_FORMULAS.map(
    (f) =>
      `  {\n    title: ${JSON.stringify(f.title)},\n    html: ${JSON.stringify(renderRichToHtml(f.latex))},\n  },`,
  ).join("\n");

  return `// GENERATED FILE — do not edit by hand.
// Run \`npm run gen:reference-sheet\` after changing REFERENCE_FORMULAS in
// ./reference-sheet-formulas.ts. Checked in so the build needs no KaTeX pass,
// and verified against the source by tests/reference-sheet.test.ts.

export const REFERENCE_FORMULAS_HTML: { title: string; html: string }[] = [
${entries}
];
`;
}

if (process.argv[1] && process.argv[1].endsWith("generate-reference-sheet.ts")) {
  writeFileSync(OUT, buildGeneratedSource(), "utf8");
  console.log(`Wrote ${REFERENCE_FORMULAS.length} formulas to ${OUT}`);
}
