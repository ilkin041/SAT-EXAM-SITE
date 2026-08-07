"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn, composeRefs } from "@/lib/utils";

/**
 * Sheet — a Dialog that arrives from an edge (T1.5).
 *
 * Same Radix Dialog underneath as `Modal`, and therefore the same guarantees:
 * focus trapped inside and restored to the trigger on close, `aria-modal`, and
 * the page behind it frozen — Radix locks the body's scroll while the sheet is
 * open, so nothing scrolls underneath a swipe that misses.
 *
 * What differs is the shape and the gesture. `side="bottom"` is the phone
 * pattern — filters, an action list, anything reached by thumb — and
 * `side="right"` the desktop one, for a detail pane beside a table. Both drag
 * to dismiss under a finger.
 *
 * The drag is touch-only on purpose. Following a mouse would fight text
 * selection inside the panel for a gesture nobody performs with a mouse, and
 * a pointer capture that intercepts drags would break selecting a sentence in
 * the sheet's own body.
 */

const sheetContentVariants = cva(
  [
    "fixed z-50 flex flex-col border bg-card text-card-foreground shadow-elevated-lg",
    "focus:outline-none",
  ].join(" "),
  {
    variants: {
      side: {
        bottom: [
          "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-border",
          // The home-indicator strip on a modern phone sits over the last
          // ~34px of an edge-anchored sheet. `max()` keeps the normal padding
          // on every device that reports no inset.
          "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          "data-[state=open]:animate-slide-up",
        ].join(" "),
        right: [
          "inset-y-0 right-0 w-full max-w-md border-border",
          "pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]",
          "data-[state=open]:animate-fade-in",
        ].join(" "),
      },
    },
    defaultVariants: { side: "bottom" },
  },
);

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

/** Past this much of the panel's own length, the release dismisses. */
const DISMISS_RATIO = 0.35;
/** …or past this speed, however short the drag. A flick should close. */
const DISMISS_VELOCITY = 0.5; // px per ms

export interface SheetContentProps
  extends Omit<
      React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
      "title"
    >,
    VariantProps<typeof sheetContentVariants> {
  /** The sheet's accessible name. Required, as on `Modal`. */
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Hides the title visually while keeping it for assistive tech. For a
   *  sheet whose content is self-evident and whose header would waste the
   *  little vertical room a phone has. */
  hideTitle?: boolean;
  closeLabel?: string;
}

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(
  (
    {
      className,
      side = "bottom",
      title,
      description,
      hideTitle,
      closeLabel = "Close",
      children,
      ...props
    },
    ref,
  ) => {
    const panelRef = React.useRef<HTMLDivElement | null>(null);
    /**
     * The dismiss path goes through a real `<Dialog.Close>` rather than a
     * state setter: `SheetContent` never sees the `open` prop — it may not
     * exist at all, since Radix supports an uncontrolled Root — and Close is
     * the one exit that works whether the caller controls the sheet or not.
     */
    const closeRef = React.useRef<HTMLButtonElement | null>(null);
    const drag = React.useRef<{ start: number; last: number; at: number } | null>(
      null,
    );
    const [offset, setOffset] = React.useState(0);
    const [dragging, setDragging] = React.useState(false);

    const axis = side === "bottom" ? "y" : "x";

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "touch") return;
      const position = axis === "y" ? event.clientY : event.clientX;
      drag.current = { start: position, last: position, at: event.timeStamp };
      setDragging(true);
      // Keeps the moves coming even once the finger has travelled off the
      // header and over the body. Guarded because capture throws for a
      // pointer id the browser no longer considers active — a finger lifted
      // between the event firing and this line, which happens.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* the drag still works, it just ends when the finger leaves */
      }
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drag.current) return;
      const position = axis === "y" ? event.clientY : event.clientX;
      drag.current.last = position;
      drag.current.at = event.timeStamp;
      // Only towards the edge it came from. Dragging the other way would lift
      // the sheet off its anchor and expose the page behind it.
      setOffset(Math.max(0, position - drag.current.start));
    };

    const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
      const state = drag.current;
      drag.current = null;
      setDragging(false);
      if (!state) return;
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        /* already released with the pointer */
      }

      const travelled = Math.max(0, state.last - state.start);
      const panel = panelRef.current;
      const length = panel
        ? axis === "y"
          ? panel.offsetHeight
          : panel.offsetWidth
        : 0;
      const elapsed = Math.max(1, event.timeStamp - state.at + 16);
      const velocity = travelled / elapsed;

      // Reset either way. On dismissal Radix unmounts the panel and the next
      // open starts at rest; on a short drag it springs back.
      setOffset(0);
      if (
        (length > 0 && travelled > length * DISMISS_RATIO) ||
        velocity > DISMISS_VELOCITY
      ) {
        closeRef.current?.click();
      }
    };

    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          // Measured for the dismiss threshold, so it has to be the element
          // that has a height — an intermediate `display: contents` wrapper
          // reports 0 and every drag would read as past the threshold.
          ref={composeRefs(ref, panelRef)}
          className={cn(
            sheetContentVariants({ side }),
            // While a finger is down the panel tracks it exactly; on release
            // it animates back or out. A transition during the drag would lag
            // the finger by its own duration.
            !dragging && "transition-transform duration-200",
            className,
          )}
          style={
            offset
              ? {
                  transform:
                    axis === "y"
                      ? `translateY(${offset}px)`
                      : `translateX(${offset}px)`,
                }
              : undefined
          }
          {...props}
        >
          <div
            // The whole header is the grab area, not just the pill: a 4px bar
            // is under the 44px touch minimum, and a header is the part of a
            // sheet a thumb naturally lands on. `touch-none` stops the browser
            // claiming the vertical drag for a scroll before the handler sees
            // a single move event.
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={cn(
              "shrink-0 touch-none select-none px-6 pb-4",
              side === "bottom" ? "pt-2" : "pt-5",
            )}
          >
            {side === "bottom" ? (
              <div
                className="mx-auto mb-3 h-1 w-10 rounded-full bg-border"
                aria-hidden
              />
            ) : null}
            <div className="min-w-0 pr-10">
              <DialogPrimitive.Title
                className={cn("text-h3 text-ink", hideTitle && "sr-only")}
              >
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description
                  className={cn(
                    "mt-1.5 text-body text-muted-foreground",
                    hideTitle && "sr-only",
                  )}
                >
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
          </div>

          {children}

          <DialogPrimitive.Close
            ref={closeRef}
            aria-label={closeLabel}
            className={cn(
              "absolute right-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              side === "bottom" ? "top-5" : "top-4",
            )}
          >
            <X className="h-4 w-4" aria-hidden />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  },
);
SheetContent.displayName = "SheetContent";

/** The scrolling region. The header and any footer stay put around it. */
export const SheetBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-2 text-body",
      className,
    )}
    {...props}
  />
));
SheetBody.displayName = "SheetBody";

export const SheetFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex shrink-0 flex-col-reverse gap-2 border-t border-border px-6 pb-2 pt-4 sm:flex-row sm:justify-end",
      className,
    )}
    {...props}
  />
));
SheetFooter.displayName = "SheetFooter";

export { sheetContentVariants };
