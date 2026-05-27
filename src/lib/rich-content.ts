import katex from "katex";
import sanitizeHtml from "sanitize-html";

/**
 * Render rich question content: HTML with embedded LaTeX delimited by
 *   $...$    (inline)
 *   $$...$$  (display)
 *
 * Strategy: substitute KaTeX-rendered HTML for math delimiters first,
 * then run the whole string through sanitize-html so any user-supplied HTML
 * is sanitized. KaTeX's output uses well-known classes (`katex`, `katex-display`)
 * which are explicitly allowed through.
 *
 * Sanitizer is `sanitize-html` (pure JS, no DOM) rather than DOMPurify because
 * isomorphic-dompurify pulls jsdom on the server, which has an ESM/CJS interop
 * bug with current Node runtimes on Vercel (@exodus/bytes ESM-only).
 */
export function renderRichToHtml(input: string | null | undefined): string {
  if (!input) return "";

  // Display math first so $$ doesn't get eaten by the $ pass.
  let out = input.replace(/\$\$([\s\S]+?)\$\$/g, (_match, expr) =>
    safeKatex(expr, true),
  );

  // Inline math: don't cross newlines, don't match escaped $.
  out = out.replace(/(^|[^\\])\$([^$\n]+?)\$/g, (_match, prefix, expr) =>
    `${prefix}${safeKatex(expr, false)}`,
  );

  // Unescape \$ -> $
  out = out.replace(/\\\$/g, "$");

  return sanitizeHtml(out, SANITIZE_OPTIONS);
}

function safeKatex(expr: string, displayMode: boolean): string {
  try {
    // In inline mode KaTeX renders \frac, \sum, \int, etc. in compressed
    // "textstyle" to fit the line height. Prepending \displaystyle promotes
    // the whole expression to full display size, matching what students see
    // on the real Bluebook UI. \displaystyle is a TeX primitive (not a
    // macro), so this always works regardless of the input expression.
    const finalExpr = displayMode ? expr : `\\displaystyle ${expr}`;
    return katex.renderToString(finalExpr, {
      displayMode,
      throwOnError: false,
      output: "html",
      strict: "ignore",
    });
  } catch {
    return `<code class="text-destructive">[math error: ${escapeHtml(expr)}]</code>`;
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

// ---------- sanitize-html configuration ----------

// Style-value regex permitting any value. KaTeX emits a huge variety of
// inline styles (em, px, %, decimals, colors) — locking down each rule's
// allowed values would over-constrain math rendering. Tag-level whitelist
// remains the primary defense; style values are loose only on safe tags.
const ANY_VALUE = [/^.+$/];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    // Standard rich-text tags
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "del",
    "code",
    "pre",
    "blockquote",
    "ul",
    "ol",
    "li",
    "a",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "span",
    "div",
    "sup",
    "sub",
    "img",
    "figure",
    "figcaption",
    "hr",
    // KaTeX HTML output uses tables for matrices
    "table",
    "thead",
    "tbody",
    "tr",
    "td",
    "th",
    // MathML (KaTeX dual-renders for accessibility)
    "math",
    "mrow",
    "mi",
    "mn",
    "mo",
    "ms",
    "mfrac",
    "msup",
    "msub",
    "msubsup",
    "msqrt",
    "mroot",
    "annotation",
    "semantics",
    "mtext",
    "mspace",
    "mover",
    "munder",
    "munderover",
    "mstyle",
    "mfenced",
    "mtable",
    "mtr",
    "mtd",
    "mpadded",
    "menclose",
    "mphantom",
    // SVG (KaTeX uses for some characters & stretching delimiters)
    "svg",
    "path",
    "g",
    "line",
    "rect",
  ],
  allowedAttributes: {
    "*": ["class", "style", "id", "aria-hidden", "aria-label", "role"],
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    annotation: ["encoding"],
    svg: ["xmlns", "width", "height", "viewBox", "preserveAspectRatio", "fill"],
    path: ["d", "fill", "stroke", "stroke-width"],
    math: ["xmlns", "display"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
  // KaTeX uses many specific inline styles for positioning.
  allowedStyles: {
    "*": {
      color: ANY_VALUE,
      "background-color": ANY_VALUE,
      "font-size": ANY_VALUE,
      "font-family": ANY_VALUE,
      "font-weight": ANY_VALUE,
      "font-style": ANY_VALUE,
      "text-align": ANY_VALUE,
      "text-decoration": ANY_VALUE,
      "vertical-align": ANY_VALUE,
      "white-space": ANY_VALUE,
      top: ANY_VALUE,
      left: ANY_VALUE,
      right: ANY_VALUE,
      bottom: ANY_VALUE,
      margin: ANY_VALUE,
      "margin-left": ANY_VALUE,
      "margin-right": ANY_VALUE,
      "margin-top": ANY_VALUE,
      "margin-bottom": ANY_VALUE,
      padding: ANY_VALUE,
      "padding-left": ANY_VALUE,
      "padding-right": ANY_VALUE,
      "padding-top": ANY_VALUE,
      "padding-bottom": ANY_VALUE,
      height: ANY_VALUE,
      width: ANY_VALUE,
      "min-width": ANY_VALUE,
      "max-width": ANY_VALUE,
      "min-height": ANY_VALUE,
      "max-height": ANY_VALUE,
      position: [/^(absolute|relative|static|fixed|sticky)$/],
      display: ANY_VALUE,
      border: ANY_VALUE,
      "border-color": ANY_VALUE,
      "border-top": ANY_VALUE,
      "border-bottom": ANY_VALUE,
      "border-left": ANY_VALUE,
      "border-right": ANY_VALUE,
      "border-radius": ANY_VALUE,
      transform: ANY_VALUE,
      "line-height": ANY_VALUE,
      opacity: ANY_VALUE,
    },
  },
};
