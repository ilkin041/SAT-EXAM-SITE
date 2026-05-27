import { renderRichToHtml } from "@/lib/rich-content";
import { cn } from "@/lib/utils";

interface Props {
  html: string | null | undefined;
  className?: string;
}

/**
 * Renders question text, passages, choices, explanations — anything that
 * may contain user-supplied HTML and `$...$` / `$$...$$` LaTeX.
 *
 * Safe to use on the server; output is sanitized.
 */
export function RichContent({ html, className }: Props) {
  const rendered = renderRichToHtml(html);
  return (
    <div
      className={cn("rich-content", className)}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
