/**
 * Ship only the KaTeX fonts and glyphs the question bank actually uses.
 *
 *   npm run gen:katex-subset
 *   npm run gen:katex-subset -- --report-only
 *
 * KaTeX's stylesheet declares 20 `@font-face`s across 10 families and ships
 * 60 font files (1.2 MB). A bank of SAT questions touches a small corner of
 * that: no Fraktur, no Script, and a couple of hundred distinct glyphs. Both
 * the unused families and the unused glyphs are dead weight on every student's
 * first paint, and unlike JavaScript a stylesheet's cost is invisible in
 * `next build`'s route table — so it has to be measured deliberately.
 *
 * What this does:
 *
 *  1. Reads every `Question.renderedHtml` from the database, plus the
 *     generated reference-sheet HTML.
 *  2. Works out, per text run, which font face KaTeX will paint it with. The
 *     class-to-font map is *parsed out of `katex.min.css` itself* rather than
 *     hardcoded, so a KaTeX upgrade cannot silently invalidate it. jsdom does
 *     the selector matching.
 *  3. Subsets each needed woff2 to the union of its glyphs (plus a safety set)
 *     with `pyftsubset`, into `public/katex/fonts/`.
 *  4. Writes `src/app/katex-subset.css` — KaTeX's stylesheet with the unused
 *     `@font-face` blocks dropped and the rest pointed at the subset files.
 *
 * Requires `pyftsubset` (`pip install fonttools brotli`). Without it the
 * script still writes the report and refuses to touch the CSS, so a partial
 * run can never leave the app pointing at fonts that were not built.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import { PrismaClient } from "@prisma/client";
import { REFERENCE_FORMULAS_HTML } from "../src/components/reference-sheet-formulas.generated";
import type { RenderedQuestionHtml } from "../src/lib/rendered-question";

const ROOT = process.cwd();
const KATEX_DIST = join(ROOT, "node_modules", "katex", "dist");
const OUT_FONT_DIR = join(ROOT, "public", "katex", "fonts");
const OUT_CSS = join(ROOT, "src", "app", "katex-subset.css");

const reportOnly = process.argv.includes("--report-only");

/**
 * Families kept whether or not the bank uses them today.
 *
 * Dropping a family is a different risk from dropping a glyph. `KaTeX_Main`
 * and `KaTeX_Math` are what ordinary text and ordinary variables land in, and
 * `KaTeX_Size1`–`Size4` are what a stretched delimiter or a large operator
 * lands in — `\left( \frac{a}{b} \right)` and `\sum` reach them with no font
 * macro at all, so the next math question an author writes can need one
 * without anybody deciding to. The families outside this list are gated behind
 * an explicit `\mathfrak`, `\mathscr`, `\mathcal`, `\mathsf`, `\mathtt` or
 * `\mathbb`, none of which appear on an SAT question.
 *
 * Kept-but-unused families still get glyph-subset to the safety set, so the
 * insurance costs a few kB rather than a whole font.
 */
const ALWAYS_KEEP_FAMILIES = new Set([
  "KaTeX_Main",
  "KaTeX_Math",
  "KaTeX_Size1",
  "KaTeX_Size2",
  "KaTeX_Size3",
  "KaTeX_Size4",
]);

/**
 * Glyphs kept in every subset font regardless of what the bank uses today.
 *
 * A missing glyph is a blank box in a student's exam, and the bank changes
 * without this script being re-run. Digits, ASCII punctuation and the basic
 * operators cost almost nothing and cover the overwhelming majority of what a
 * new question can introduce.
 */
const SAFETY_TEXT =
  "0123456789" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
  " !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~" +
  " −–—‘’“”…" + // nbsp, minus, dashes, quotes, ellipsis
  "°±×÷≤≥≠≈√∞∑∏∫" +
  "αβγδθλμπσφω" +
  "ΓΔΘΛΠΣΦΩ";

// ---------- 1. Parse katex.min.css ----------

interface FontFace {
  block: string;
  family: string;
  weight: string;
  style: string;
  /** Base filename without extension, e.g. `KaTeX_Main-Bold`. */
  file: string;
}

