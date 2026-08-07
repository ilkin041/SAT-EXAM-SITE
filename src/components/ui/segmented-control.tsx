"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SegmentedControl — pick one of a few, all of them visible (T1.5).
 *
 * The distinction from the neighbours it will sit next to:
 *
 *  - `Select` hides the options. Use it when there are many, or when the
 *    choices are data rather than modes.
 *  - `Tabs` switches which panel is shown, and each tab owns a `tabpanel`.
 *  - `SegmentedControl` sets a *value* — a filter, a unit, a range. Nothing
 *    below it is a panel; the same view re-renders with different numbers.
 *
 * That is why this is a `radiogroup` and not a tablist, and why it is
 * hand-rolled rather than Radix ToggleGroup: the roles differ, and a
 * radiogroup's keyboard contract is small enough to own outright.
 *
 * Keyboard: arrows move *and* select (a radiogroup's arrows are not a cursor),
 * Home/End go to the ends, and the group holds one tab stop — Tab enters at
 * the selected option and leaves the group entirely, rather than walking every
 * segment. Disabled options are skipped by the arrows, not stepped onto.
 *
 * Two to four options. Beyond that the labels shrink past reading size at
 * 360px, and the answer is a `Select`.
 */

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Announced instead of `label` when the label is a glyph or an
   *  abbreviation — "Reading and Writing" for a segment reading "R&W". */
  srLabel?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  /** Names the group for a screen reader. Required — a bare radiogroup
   *  announces its options with nothing to say what they choose between. */
  label: string;
  options: SegmentedControlOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  size?: "sm" | "default";
  /** Fills the container and splits it evenly. Off by default: a segmented
   *  control sized to its labels reads as a control, one stretched across a
   *  page reads as navigation. */
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onValueChange,
  size = "default",
  fullWidth = false,
  className,
}: SegmentedControlProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = React.useState<{
    left: number;
    width: number;
  } | null>(null);

  const selectedIndex = options.findIndex((option) => option.value === value);

  /**
   * The indicator is one element that moves, not a background on the active
   * segment, so the travel between segments is visible and the label above it
   * never repaints. Its geometry can only come from layout, hence the effect:
   * it re-measures on selection, on `options` changing, and on resize, because
   * the segments are text-sized and a container query away from a different
   * width.
   */
  React.useLayoutEffect(() => {
    const node = refs.current[selectedIndex];
    if (!node) {
      setIndicator(null);
      return;
    }
    const measure = () =>
      setIndicator({ left: node.offsetLeft, width: node.offsetWidth });
    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    // The parent, not the segment: a segment can keep its own width while the
    // ones before it reflow and change where this one starts.
    if (node.parentElement) observer.observe(node.parentElement);
    return () => observer.disconnect();
  }, [selectedIndex, options]);

  function focusAndSelect(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    refs.current[index]?.focus();
    onValueChange(option.value);
  }

  /** Next enabled option in `step` direction, wrapping. Returns -1 if the
   *  group has no other enabled option to move to. */
  function nextEnabled(from: number, step: number) {
    for (let i = 1; i <= options.length; i++) {
      const index = (from + step * i + options.length * i) % options.length;
      if (!options[index]?.disabled) return index;
    }
    return -1;
  }

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    let target = -1;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        target = nextEnabled(index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        target = nextEnabled(index, -1);
        break;
      case "Home":
        target = nextEnabled(-1, 1);
        break;
      case "End":
        target = nextEnabled(options.length, -1);
        break;
      default:
        return;
    }
    if (target === -1) return;
    // Only now: an unhandled key must keep its default (Tab, typing, shortcuts).
    event.preventDefault();
    focusAndSelect(target);
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative inline-flex items-center rounded-lg border border-border bg-paper-sunk p-1",
        fullWidth && "flex w-full",
        className,
      )}
    >
      {indicator ? (
        <span
          aria-hidden
          // Geometry only. The global reduced-motion block flattens the
          // transition to 0.01ms, so the indicator jumps instead of sliding
          // and nothing else about the control changes.
          className="pointer-events-none absolute bottom-1 left-0 top-1 rounded-md bg-card shadow-sm transition-all duration-200"
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width,
          }}
        />
      ) : null}

      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.srLabel}
            disabled={option.disabled}
            // One tab stop for the group. When nothing matches `value` the
            // first option holds it, so the group is never unreachable.
            tabIndex={selected || (selectedIndex === -1 && index === 0) ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "relative z-10 whitespace-nowrap rounded-md font-semibold transition-colors duration-150",
              "disabled:pointer-events-none disabled:opacity-40",
              size === "sm" ? "px-2.5 py-1 text-caption" : "px-3.5 py-1.5 text-body",
              fullWidth && "flex-1",
              selected
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
