import { describe, expect, it } from "vitest";
import {
  RENDER_VERSION,
  readRenderedQuestion,
  renderQuestionHtml,
} from "@/lib/rendered-question";
import { renderRichToHtml } from "@/lib/rich-content";
import { buildGeneratedSource } from "../scripts/generate-reference-sheet";
import { REFERENCE_FORMULAS_HTML } from "@/components/reference-sheet-formulas.generated";

const MATHY = {
  stem: "If $x^2 = 16$, what is $\\frac{x}{2}$?",
  passage: null,
  explanation: "Because $x = 4$, the answer is $2$.",
  choices: [
    { label: "A", text: "$1$" },
    { label: "B", text: "$2$" },
    { label: "C", text: "$\\sqrt{2}$" },
    { label: "D", text: "$4$" },
  ],
};

describe("renderQuestionHtml", () => {
  it("renders every rich field through the same pipeline as render-on-display", () => {
    const rendered = renderQuestionHtml(MATHY);
    expect(rendered.v).toBe(RENDER_VERSION);
    expect(rendered.stem).toBe(renderRichToHtml(MATHY.stem));
    expect(rendered.explanation).toBe(renderRichToHtml(MATHY.explanation));
    expect(rendered.choices?.map((c) => c.html)).toEqual(
      MATHY.choices.map((c) => renderRichToHtml(c.text)),
    );
  });

  it("actually typesets the math rather than passing the LaTeX through", () => {
    const rendered = renderQuestionHtml(MATHY);
    expect(rendered.stem).toContain("katex");
    expect(rendered.stem).not.toContain("$x^2 = 16$");
  });

  it("leaves absent fields null instead of empty strings", () => {
    const rendered = renderQuestionHtml({ stem: "Plain", passage: null });
    expect(rendered.passage).toBeNull();
    expect(rendered.explanation).toBeNull();
    expect(rendered.choices).toBeNull();
  });

  it("ignores malformed choice JSON rather than throwing", () => {
    const rendered = renderQuestionHtml({
      stem: "Plain",
      choices: [{ label: "Z", text: "nope" }, null, "string"],
    });
    expect(rendered.choices).toBeNull();
  });
});

describe("readRenderedQuestion", () => {
  it("returns the stored copy when the version matches", () => {
    const stored = { ...renderQuestionHtml(MATHY), stem: "<p>stored marker</p>" };
    const read = readRenderedQuestion({ ...MATHY, renderedHtml: stored });
    expect(read.stem).toBe("<p>stored marker</p>");
  });

  it("falls back to rendering when renderedHtml is null", () => {
    const read = readRenderedQuestion({ ...MATHY, renderedHtml: null });
    expect(read.stem).toBe(renderRichToHtml(MATHY.stem));
    expect(read.choices).toHaveLength(4);
  });

  it("falls back when the stored copy is from an older renderer", () => {
    const stale = { ...renderQuestionHtml(MATHY), v: 0, stem: "<p>stale</p>" };
    const read = readRenderedQuestion({ ...MATHY, renderedHtml: stale });
    expect(read.stem).toBe(renderRichToHtml(MATHY.stem));
  });

  it("falls back on a stored value that is not a rendered object", () => {
    for (const junk of [[], "", 0, { stem: 42 }]) {
      expect(readRenderedQuestion({ ...MATHY, renderedHtml: junk }).stem).toBe(
        renderRichToHtml(MATHY.stem),
      );
    }
  });
});

describe("reference sheet", () => {
  it("has a generated file in sync with its LaTeX source", () => {
    // The generated copy exists so the test interface ships no KaTeX. If this
    // fails, run `npm run gen:reference-sheet`.
    expect(buildGeneratedSource()).toContain(
      JSON.stringify(REFERENCE_FORMULAS_HTML[0].html),
    );
    for (const f of REFERENCE_FORMULAS_HTML) {
      expect(buildGeneratedSource()).toContain(JSON.stringify(f.html));
    }
  });

  it("typesets all twelve formulas", () => {
    expect(REFERENCE_FORMULAS_HTML).toHaveLength(12);
    for (const f of REFERENCE_FORMULAS_HTML) {
      expect(f.html).toContain("katex");
      expect(f.html).not.toContain("math error");
    }
  });
});
