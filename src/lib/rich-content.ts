import katex from "katex";
import DOMPurify from "isomorphic-dompurify";

/**
 * Render rich question content: HTML with embedded LaTeX delimited by
 *   $...$    (inline)
 *   $$...$$  (display)
 *
 * Strategy: substitute KaTeX-rendered HTML for math delimiters first,
 * then run the whole string through DOMPurify so any user-supplied HTML
 * is sanitized. KaTeX's output uses well-known classes (`katex`, `katex-display`)
 * that DOMPurify allows through by default.
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

  return DOMPurify.sanitize(out, {
    ADD_ATTR: ["target", "rel"],
  });
}

function safeKatex(expr: string, displayMode: boolean): string {
  try {
    return katex.renderToString(expr, {
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