interface FontRule {
  selector: string;
  family?: string;
  weight?: string;
  style?: string;
}

/** A resolved font face key: `family|weight|style`. */
type FaceKey = string;

function faceKey(family: string, weight: string, style: string): FaceKey {
  return `${family}|${weight}|${style}`;
}

function parseCss(css: string) {
  const faces: FontFace[] = [];
  for (const m of css.matchAll(/@font-face\{[^}]*\}/g)) {
    const block = m[0];
    const family = /font-family:\s*([^;}]+)/.exec(block)?.[1].trim() ?? "";
    const weight = /font-weight:\s*([^;}]+)/.exec(block)?.[1].trim() ?? "400";
    const style = /font-style:\s*([^;}]+)/.exec(block)?.[1].trim() ?? "normal";
    const file = /url\(fonts\/([^.]+)\.woff2\)/.exec(block)?.[1] ?? "";
    if (!family || !file) throw new Error(`Unparsable @font-face:\n${block}`);
    faces.push({ block, family, weight, style, file });
  }

  const rules: FontRule[] = [];
  const withoutFaces = css.replace(/@font-face\{[^}]*\}/g, "");
  for (const m of withoutFaces.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const decls = m[2];
    const family = /(?:^|;)font-family:\s*([^;,}]+)/.exec(decls)?.[1].trim();
    const weight = /(?:^|;)font-weight:\s*([^;}]+)/.exec(decls)?.[1].trim();
    const style = /(?:^|;)font-style:\s*([^;}]+)/.exec(decls)?.[1].trim();
    if (!family && !weight && !style) continue;
    if (family && !family.startsWith("KaTeX_")) continue;
    rules.push({ selector: m[1].trim(), family, weight, style });
  }

  if (faces.length === 0 || rules.length === 0) {
    throw new Error("katex.min.css parsed to no faces or no rules — format changed?");
  }
  return { faces, rules };
}

// ---------- 2. Attribute glyphs to faces ----------

/**
 * KaTeX dual-renders: a visual `.katex-html` tree and a `.katex-mathml` tree
 * that is `aria-hidden`-adjacent and never painted. Only the former consumes
 * fonts.
 */
function collectGlyphs(
  htmlFragments: string[],
  rules: FontRule[],
): Map<FaceKey, Set<string>> {
  const dom = new JSDOM("<!doctype html><body></body>");
  const { document, NodeFilter } = dom.window;
  const byFace = new Map<FaceKey, Set<string>>();

  for (const fragment of htmlFragments) {
    if (!fragment) continue;
    const host = document.createElement("div");
    host.className = "katex-host";
    host.innerHTML = fragment;
    document.body.appendChild(host);

    for (const katex of Array.from(host.querySelectorAll(".katex")) as Element[]) {
      const visual = katex.querySelector(".katex-html") ?? katex;
      const walker = document.createTreeWalker(visual, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const text = node.textContent ?? "";
        if (text.trim().length > 0) {
          // Base: `.katex{font:normal 1.21em KaTeX_Main,…}`.
          let family = "KaTeX_Main";
          let weight = "400";
          let style = "normal";
          const chain: Element[] = [];
          let el: Element | null = node.parentElement;
          while (el && el !== host) {
            chain.unshift(el);
            el = el.parentElement;
          }
          for (const ancestor of chain) {
            for (const rule of rules) {
              let matched = false;
              try {
                matched = ancestor.matches(rule.selector);
              } catch {
                matched = false;
              }
              if (!matched) continue;
              if (rule.family) family = rule.family;
              if (rule.weight) weight = rule.weight;
              if (rule.style) style = rule.style;
            }
          }
          const key = faceKey(family, weight, style);
          let set = byFace.get(key);
          if (!set) byFace.set(key, (set = new Set()));
          for (const ch of text) set.add(ch);
        }
        node = walker.nextNode();
      }
    }
    host.remove();
  }

  return byFace;
}

// ---------- 3. Subset ----------

