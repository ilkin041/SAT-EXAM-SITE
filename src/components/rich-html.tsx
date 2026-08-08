import { memo } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Already rendered and sanitized. Comes from `renderedHtml` on the server. */
  html: string | null | undefined;
  className?: string;
}

/**
 * Displays question content that has *already* been through KaTeX and
 * `sanitize-html` on the server.
 *
 * The whole point of this component is what it does not import. `RichContent`
 * calls `renderRichToHtml`, which pulls KaTeX — about 200 kB of First Load JS
 * the moment a client component touches it. Student surfaces use this instead
 * and take the HTML as a prop, so no student downloads a math renderer to read
 * math that was typeset once at authoring time.
 *
 * Use `RichContent` only where the source LaTeX has to be rendered live: the
 * admin editor's preview pane.
 *
 * **It is memoised, and that is a correctness fix, not an optimisation.**
 * React 18.3 diffs `dangerouslySetInnerHTML` by the identity of the object it
 * is given, and `{ __html: html }` is a new literal on every render — so a
 * parent re-rendering for any reason re-runs `setInnerHTML` with a byte-
 * identical string and rebuilds this subtree from scratch. In the test
 * interface, whose timer re-renders once a second, that quietly destroyed
 * every passage highlight `AnnotatedPassage` had drawn: measured at six
 * rewrites a second across the passage, the stem and the four choices.
 * `memo` bails out on equal props, so the DOM is left alone.
 *
 * `AnnotatedPassage` does not rely on this alone — it redraws if it finds its
 * spans gone — but that is a safety net, and this is the fix.
 */
export const RichHtml = memo(function RichHtml({ html, className }: Props) {
  return (
    <div
      className={cn("rich-content", className)}
      dangerouslySetInnerHTML={{ __html: html ?? "" }}
    />
  );
});
