"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Accordion — disclosure list, one open or many (T1.6).
 *
 * Radix owns the parts that are easy to get wrong by hand: `aria-expanded` and
 * `aria-controls` on the trigger, `role="region"` with `aria-labelledby` on the
 * panel, Up/Down/Home/End across the triggers, and the height variables the
 * open/close animation needs.
 *
 *   <Accordion type="single" collapsible defaultValue="q1">
 *     <AccordionItem value="q1">
 *       <AccordionTrigger>Is this the real SAT?</AccordionTrigger>
 *       <AccordionContent>No — practice built to the format.</AccordionContent>
 *     </AccordionItem>
 *   </Accordion>
 *
 * `type` is Radix's, and it is the whole API difference between the two modes:
 * `"single"` takes a string value and wants `collapsible` unless one panel must
 * always be open; `"multiple"` takes an array and needs no such flag.
 *
 * **Set `headingLevel` to whatever the surrounding outline says.** Radix wraps
 * every trigger in an `<h3>` by default, which is right inside an `<h2>`
 * section and wrong directly under an `<h1>`. It is a prop rather than a
 * guess, because only the page knows.
 *
 * The panel animates on a height custom property Radix measures; the global
 * reduced-motion block flattens it to 0.01ms, so the panel appears and
 * disappears instead of sliding, with no other behaviour changed.
 *
 * **A closed panel is absent from the DOM, not hidden — so do not use this for
 * content that has to be crawled.** Radix renders `isOpen && children`, and
 * `forceMount` does not give you "mounted but hidden": it seeds the presence
 * state to true, so every panel ends up permanently open. A crawler renders a
 * page and does not click it, which means an FAQ built on this ships one answer
 * in its HTML. T3.7's FAQ is `<details>`/`<summary>` in
 * `components/marketing/faq.tsx` for that reason, and only that reason — this
 * is still the right primitive anywhere the content is behind a login or is not
 * mirrored into structured data.
 */

export const Accordion = AccordionPrimitive.Root;

export const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b border-border last:border-b-0", className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

export interface AccordionTriggerProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
  /** Heading level of the row. Defaults to 3, which is Radix's own default. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

export const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  AccordionTriggerProps
>(({ className, children, headingLevel = 3, ...props }, ref) => {
  const Heading = `h${headingLevel}` as const;
  return (
    // `asChild` swaps Radix's own `<h3>` for the level the page asked for.
    // The heading carries no styling of its own — the trigger inside it is the
    // row, and a heading rung here would fight the row's own type.
    <AccordionPrimitive.Header asChild>
      <Heading className="flex">
        <AccordionPrimitive.Trigger
          ref={ref}
          className={cn(
            "group flex flex-1 items-center justify-between gap-4 py-4 text-left text-body font-semibold text-foreground",
            "transition-colors hover:text-primary",
            "disabled:pointer-events-none disabled:opacity-50",
            className,
          )}
          {...props}
        >
          {children}
          <ChevronDown
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </AccordionPrimitive.Trigger>
      </Heading>
    </AccordionPrimitive.Header>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

export const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    // The animation lives on the wrapper and the padding lives on the inner
    // div: animating a height to `--radix-accordion-content-height` only lands
    // on the right number if the element being animated is the one Radix
    // measured, and padding on it would make the two disagree.
    className={cn(
      "overflow-hidden text-body text-muted-foreground",
      "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
    )}
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = "AccordionContent";
