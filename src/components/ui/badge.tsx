import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Rounded-pill badge for statuses, difficulty levels, type tags, etc.
 * Color-coded variants map to common categorical meanings; use `outline`
 * or `muted` when you want a neutral chip.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border bg-card text-foreground",
        muted: "border-border bg-muted text-muted-foreground",
        success:
          "border-green-500/30 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300",
        warning:
          "border-amber-500/30 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
        info: "border-blue-500/30 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
        purple:
          "border-purple-500/30 bg-purple-50 text-purple-800 dark:bg-purple-950/30 dark:text-purple-300",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive",
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
