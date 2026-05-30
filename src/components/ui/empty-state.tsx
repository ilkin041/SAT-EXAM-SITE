import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Used wherever a list/table can be empty. Friendly illustration-style
 * icon with a soft gradient background ring, focused messaging, and
 * an optional CTA action slot.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/70 bg-gradient-to-br from-card/80 to-muted/30 px-6 py-16 text-center",
        className,
      )}
    >
      {/* Decorative background pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />

      {Icon && (
        <div className="relative mb-5">
          {/* Soft glow behind icon */}
          <div className="absolute inset-0 scale-150 rounded-full bg-primary/5 blur-xl" aria-hidden />
          <div className="relative rounded-2xl bg-muted/80 p-4 text-muted-foreground shadow-sm">
            <Icon className="h-7 w-7" aria-hidden />
          </div>
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
