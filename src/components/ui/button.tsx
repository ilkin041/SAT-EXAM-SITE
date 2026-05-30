import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared button primitive. Use this everywhere instead of hand-rolling
 * classes on <button>/<Link> tags.
 *
 *  - `variant`: visual treatment
 *  - `size`: vertical rhythm (h-9 / h-10 / h-11 / icon)
 *  - `loading`: shows spinner and disables the button (button mode only —
 *    ignored with `asChild`, since wrapping a Link in a spinner doesn't make
 *    semantic sense and Slot requires exactly one child)
 *  - `asChild`: render the next child as the root (e.g. wrap a <Link>)
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold",
    "transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "bg-primary text-primary-foreground shadow-md",
          "hover:bg-primary/90 hover:shadow-glow hover:-translate-y-0.5",
        ].join(" "),
        secondary: [
          "border border-border bg-card text-foreground shadow-sm",
          "hover:bg-accent hover:text-accent-foreground hover:border-border/80 hover:shadow-md hover:-translate-y-0.5",
        ].join(" "),
        destructive: [
          "bg-destructive text-destructive-foreground shadow-md",
          "hover:bg-destructive/90 hover:shadow-lg hover:-translate-y-0.5",
        ].join(" "),
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        accent: [
          "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md",
          "hover:from-indigo-600 hover:to-violet-600 hover:shadow-glow-accent hover:-translate-y-0.5",
        ].join(" "),
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        default: "h-10 px-5",
        lg: "h-11 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const classes = cn(buttonVariants({ variant, size }), className);

    // When wrapping another element (e.g. <Link>) we MUST pass a single child
    // to Slot. Skip the spinner in this branch — `loading` is button-only.
    if (asChild) {
      return (
        <Slot ref={ref} className={classes} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
