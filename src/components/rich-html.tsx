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
 */
export function RichHtml({ html, className }: Props) {
  return (
    <div
      className={cn("rich-content", className)}
      dangerouslySetInnerHTML={{ __html: html ?? "" }}
    />
  );
}
