"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Modal — the app's one dialog (T1.5). Replaces three hand-rolled ones.
 *
 * Radix Dialog brings what the hand-rolled versions did not: focus moved into
 * the panel on open and returned to the trigger on close, a real focus trap,
 * `aria-modal` plus the title/description wiring, and the body frozen behind
 * the overlay. `delete-question-modal.tsx` had none of it — Esc was a manual
 * `window` listener and Tab walked straight out into the page underneath.
 *
 * The layout is fixed on purpose: header, scrolling body, footer, as a three-row
 * grid capped at 85vh. A long modal scrolls its *body*, so the title stays
 * readable and the confirm button stays reachable without scrolling to the
 * bottom of a list first — which is exactly the delete-question case.
 *
 *   <Modal open={open} onOpenChange={setOpen}>
 *     <ModalTrigger asChild><Button>Delete</Button></ModalTrigger>
 *     <ModalContent variant="destructive" title="Delete this question?">
 *       <ModalBody>…</ModalBody>
 *       <ModalFooter>…</ModalFooter>
 *     </ModalContent>
 *   </Modal>
 *
 * `title` is a required prop rather than a child slot because Radix warns —
 * correctly — when a dialog has no accessible name, and a slot is a rule you
 * can forget. Pass `description` for the sentence under it; anything longer
 * belongs in `<ModalBody>`.
 */

const modalContentVariants = cva(
  [
    // `calc(100% - 2rem)` rather than `w-full`: a fixed, centre-translated
    // panel has no margin to collapse against, so at 360px `w-full` put the
    // rounded corners flush with both screen edges. This keeps the same 16px
    // gutter the `full` size already had, and does nothing above `max-w`.
    "fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2",
    // Three rows: header and footer size to content, the body takes the rest.
    // `minmax(0,1fr)` and not `1fr` — a grid row's default `min-height: auto`
    // refuses to shrink below its content, so `overflow-y-auto` on the body
    // would never engage and the whole panel would grow past the cap instead.
    "grid-rows-[auto_minmax(0,1fr)_auto] max-h-[85vh] overflow-hidden",
    "rounded-2xl border bg-card text-card-foreground shadow-elevated-lg",
    "focus:outline-none",
    // Enter only, for the same reason SelectContent animates one way: Radix
    // keeps the panel mounted until an exit animation reports `animationend`,
    // and a backgrounded tab never fires one.
    "data-[state=open]:animate-scale-in",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "max-w-sm",
        default: "max-w-md",
        lg: "max-w-2xl",
        // Not `w-screen h-screen`: an edge-to-edge sheet on a desktop monitor
        // is a worse dialog, not a bigger one. This is "as large as the
        // viewport allows, with the overlay still visible around it".
        full: "h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)]",
      },
      variant: {
        default: "border-border",
        destructive: "border-destructive/30",
      },
    },
    defaultVariants: { size: "default", variant: "default" },
  },
);

export const Modal = DialogPrimitive.Root;
export const ModalTrigger = DialogPrimitive.Trigger;
export const ModalClose = DialogPrimitive.Close;

export interface ModalContentProps
  extends Omit<
      React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
      "title"
    >,
    VariantProps<typeof modalContentVariants> {
  /** The dialog's accessible name. Required — Radix warns without one. */
  title: React.ReactNode;
  /** One sentence under the title. Longer copy goes in `<ModalBody>`. */
  description?: React.ReactNode;
  /**
   * `false` removes every ambient way out — Esc, click-outside and the ✕ — so
   * the only exits are the buttons in the footer. For flows where dismissing
   * loses something unrecoverable: mid-request, or a one-time secret on
   * screen. Do not use it to make a message harder to ignore.
   */
  dismissable?: boolean;
  /** Accessible name for the ✕. */
  closeLabel?: string;
}

export const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ModalContentProps
>(
  (
    {
      className,
      size,
      variant,
      title,
      description,
      dismissable = true,
      closeLabel = "Close",
      children,
      ...props
    },
    ref,
  ) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        ref={ref}
        onEscapeKeyDown={(event) => {
          if (!dismissable) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (!dismissable) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (!dismissable) event.preventDefault();
        }}
        className={cn(modalContentVariants({ size, variant }), className)}
        {...props}
      >
        <div
          className={cn(
            "flex items-start gap-3 border-b px-6 py-5",
            variant === "destructive"
              ? "border-destructive/20"
              : "border-border",
            // Leaves room for the ✕, which is absolutely positioned so a long
            // title wraps under it rather than beside it.
            dismissable && "pr-14",
          )}
        >
          {variant === "destructive" ? (
            <span
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
              aria-hidden
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <DialogPrimitive.Title className="text-h3 text-ink">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1.5 text-body text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
        </div>

        {children}

        {dismissable ? (
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  ),
);
ModalContent.displayName = "ModalContent";

/**
 * The scrolling middle row. Always render one, even for two lines of text:
 * it owns the panel's horizontal padding, and without it the grid's second
 * row collapses and the footer sits flush against the header.
 */
export const ModalBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("overflow-y-auto px-6 py-5 text-body", className)}
    {...props}
  />
));
ModalBody.displayName = "ModalBody";

/**
 * Actions row. Stacks on a narrow phone with the primary action on top —
 * reversed source order, so the DOM (and therefore Tab) still reads
 * cancel-then-confirm.
 */
export const ModalFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col-reverse gap-2 border-t border-border bg-paper-sunk/50 px-6 py-4 sm:flex-row sm:justify-end",
      className,
    )}
    {...props}
  />
));
ModalFooter.displayName = "ModalFooter";

export { modalContentVariants };
