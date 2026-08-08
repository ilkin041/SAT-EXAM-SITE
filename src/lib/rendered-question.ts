import { renderRichToHtml } from "@/lib/rich-content";

/**
 * Pre-rendered question content — KaTeX output, already sanitized, ready to
 * drop into `dangerouslySetInnerHTML`.
 *
 * **This module imports KaTeX. Never import it from a client component.**
 * Client surfaces take the strings as props and render them with
 * `<RichHtml>`, which is what keeps the ~200 kB renderer off the student
 * bundle. `import type` from here is safe; a value import is not.
 */
export interface RenderedQuestionHtml {
  /** Renderer version. Bump when the KaTeX config or sanitizer changes, then
   *  re-run the backfill — readers treat a mismatch as "not rendered yet". */
  v: number;
  stem: string;
  passage: string | null;
  explanation: string | null;
  choices: RenderedChoice[] | null;
}

export interface RenderedChoice {
  label: "A" | "B" | "C" | "D";
  html: string;
}

export const RENDER_VERSION = 1;

/** The subset of a `Question` that carries renderable content. */
export interface RenderableQuestion {
  stem: string;
  passage?: string | null;
  explanation?: string | null;
  choices?: unknown;
}

type RawChoice = { label: "A" | "B" | "C" | "D"; text: string };

function asChoices(value: unknown): RawChoice[] | null {
  if (!Array.isArray(value)) return null;
  const out: RawChoice[] = [];
  for (const c of value) {
    if (!c || typeof c !== "object") continue;
    const { label, text } = c as { label?: unknown; text?: unknown };
    if (label !== "A" && label !== "B" && label !== "C" && label !== "D") continue;
    out.push({ label, text: typeof text === "string" ? text : "" });
  }
  return out.length > 0 ? out : null;
}

/**
 * Render every rich field of a question once, at authoring time.
 *
 * Call this on every write path that touches question content — the admin
 * actions, the JSON importer, the seed — so `renderedHtml` never drifts from
 * the source columns.
 */
export function renderQuestionHtml(q: RenderableQuestion): RenderedQuestionHtml {
  const choices = asChoices(q.choices);
  return {
    v: RENDER_VERSION,
    stem: renderRichToHtml(q.stem),
    passage: q.passage ? renderRichToHtml(q.passage) : null,
    explanation: q.explanation ? renderRichToHtml(q.explanation) : null,
    choices: choices
      ? choices.map((c) => ({ label: c.label, html: renderRichToHtml(c.text) }))
      : null,
  };
}

/**
 * Read a question's rendered HTML, rendering on the fly if the stored copy is
 * missing or was written by an older renderer.
 *
 * Server-only, and deliberately so: the fallback is what makes a NULL
 * `renderedHtml` a performance regression for one request rather than a blank
 * question for one student.
 */
export function readRenderedQuestion(
  q: RenderableQuestion & { renderedHtml?: unknown },
): RenderedQuestionHtml {
  const stored = q.renderedHtml;
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    const candidate = stored as Partial<RenderedQuestionHtml>;
    if (candidate.v === RENDER_VERSION && typeof candidate.stem === "string") {
      return {
        v: RENDER_VERSION,
        stem: candidate.stem,
        passage: typeof candidate.passage === "string" ? candidate.passage : null,
        explanation:
          typeof candidate.explanation === "string" ? candidate.explanation : null,
        choices: Array.isArray(candidate.choices)
          ? (candidate.choices as RenderedChoice[])
          : null,
      };
    }
  }
  return renderQuestionHtml(q);
}
