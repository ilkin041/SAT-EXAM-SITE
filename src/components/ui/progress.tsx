import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Progress — the product's one horizontal meter (T1.7).
 *
 * Six copies of `h-2 overflow-hidden rounded-full bg-muted` with a `style`
 * width existed before this, three of them on the results page alone, and they
 * had already drifted apart on the track's opacity. One component, one track.
 *
 * **`tone="graded"` is the default and it is a judgement, not decoration.** A
 * bar that says 40% should not look like a bar that says 90%, so the fill is
 * derived from the percentage: emerald ≥75, blue ≥50, amber ≥25, red below.
 * Those four cuts come from the results page's domain breakdown and are now the
 * product's grading scale everywhere — `gradeOf()` is the single place they
 * live. The bands are deliberately not the same colours as *difficulty*
 * (emerald/amber/red for easy/medium/hard), which is why a difficulty bar
 * passes `barClassName` rather than being a tone: same shape, different
 * meaning, and encoding one in the other would make a hard question look wrong.
 *
 * **`barClassName` is the escape hatch and it exists for gradients.** The two
 * section-score bars on the results page carry `--gradient-primary` and
 * `--gradient-accent`. Neither is this component's to assign — `--gradient-accent`
 * is explicitly unassigned in CLAUDE.md and the per-page gradient budget belongs
 * to T1.8 — so those two call sites keep passing their own fill and T1.8 gets to
 * decide without editing a primitive.
 *
 * **A bar with no `label` is `aria-hidden`.** The overwhelming case here is a
 * meter sitting directly under text that already reads "12 / 15 · 80%", and a
 * screen reader announcing the same quantity twice is worse than not announcing
 * it. Pass `label` when the bar is the only place the number appears; it then
 * becomes a real `role="progressbar"`.
 *
 * `variant="scoreBand"` is the second shape: the same fill drawn against a
 * labelled scale with tick marks, for a value whose floor is not zero. It takes
 * `min`, so it reads 200–1600 for a total and 200–800 for a section, and an
 * optional `target` marker for a goal score.
 */

export type ProgressGrade = "high" | "mid" | "low" | "critical";

/**
 * The grading scale. Cuts match the results page's domain breakdown, which is
 * where they were invented; every graded bar in the product now reads from
 * here. Pinned by `tests/ui-primitives.test.ts` — moving a cut re-colours
 * history, because no score is stored and every bar is recomputed on render.
 */
export function gradeOf(pct: number): ProgressGrade {
  if (pct >= 75) return "high";
  if (pct >= 50) return "mid";
  if (pct >= 25) return "low";
  return "critical";
}

const trackVariants = cva("w-full overflow-hidden rounded-full bg-muted/65", {
  variants: {
    size: { sm: "h-1.5", md: "h-2", lg: "h-3" },
  },
  defaultVariants: { size: "md" },
});

const fillVariants = cva("h-full rounded-full transition-all duration-500", {
  variants: {
    fill: {
      high: "bg-emerald-500",
      mid: "bg-blue-500",
      low: "bg-amber-500",
      critical: "bg-destructive",
      primary: "bg-primary",
      neutral: "bg-muted-foreground/40",
    },
  },
  defaultVariants: { fill: "primary" },
});

export interface ProgressProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof trackVariants> {
  value: number;
  /** Floor of the scale. Non-zero is what `scoreBand` is for. */
  min?: number;
  max?: number;
  /** `graded` derives the fill from the percentage. */
  tone?: "graded" | "primary" | "neutral";
  /** Overrides the fill entirely. For gradients and for difficulty colours. */
  barClassName?: string;
  /** Makes the bar a `progressbar`. Omit when the number is already on screen. */
  label?: string;
  variant?: "bar" | "scoreBand";
  /** `scoreBand` only — a goal score, drawn as a marker on the scale. */
  target?: number;
  /** Caption under the target marker. */
  targetLabel?: string;
}

