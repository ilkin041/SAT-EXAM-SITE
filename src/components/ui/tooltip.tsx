"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn, composeRefs } from "@/lib/utils";

/**
 * Tooltip — a short label for a control that cannot say it in place (T1.5).
 *
 * The rule that comes with it: a tooltip is **supplementary**. Nothing may
 * exist only inside one. If the sentence is required to use the control, it
 * belongs on the page. `test-card.tsx` used the native `title` attribute for
 * "what ADAPTIVE means", which is the right *kind* of content and the wrong
 * mechanism — `title` has no keyboard path, no touch path, a ~1s delay nobody
 * can tune, and a rendering the OS owns.
 *
 * Two problems this wrapper solves over a bare Radix re-export:
 *
 * 1. **Touch.** Radix Tooltip is hover-and-focus only by design; on a phone
 *    there is no hover, and its pointer handling actively closes on
 *    `pointerdown`, so a tap shows nothing. Here the trigger records the
 *    pointer type, and when it was `touch` the tooltip becomes a plain
 *    tap-to-toggle: Radix's own open requests are ignored for that gesture
 *    (they would fight the toggle — `pointerdown` closes, `click` opens, and
 *    it could never be tapped shut again) and the tooltip closes on Esc or on
 *    a tap anywhere outside. Pointer type is read per gesture rather than from
 *    `(hover: none)` so a laptop with a touchscreen behaves correctly on both
 *    inputs instead of picking one at mount.
 *
 * 2. **Disabled triggers.** A `disabled` button fires no pointer events and
 *    takes no focus, so a tooltip on one never opens — and a disabled control
 *    is exactly when "why is this off?" needs answering. `<TooltipTrigger
 *    disabled>` wraps the child in a focusable span and makes the child inert,
 *    so hover, focus and tap all land on the wrapper.
 *
 * The provider is built in, so a tooltip works anywhere without a layout
 * change — which matters when every `layout.tsx` here is a server component.
 * Wrap a *group* in `<TooltipProvider>` when you want them to share the
 * skip-delay window, e.g. a row of icon buttons in a toolbar.
 */

interface TooltipContextValue {
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /** True while the current gesture came from a finger. */
  touch: React.MutableRefObject<boolean>;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function useTooltipContext(component: string): TooltipContextValue {
  const context = React.useContext(TooltipContext);
  if (!context) {
    throw new Error(`<${component}> must be rendered inside a <Tooltip>.`);
  }
  return context;
}

export const TooltipProvider = TooltipPrimitive.Provider;

export interface TooltipProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>,
    "open" | "defaultOpen" | "onOpenChange"
  > {
  /** Long enough not to fire while crossing the control, short enough to feel
   *  like a property of it. */
  delayDuration?: number;
}

export function Tooltip({
  delayDuration = 300,
  children,
  ...props
}: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const touch = React.useRef(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  const context = React.useMemo<TooltipContextValue>(
    () => ({
      setOpen,
      toggle: () => setOpen((current) => !current),
      touch,
      triggerRef,
    }),
    [],
  );

  return (
    <TooltipContext.Provider value={context}>
      <TooltipPrimitive.Provider delayDuration={delayDuration}>
        <TooltipPrimitive.Root
          {...props}
          open={open}
          delayDuration={delayDuration}
          // Radix drives hover and focus. A touch gesture is ours alone: its
          // `pointerdown`-closes / `click`-opens pair is unresolvable against
          // a toggle, so the request is dropped and `TooltipTrigger`'s click
          // handler is the only thing that moves the state.
          onOpenChange={(next) => {
            if (touch.current) return;
            setOpen(next);
          }}
        >
          {children}
        </TooltipPrimitive.Root>
      </TooltipPrimitive.Provider>
    </TooltipContext.Provider>
  );
}

export interface TooltipTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger> {
  /**
   * The child is a disabled control. Wraps it in a focusable span and makes it
   * inert so the tooltip still has something to listen to. Note this does
   * *not* disable anything on its own — pass `disabled` to the child too.
   */
  disabled?: boolean;
}

export const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  TooltipTriggerProps
>(
  (
    {
      asChild,
      disabled,
      className,
      children,
      onPointerDown,
      onClick,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const context = useTooltipContext("TooltipTrigger");

    return (
      <TooltipPrimitive.Trigger
        ref={composeRefs(ref, context.triggerRef)}
        // A wrapped disabled child is always a slot: the span *is* the trigger.
        asChild={asChild || disabled}
        className={disabled ? undefined : className}
        // Runs before Radix's own handler (it composes props first), so the
        // gesture is classified by the time Radix asks to close.
        onPointerDown={(event) => {
          context.touch.current = event.pointerType === "touch";
          onPointerDown?.(event);
        }}
        onClick={(event) => {
          if (context.touch.current) context.toggle();
          onClick?.(event);
        }}
        // Leaving the trigger ends the gesture in both senses: the tooltip goes
        // away, and the next interaction is classified fresh — otherwise a tap
        // followed by a Tab would leave the trigger stuck in touch mode with
        // Radix's focus handling still suppressed.
        onBlur={(event) => {
          context.touch.current = false;
          context.setOpen(false);
          onBlur?.(event);
        }}
        {...props}
      >
        {disabled ? (
          <span
            tabIndex={0}
            // The disabled child swallows nothing: pointer events land on the
            // span, which is what has the listeners. `inline-flex` keeps the
            // wrapper the size of the control rather than the line box.
            className={cn("inline-flex [&>*]:pointer-events-none", className)}
          >
            {children}
          </span>
        ) : (
          children
        )}
      </TooltipPrimitive.Trigger>
    );
  },
);
TooltipTrigger.displayName = "TooltipTrigger";

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(
  (
    { className, sideOffset = 6, collisionPadding = 8, children, ...props },
    ref,
  ) => {
    const context = useTooltipContext("TooltipContent");

    return (
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          onEscapeKeyDown={() => context.setOpen(false)}
          onPointerDownOutside={(event) => {
            // A tap on the trigger is "outside" the content, and closing here
            // would land before the trigger's own click toggled it back open —
            // a tooltip that cannot be tapped shut. Let the toggle own it.
            if (context.triggerRef.current?.contains(event.target as Node)) {
              return;
            }
            context.setOpen(false);
          }}
          className={cn(
            "z-50 max-w-[min(20rem,calc(100vw-1rem))] rounded-lg border border-border bg-card px-3 py-2 text-caption text-card-foreground shadow-elevated",
            "data-[state=delayed-open]:animate-fade-in data-[state=instant-open]:animate-fade-in",
            className,
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow
            className="fill-card"
            width={11}
            height={5}
          />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    );
  },
);
TooltipContent.displayName = "TooltipContent";
