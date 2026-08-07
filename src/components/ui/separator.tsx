import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Separator — a rule between things (T1.6).
 *
 * Most of the app's dividers are a `border-t` on the thing below, and they
 * should stay that way: a border costs nothing and needs no component. This is
 * for the two cases a border cannot do — a **vertical** rule between inline
 * items, and a rule with a **label** in the middle ("or", "Earlier attempts").
 *
 * Decorative by default, and that is the honest default: a line drawn between
 * two blocks that are already separated by heading and spacing is presentation.
 * Pass `decorative={false}` when the rule is the *only* thing marking a change
 * of topic, and it becomes a real `role="separator"` for a screen reader. The
 * labelled form ignores the prop and carries no role at all — see below.
 *
 * A vertical separator needs a height from its context: `self-stretch` inside a
 * flex row, or an explicit `h-4`. It renders 1px wide and 100% tall, and 100%
 * of nothing is nothing.
 */
export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  /** Centred text inside the rule. Horizontal only. */
  label?: React.ReactNode;
  /** `false` exposes it as `role="separator"`. Ignored when `label` is set. */
  decorative?: boolean;
}

export function Separator({
  orientation = "horizontal",
  label,
  decorative = true,
  className,
  ...props
}: SeparatorProps) {
  if (label && orientation === "horizontal") {
    return (
      // No `role="separator"` on this branch: a separator's children are
      // presentational per ARIA, which would hide the very label that makes it
      // worth rendering. The lines are the decoration, the label is content.
      <div className={cn("flex items-center gap-3", className)} {...props}>
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="eyebrow shrink-0 text-muted-foreground">{label}</span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "separator", "aria-orientation": orientation })}
      {...props}
    />
  );
}