export function Progress({
  value,
  min = 0,
  max = 100,
  size,
  tone = "graded",
  barClassName,
  label,
  variant = "bar",
  target,
  targetLabel,
  className,
  ...props
}: ProgressProps) {
  const pct = percentOf(value, min, max);
  const fill =
    tone === "graded" ? gradeOf(pct) : tone === "neutral" ? "neutral" : "primary";
  const targetPct =
    variant === "scoreBand" && target !== undefined
      ? percentOf(target, min, max)
      : null;

  const meter = (
    <div className={cn(trackVariants({ size }), "relative")}>
      <div
        className={cn(fillVariants({ fill }), barClassName)}
        style={{ width: `${pct}%` }}
      />
      {targetPct !== null && (
        // Inside the track so it reads against both the fill and the empty
        // remainder. The track clips it, which costs half a pixel at the ends
        // and buys a marker that cannot widen the page.
        <span
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-ink"
          style={{ left: `${targetPct}%` }}
          aria-hidden
        />
      )}
    </div>
  );

  const a11y = label
    ? ({
        role: "progressbar",
        "aria-label": label,
        "aria-valuenow": value,
        "aria-valuemin": min,
        "aria-valuemax": max,
      } as const)
    : ({ "aria-hidden": true } as const);

  if (variant !== "scoreBand") {
    return (
      <div className={cn("w-full", className)} {...a11y} {...props}>
        {meter}
      </div>
    );
  }

  const ticks = scoreBandTicks(min, max);

  return (
    <div className={cn("w-full", className)} {...a11y} {...props}>
      {meter}

      {/* Ruler. `overflow-hidden` because the marks are centred on their own
          position, so the two at the ends hang half a pixel outside. */}
      <div className="relative mt-1 h-1.5 overflow-hidden" aria-hidden>
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute top-0 w-px -translate-x-1/2 bg-border"
            style={{ left: `${percentOf(tick, min, max)}%`, height: "100%" }}
          />
        ))}
      </div>

      {/* Three labels, never more: eight of them at 11px do not fit 360px, and
          a scale only needs its ends and its middle to be readable. */}
      <div className="mt-1 flex items-baseline justify-between" aria-hidden>
        <span className="eyebrow tabular text-muted-foreground">{min}</span>
        <span className="eyebrow tabular text-muted-foreground">
          {midpointOf(min, max)}
        </span>
        <span className="eyebrow tabular text-muted-foreground">{max}</span>
      </div>

      {targetPct !== null && targetLabel && (
        // Anchored, not centred, near the ends: a centred label at 3% hangs off
        // the left edge, and a clipped goal is worse than an off-centre one.
        <div className="relative mt-1 h-4" aria-hidden>
          <span
            className={cn(
              "absolute top-0 whitespace-nowrap text-caption font-semibold text-ink",
              targetPct >= 15 && targetPct <= 85 && "-translate-x-1/2",
            )}
            style={
              targetPct > 85
                ? { right: `${100 - targetPct}%` }
                : { left: `${Math.max(0, targetPct)}%` }
            }
          >
            {targetLabel}
          </span>
        </div>
      )}
    </div>
  );
}

/** Clamped 0–100. A value under `min` is an empty bar, not a negative width. */
export function percentOf(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const raw = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function midpointOf(min: number, max: number): number {
  return Math.round((min + max) / 2);
}

const TICK_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];

/**
 * Tick positions for a score band. The step is the smallest round number that
 * divides the span into at most eight intervals, so 200–1600 rules every 200
 * and 200–800 rules every 100. `max` is always the last tick even when the span
 * does not divide evenly — a ruler that stops short of its own label is wrong.
 */
export function scoreBandTicks(min: number, max: number): number[] {
  if (max <= min) return [min];
  const span = max - min;
  const step = TICK_STEPS.find((s) => span / s <= 8) ?? span;

  const ticks: number[] = [];
  for (let v = min; v < max; v += step) ticks.push(v);
  ticks.push(max);
  return ticks;
}
