import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  hint?: string;
  className?: string;
}

/**
 * Dashboard stat tile. Label on top, large value below, optional small hint
 * line, and an optional icon swatch tinted with the primary color.
 */
export function StatCard({ label, value, icon: Icon, hint, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-card transition-shadow duration-150 hover:shadow-elevated",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {Icon && (
          <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        )}
      </div>
    </div>
  );
}
