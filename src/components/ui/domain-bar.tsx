import * as React from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

/**
 * DomainBar — one row of a skill breakdown (T1.7).
 *
 * Label, the raw fraction, the percent, and a graded `Progress` under them.
 * `computeDomainBreakdown()` in `src/lib/scoring.ts` already returns exactly
 * `{ domain, correct, total }`, so a call site spreads a stat straight in;
 * `DomainBarList` takes the array.
 *
 * **The percentage is computed here and passed to the bar**, rather than each
 * working it out. There is one rounding, so the number the reader sees and the
 * width they see can never disagree — 7/9 is 78% and a bar that is 77.8% wide
 * would put the fill just short of the emerald cut it is labelled with.
 *
 * The bar itself carries no label: the fraction and the percent are sitting
 * directly above it, and `Progress` is `aria-hidden` without one for that
 * reason. What a screen reader gets is the text.
 *
 * **`label` is a slot, and that is a bundle decision, not a taste one.** The
 * obvious API is a `tooltip` prop that wraps the label in a `<Tooltip>`. It was
 * written that way first and it cost the results page 31 kB of client
 * JavaScript — 94.2 kB first load to 125 kB — because a static import of a
 * client component is paid whether or not the optional prop is ever passed, and
 * that page passes it nowhere. Taking the label as a node keeps Radix out of
 * every breakdown that does not want one; a page that does composes its own
 * trigger around `<DomainBarLabel>`, which carries the styling without the
 * dependency. See the gallery section for the shape.
 */

export interface DomainBarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * The domain or skill name. Truncates — these are long and the row is not.
   * A node so it can be a tooltip trigger; see the note above.
   */
  label: React.ReactNode;
  correct: number;
  total: number;
}

export function DomainBar({
  label,
  correct,
  total,
  className,
  ...props
}: DomainBarProps) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className={cn("text-body", className)} {...props}>
      <div className="mb-2 flex items-center justify-between gap-3">
        {/* `min-w-0` is what makes `truncate` work at all: a flex item defaults
            to `min-width: auto`, so a long domain name would push the fraction
            off the row instead of ellipsing. */}
        <span className="min-w-0 truncate font-medium text-foreground">
          {label}
        </span>
        <span className="shrink-0 text-caption tabular font-semibold text-muted-foreground">
          {correct} / {total}{" "}
          <span className="ml-1 font-bold text-foreground">{pct}%</span>
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

/**
 * The label as an interactive trigger, for the tooltip case. Wrap it in a
 * `<TooltipTrigger asChild>` at the call site — a button because a tooltip that
 * only opens on hover is not reachable, and the dotted underline because a
 * control that looks like text is not findable.
 */
export const DomainBarLabel = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "max-w-full truncate rounded-sm text-left font-medium text-foreground underline decoration-dotted underline-offset-4",
      className,
    )}
    {...props}
  />
));
DomainBarLabel.displayName = "DomainBarLabel";

/**
 * The list form. `<ul>` because a breakdown is a set of peers and a screen
 * reader should be told how many there are before reading them.
 */
export function DomainBarList({
  stats,
  renderLabel,
  className,
  ...props
}: Omit<React.HTMLAttributes<HTMLUListElement>, "children"> & {
  stats: { domain: string; correct: number; total: number }[];
  /** Replaces the plain name — a tooltip trigger, a link, a badge beside it. */
  renderLabel?: (domain: string) => React.ReactNode;
}) {
  return (
    <ul className={cn("space-y-4", className)} {...props}>
      {stats.map((stat) => (
        <li key={stat.domain}>
          <DomainBar
            label={renderLabel ? renderLabel(stat.domain) : stat.domain}
            correct={stat.correct}
            total={stat.total}
          />
        </li>
      ))}
    </ul>
  );
}
