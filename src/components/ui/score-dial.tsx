import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ScoreDial — the ring gauge that a score report is built around (T1.7).
 *
 * Extracted verbatim from `results/[attemptId]/page.tsx`, where it was 26 lines
 * of inline SVG, with one bug fixed on the way out.
 *
 * **The floor bug.** The page computed the ring's fill as
 * `(total - 400) / 1200`, mapping the SAT's 400–1600 range onto the full
 * circle. That is right for a *band* and wrong for a *dial*: a student who
 * scores 400 — the floor, not a failure to participate — saw an empty ring, and
 * 800 read as one third when it is half the scale. A dial answers "how much of
 * the total", so the fraction is `value / max` and 400 draws a quarter turn.
 * The relative reading is what `<Progress variant="scoreBand">` is for; it
 * takes a `min` precisely because a band is the shape where 400 *is* the left
 * edge.
 *
 * **`role="img"` on the wrapper, not the SVG.** The number, the sublabel and
 * the delta chip are all inside it, and ARIA makes the children of an `img`
 * presentational — so the whole gauge announces once, as one sentence, instead
 * of leaking "1230", "/ 1600", "+40" as three unrelated fragments. Everything
 * visible is therefore also in `aria-label`.
 *
 * **The sweep is a CSS animation, not a transition.** A transition needs a
 * value to change, and this renders server-side at its final offset, so it
 * never fired — the old `transition-all duration-1000` was decorative. The
 * keyframes interpolate between two custom properties set inline, which is the
 * only way a static render can animate from empty. `stroke-dashoffset` is also
 * set directly, so the final state is correct with or without the animation,
 * and the global `prefers-reduced-motion` block collapses the duration to
 * nothing against a `forwards` fill — the ring simply appears full.
 */

/** Geometry of the ring, in the SVG's own units. r=50 in a 120 box. */
const DIAL_RADIUS = 50;
const DIAL_CIRCUMFERENCE = 2 * Math.PI * DIAL_RADIUS;

const dialVariants = cva("relative flex items-center justify-center", {
  variants: {
    size: {
      sm: "h-28 w-28",
      md: "h-36 w-36",
      lg: "h-48 w-48",
    },
  },
  defaultVariants: { size: "lg" },
});

const valueVariants = cva("block text-foreground tabular", {
  variants: {
    size: { sm: "text-h3", md: "text-h1", lg: "text-display" },
  },
  defaultVariants: { size: "lg" },
});

const sublabelVariants = cva("mt-0.5 block font-bold text-muted-foreground", {
  variants: {
    size: { sm: "text-caption", md: "text-caption", lg: "text-body" },
  },
  defaultVariants: { size: "lg" },
});

export interface ScoreDialProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof dialVariants> {
  value: number;
  /** Top of the scale. The ring is `value / max`. */
  max?: number;
  /** Eyebrow under the ring. Announced as part of the gauge. */
  label?: string;
  /** Secondary line inside the ring — "/ 1600". */
  sublabel?: React.ReactNode;
  /** Change since some earlier score. Signed; 0 renders as "no change". */
  delta?: number | null;
  /** What the delta is measured against — "vs. last attempt". */
  deltaLabel?: string;
  /** Replaces the derived announcement outright. */
  "aria-label"?: string;
}

export function ScoreDial({
  value,
  max = 1600,
  size,
  label,
  sublabel,
  delta,
  deltaLabel,
  className,
  "aria-label": ariaLabel,
  ...props
}: ScoreDialProps) {
  const pct = dialPercent(value, max);
  const offset = DIAL_CIRCUMFERENCE - (pct / 100) * DIAL_CIRCUMFERENCE;
  const hasDelta = delta !== undefined && delta !== null;

  return (
    <div
      className={cn("flex flex-col items-center", className)}
      role="img"
      aria-label={
        ariaLabel ?? describeDial(value, max, label, delta, deltaLabel)
      }
      {...props}
    >
      <div className={cn(dialVariants({ size }))}>
        <svg
          className="absolute inset-0 h-full w-full -rotate-90"
          viewBox="0 0 120 120"
        >
          <circle
            cx="60"
            cy="60"
            r={DIAL_RADIUS}
            className="fill-none stroke-muted/50"
            strokeWidth="9"
          />
          <circle
            cx="60"
            cy="60"
            r={DIAL_RADIUS}
            className="animate-score-dial fill-none stroke-primary"
            strokeWidth="9"
            strokeDasharray={DIAL_CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={
              {
                "--dial-circumference": DIAL_CIRCUMFERENCE,
                "--dial-offset": offset,
              } as React.CSSProperties
            }
          />
        </svg>
        <div className="z-10 text-center">
          <span className={valueVariants({ size })}>{value}</span>
          {sublabel && (
            <span className={sublabelVariants({ size })}>{sublabel}</span>
          )}
        </div>
      </div>

      {label && (
        <span className="eyebrow mt-3 text-muted-foreground">{label}</span>
      )}

      {hasDelta && (
        <div className="mt-2 flex items-center gap-2">
          <DeltaChip delta={delta} />
          {deltaLabel && (
            <span className="text-caption text-muted-foreground">
              {deltaLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const deltaVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-caption font-bold tabular",
  {
    variants: {
      direction: {
        up: "border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        down: "border-red-500/20 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
        flat: "border-border/80 bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { direction: "flat" },
  },
);

function DeltaChip({ delta }: { delta: number }) {
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;

  return (
    <span className={deltaVariants({ direction })}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {/* U+2212, not a hyphen: a minus sign is the width of a digit in a
          tabular face, so a column of deltas stays aligned. */}
      {delta > 0 ? `+${delta}` : delta < 0 ? `−${Math.abs(delta)}` : "0"}
    </span>
  );
}

/**
 * Fraction of the scale the ring fills, clamped and rounded to a whole percent.
 * No floor subtraction — see the note on the floor bug above.
 */
export function dialPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

/** One sentence covering everything the gauge shows. */
function describeDial(
  value: number,
  max: number,
  label?: string,
  delta?: number | null,
  deltaLabel?: string,
): string {
  const parts = [`${label ? `${label}: ` : ""}${value} out of ${max}`];
  if (delta !== undefined && delta !== null) {
    const movement =
      delta > 0
        ? `up ${delta}`
        : delta < 0
          ? `down ${Math.abs(delta)}`
          : "no change";
    parts.push(deltaLabel ? `${movement} ${deltaLabel}` : movement);
  }
  return parts.join(", ");
}

export { DIAL_CIRCUMFERENCE };