/**
 * fontTools may be installed as the `pyftsubset` shim, or only as a module on
 * one of several interpreters — a machine with both Python 3.11 and 3.13
 * typically has it on exactly one. Resolve it once rather than rediscovering
 * it (noisily) per font.
 */
let fontToolsCmd: string[] | null | undefined;

function resolveFontTools(): string[] | null {
  if (fontToolsCmd !== undefined) return fontToolsCmd;
  const candidates = [
    ["pyftsubset"],
    ["py", "-m", "fontTools.subset"],
    ["python", "-m", "fontTools.subset"],
    ["python3", "-m", "fontTools.subset"],
  ];
  for (const cmd of candidates) {
    try {
      execFileSync(cmd[0], [...cmd.slice(1), "--help"], { stdio: "ignore" });
      return (fontToolsCmd = cmd);
    } catch {
      /* try next */
    }
  }
  return (fontToolsCmd = null);
}

function runSubset(args: string[]) {
  const cmd = resolveFontTools()!;
  execFileSync(cmd[0], [...cmd.slice(1), ...args], { stdio: "inherit" });
}

function unicodesArg(chars: Set<string>): string {
  const codes = new Set<string>();
  for (const ch of chars) {
    codes.add("U+" + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0"));
  }
  return [...codes].sort().join(",");
}

/** The set of Unicode codepoints a font file's cmap maps, via fontTools. */
function fontCodepoints(file: string): Set<number> {
  const py = `import sys
from fontTools.ttLib import TTFont
f = TTFont(sys.argv[1], fontNumber=0)
print(" ".join(str(c) for c in f.getBestCmap().keys()))`;
  // Reuse the interpreter fontTools was found on — `pyftsubset` is a shim, so
  // fall back to its own interpreter name in that case.
  const cmd = resolveFontTools();
  const interpreter = cmd && cmd[0] !== "pyftsubset" ? cmd[0] : "py";
  const out = execFileSync(interpreter, ["-c", py, file], { encoding: "utf8" });
  return new Set(out.trim().split(/\s+/).filter(Boolean).map(Number));
}

function kb(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

// ---------- main ----------

async function main() {
  const css = readFileSync(join(KATEX_DIST, "katex.min.css"), "utf8");
  const { faces, rules } = parseCss(css);

  const prisma = new PrismaClient();
  let fragments: string[] = [];
  try {
    const questions = await prisma.question.findMany({
      select: { renderedHtml: true },
    });
    for (const q of questions) {
      const r = q.renderedHtml as unknown as RenderedQuestionHtml | null;
      if (!r) continue;
      fragments.push(r.stem, r.passage ?? "", r.explanation ?? "");
      for (const c of r.choices ?? []) fragments.push(c.html);
    }
    console.log(
      `Scanned ${questions.length} questions (${questions.filter((q) => q.renderedHtml).length} with rendered HTML).`,
    );
  } finally {
    await prisma.$disconnect();
  }
  fragments = fragments.concat(REFERENCE_FORMULAS_HTML.map((f) => f.html));

  const byFace = collectGlyphs(fragments, rules);
  const safety = new Set(SAFETY_TEXT);

  console.log("\nFont faces used by the bank:");
  const used: { face: FontFace; chars: Set<string> }[] = [];
  for (const face of faces) {
    const chars = byFace.get(faceKey(face.family, face.weight, face.style));
    const insurance = ALWAYS_KEEP_FAMILIES.has(face.family);
    if (!chars && !insurance) continue;
    const merged = new Set([...(chars ?? []), ...safety]);
    used.push({ face, chars: merged });
    console.log(
      `  ${face.file.padEnd(28)} ${String(chars?.size ?? 0).padStart(4)} in bank → ${String(merged.size).padStart(3)} kept${chars ? "" : "  (kept as insurance)"}`,
    );
  }
  const dropped = faces.filter((f) => !used.some((u) => u.face.file === f.file));
  console.log(`\nDropping ${dropped.length} unused face(s): ${dropped.map((f) => f.file).join(", ") || "none"}`);

  const unmatched = [...byFace.keys()].filter(
    (k) => !faces.some((f) => faceKey(f.family, f.weight, f.style) === k),
  );
  if (unmatched.length > 0) {
    // A resolved face with no @font-face means the class map is wrong, not
    // that the glyphs are free — fail loudly rather than ship a gap.
    throw new Error(`Resolved to faces with no @font-face: ${unmatched.join(", ")}`);
  }

  if (reportOnly) {
    console.log("\n--report-only: no files written.");
    return;
  }
  if (!resolveFontTools()) {
    throw new Error(
      "pyftsubset not found. Install it with `pip install fonttools brotli`, then re-run. Nothing was written.",
    );
  }

  mkdirSync(OUT_FONT_DIR, { recursive: true });
  let before = 0;
  let after = 0;
  for (const { face, chars } of used) {
    const src = join(KATEX_DIST, "fonts", `${face.file}.woff2`);
    const dest = join(OUT_FONT_DIR, `${face.file}.woff2`);
    runSubset([
      src,
      `--output-file=${dest}`,
      "--flavor=woff2",
      `--unicodes=${unicodesArg(chars)}`,
      "--layout-features=",
      "--no-hinting",
      "--desubroutinize",
    ]);
    before += statSync(src).size;
    after += statSync(dest).size;
  }

  // Verify the subsets before pointing the app at them. A dropped glyph is a
  // blank box in an exam and does not show up in any size number, so read each
  // output font's cmap back and confirm every codepoint asked for survived.
  const gaps: string[] = [];
  for (const { face, chars } of used) {
    const dest = join(OUT_FONT_DIR, `${face.file}.woff2`);
    const srcCmap = fontCodepoints(join(KATEX_DIST, "fonts", `${face.file}.woff2`));
    const outCmap = fontCodepoints(dest);
    for (const ch of chars) {
      const cp = ch.codePointAt(0)!;
      // Only a glyph the stock font actually had can be expected in the subset.
      if (srcCmap.has(cp) && !outCmap.has(cp)) {
        gaps.push(`${face.file} lost U+${cp.toString(16).toUpperCase()} (${ch})`);
      }
    }
  }
  if (gaps.length > 0) {
    throw new Error(`Subsetting dropped required glyphs:\n  ${gaps.join("\n  ")}`);
  }
  console.log(`\nVerified: every required glyph present in all ${used.length} subset fonts.`);

  // Rewrite the stylesheet: keep only the used faces, woff2 only, served from
  // /katex/fonts. Everything else in katex.min.css is layout and stays.
  let outCss = css;
  for (const face of dropped) outCss = outCss.replace(face.block, "");
  for (const { face } of used) {
    const rewritten = face.block.replace(
      /src:[^;}]+/,
      `src:url(/katex/fonts/${face.file}.woff2) format("woff2")`,
    );
    outCss = outCss.replace(face.block, rewritten);
  }
  writeFileSync(
    OUT_CSS,
    `/* GENERATED FILE — do not edit by hand. Run \`npm run gen:katex-subset\`.
 * katex.min.css with the ${dropped.length} unused @font-face block(s) removed
 * and the remaining ${used.length} pointed at glyph-subset woff2 files in
 * public/katex/fonts. Regenerate after adding questions that use new glyphs. */
${outCss}
`,
    "utf8",
  );

  // What a browser could previously have been asked to download is every
  // woff2 KaTeX declares, not just the ones we now keep — that is the number
  // the subset is measured against.
  const allWoff2 = faces.reduce(
    (sum, f) => sum + statSync(join(KATEX_DIST, "fonts", `${f.file}.woff2`)).size,
    0,
  );
  console.log(
    `\nFonts: ${kb(allWoff2)} across ${faces.length} faces → ${kb(after)} across ${used.length}`,
  );
  console.log(`       (${kb(before)} of that was the ${used.length} faces we kept, before glyph subsetting)`);
  console.log(`CSS:   ${kb(css.length)} → ${kb(statSync(OUT_CSS).size)}`);
  console.log(`Wrote ${OUT_CSS}`);
  if (!existsSync(join(ROOT, "public", "katex"))) throw new Error("font output missing");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
