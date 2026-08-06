import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Loading placeholder box. Token-driven (`bg-muted`), so it follows the
 * theme in both light and dark.
 *
 * The pulse is decorative: `motion-reduce:animate-none` stops it outright
 * rather than relying on the global reduced-motion block, which only clamps
 * iteration count and would leave the box mid-ramp on some engines.
 *
 * Always `aria-hidden` — the surrounding `loading.tsx` owns the announcement
 * via `role="status"`, so the shapes themselves stay out of the a11y tree.
 *
 * Sizing is the caller's job: give every skeleton the same box as the real
 * content it stands in for, or the swap will shift layout.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-muted motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of lines to draw. */
  lines?: number;
  /** Tailwind width class for the final line, which is usually short. */
  lastLineWidth?: string;
  /** Tailwind height class per line — match the real text's line box. */
  lineHeight?: string;
}

/**
 * A paragraph's worth of lines. The last line is narrowed so the block reads
 * as prose rather than a solid slab.
 */
export function SkeletonText({
  lines = 3,
  lastLineWidth = "w-2/3",
  lineHeight = "h-4",
  className,
  ...props
}: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(lineHeight, i === lines - 1 ? lastLineWidth : "w-full")}
        />
      ))}
    </div>
  );
}

interface SkeletonTableProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Column count — drives one cell placeholder per column, per row. */
  columns: number;
  rows?: number;
  /** Per-column width classes, in order. Falls back to `w-24`. */
  columnWidths?: string[];
}

/**
 * Table shell used by the list routes: rounded card, muted header strip,
 * divided rows. Row height comes from `px-6 py-4` cells plus an `h-4`
 * placeholder — the same 57px row the real tables render.
 */
export function SkeletonTable({
  columns,
  rows = 6,
  columnWidths,
  className,
  ...props
}: SkeletonTableProps) {
  const widthFor = (i: number) => columnWidths?.[i] ?? "w-24";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-4 border-b border-border bg-muted/40 px-6 py-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className={cn("h-3", widthFor(i))} />
        ))}
      </div>
      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-6 py-4">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className={cn("h-4", widthFor(c))} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Wrapper every `loading.tsx` uses. Announces once to assistive tech and
 * hides the shapes; `label` should name the surface ("Loading dashboard").
 */
export function SkeletonScreen({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
