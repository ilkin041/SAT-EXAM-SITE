import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  hint?: string;
  className?: string;
  /** Optional accent color for the icon swatch — defaults to primary */
  accentColor?: "primary" | "blue" | "violet" | "emerald" | "amber";
}

const iconSwatchColors = {
  primary:
    "bg-primary/10 text-primary dark:bg-primary/20",
  blue:
    "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
  violet:
    "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
  emerald:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  amber:
    "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
};

/**
 * Dashboard stat tile — glassmorphism surface with label, large value,
 * optional hint, and a color-tinted icon swatch. Lifts on hover with
 * a subtle glow.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  className,
  accentColor = "primary",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/80 bg-card p-5 shadow-card",
        "transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5",
        className,
      )}
    >
      {/* Subtle gradient shimmer on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(135deg, transparent 40%, hsla(228, 60%, 50%, 0.03) 50%, transparent 60%)",
        }}
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-3xl font-bold tabular-nums tracking-tight">
            {value}
          </div>
          {hint && (
            <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "shrink-0 rounded-xl p-2.5 transition-transform duration-200 group-hover:scale-110",
              iconSwatchColors[accentColor],
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        )}
      </div>
    </div>
  );
}
