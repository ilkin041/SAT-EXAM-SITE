import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Rounded-pill badge for statuses, difficulty levels, type tags, etc.
 * Color-coded variants map to common categorical meanings; use `outline`
 * or `muted` when you want a neutral chip.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        outline:
          "border-border bg-card text-foreground shadow-sm",
        muted:
          "border-border/60 bg-muted/80 text-muted-foreground",
        success:
          "border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-300",
        warning:
          "border-amber-500/20 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-950/40 dark:text-amber-200",
        info:
          "border-blue-500/20 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-950/40 dark:text-blue-300",
        purple:
          "border-violet-500/20 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-950/40 dark:text-violet-300",
        destructive:
          "border-red-500/20 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-950/40 dark:text-red-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
