import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Alert — a standing message about the surface it sits on (T1.5).
 *
 * Not a toast: a toast is transient and self-dismissing, an Alert stays until
 * the condition it describes goes away. Use it for form-level errors, "this
 * attempt is still in progress" notices, and empty-with-a-caveat states.
 *
 * Two things worth knowing before using it:
 *
 * 1. **It is not a live region by default.** A `role="status"` on every
 *    informational panel means a screen reader reads the whole page's asides
 *    on load. Pass `live` only when the alert *appears in response to
 *    something the user just did* — a failed save, a completed import. Then
 *    the role follows the variant: `alert` for destructive/warning (assertive,
 *    interrupts), `status` for info/success (polite).
 * 2. **The icon is decorative.** Status is carried by the title text, never by
 *    colour or glyph alone, so the icon is `aria-hidden` and the copy has to
 *    stand on its own. "Import failed", not "Something went wrong" next to a
 *    red circle.
 */
const alertVariants = cva(
  "flex w-full gap-3 rounded-lg border p-4 text-left",
  {
    variants: {
      variant: {
        info: "border-primary/25 bg-primary/[0.07] text-foreground",
        success: "border-success/30 bg-success/10 text-foreground",
        warning: "border-warning/35 bg-warning/10 text-foreground",
        destructive: "border-destructive/30 bg-destructive/10 text-foreground",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

/**
 * The icon tints, not the body. Body copy stays `foreground` in every variant
 * so a two-line explanation is read as prose rather than as more status.
 */
const alertIconVariants = cva("h-5 w-5 shrink-0", {
  variants: {
    variant: {
      info: "text-primary",
      success: "text-success",
      warning: "text-warning",
      destructive: "text-destructive",
    },
  },
  defaultVariants: { variant: "info" },
});

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>;

const DEFAULT_ICONS: Record<AlertVariant, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: XCircle,
};

export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof alertVariants> {
  /** Short and specific. Omit for a one-line alert with body copy only. */
  title?: React.ReactNode;
  /**
   * Replaces the variant's default glyph. Pass `null` for no icon — worth it
   * when the alert sits in a column of them and the icons become a texture.
   */
  icon?: React.ReactNode;
  /** Buttons or links. Rendered under the body, left-aligned with it. */
  action?: React.ReactNode;
  /** Announce this on appearance. See the note above before switching it on. */
  live?: boolean;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    { className, variant, title, icon, action, live, children, ...props },
    ref,
  ) => {
    const resolved: AlertVariant = variant ?? "info";
    const Icon = DEFAULT_ICONS[resolved];
    const assertive = resolved === "destructive" || resolved === "warning";

    return (
      <div
        ref={ref}
        role={live ? (assertive ? "alert" : "status") : undefined}
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {icon === null ? null : (
          <span className={alertIconVariants({ variant })} aria-hidden>
            {icon ?? <Icon className="h-5 w-5" />}
          </span>
        )}

        <div className="min-w-0 flex-1">
          {title ? (
            <p className="text-body font-semibold text-foreground">{title}</p>
          ) : null}
          {children ? (
            <div
              className={cn(
                "text-caption text-muted-foreground",
                title && "mt-1",
              )}
            >
              {children}
            </div>
          ) : null}
          {action ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {action}
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);
Alert.displayName = "Alert";

export { alertVariants };
