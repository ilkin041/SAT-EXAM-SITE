import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Standard text input — 40px tall to match Button's default size.
 * Features an inner shadow for depth, smooth focus ring animation,
 * and refined placeholder styling.
 */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-10 w-full rounded-lg border border-input bg-card px-3.5 py-2 text-sm shadow-inner-sm",
      "transition-all duration-200",
      "file:border-0 file:bg-transparent file:text-sm file:font-medium",
      "placeholder:text-muted-foreground/60",
      "hover:border-ring/40",
      "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
