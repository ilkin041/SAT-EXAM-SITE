import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Standard text input — 40px tall to match Button's default size.
 * Features an inner shadow for depth, smooth focus ring animation,
 * and refined placeholder styling.
 *
 * There is still no error *variant*: the invalid treatment hangs off
 * `aria-invalid` instead, so the attribute a screen reader needs is the same
 * one that turns the border red and nothing can set one without the other.
 * `Field` (T1.6) sets it from its `error` prop; a bare `<Input aria-invalid>`
 * gets the same look.
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
      // No `outline-none` here: the border swap plus a 20%-opacity ring is not
      // a 3:1 indicator on its own, so the input keeps the global
      // `:focus-visible` outline from globals.css and layers this underneath.
      "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0",
      "aria-[invalid=true]:border-destructive aria-[invalid=true]:hover:border-destructive",
      "aria-[invalid=true]:focus-visible:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/25",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
