"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Tabs — Radix Tabs in the two treatments this app already uses (T1.5).
 *
 *  - `underline` — the default. A rule under the strip, a thicker one under
 *    the active tab. For switching the *view* of one thing: overview vs
 *    breakdown on a results page.
 *  - `pill` — rounded chips, the active one filled. Matches `AdminNavLinks`
 *    exactly, including `tone="inverted"` for the navy bar, so that nav can
 *    move onto this component later without a visual diff. It is still a
 *    *link* nav today, and links are not tabs — the swap is a Phase-1
 *    follow-on, not something to force here.
 *
 * Radix supplies the keyboard contract: arrows move between tabs, Home/End
 * jump to the ends, and only the active tab is in the tab order, so Tab
 * enters the panel rather than walking the strip.
 *
 * `activationMode="manual"` is worth considering for a panel that fetches:
 * automatic activation (the default) selects on arrow, which fires a request
 * per keypress as someone arrows across.
 */

interface TabsStyleContextValue {
  variant: "underline" | "pill";
  tone: "default" | "inverted";
}

/**
 * The list's variant has to reach the triggers, which are its children rather
 * than its props. Defaulted rather than nullable: a stray `<TabsTrigger>` is
 * a mistake worth rendering plainly, not one worth crashing the page over.
 */
const TabsStyleContext = React.createContext<TabsStyleContextValue>({
  variant: "underline",
  tone: "default",
});

export const Tabs = TabsPrimitive.Root;

const tabsListVariants = cva("flex items-center", {
  variants: {
    variant: {
      // The rule is on the list, not on each trigger — a per-trigger border
      // stops at the last tab and leaves the rest of the row unruled.
      underline: "gap-1 border-b",
      pill: "gap-1",
    },
    tone: { default: "", inverted: "" },
  },
  compoundVariants: [
    { variant: "underline", tone: "default", class: "border-border" },
    { variant: "underline", tone: "inverted", class: "border-white/15" },
  ],
  defaultVariants: { variant: "underline", tone: "default" },
});

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant, tone, ...props }, ref) => {
  const style = React.useMemo<TabsStyleContextValue>(
    () => ({ variant: variant ?? "underline", tone: tone ?? "default" }),
    [variant, tone],
  );

  return (
    <TabsStyleContext.Provider value={style}>
      <TabsPrimitive.List
        ref={ref}
        className={cn(tabsListVariants({ variant, tone }), className)}
        {...props}
      />
    </TabsStyleContext.Provider>
  );
});
TabsList.displayName = "TabsList";

const tabsTriggerVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold",
    "transition-all duration-150",
    "disabled:pointer-events-none disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      variant: {
        underline: [
          "px-3 py-2 text-body",
          // `-mb-px` pulls the trigger's own bottom border onto the list's, so
          // the active marker replaces the rule rather than sitting below it.
          "-mb-px border-b-2 border-transparent",
        ].join(" "),
        pill: "rounded-full px-3 py-1.5 text-caption active-press hover-lift",
      },
      tone: { default: "", inverted: "" },
    },
    compoundVariants: [
      {
        variant: "underline",
        tone: "default",
        class: [
          "text-muted-foreground hover:text-foreground hover:border-border",
          "data-[state=active]:border-primary data-[state=active]:text-foreground",
        ].join(" "),
      },
      {
        variant: "underline",
        tone: "inverted",
        class: [
          "text-white/70 hover:text-white hover:border-white/30",
          "data-[state=active]:border-white data-[state=active]:text-white",
        ].join(" "),
      },
      {
        variant: "pill",
        tone: "default",
        class: [
          "text-muted-foreground hover:bg-muted hover:text-foreground",
          "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
        ].join(" "),
      },
      {
        // The AdminNav treatment, class for class: white fill, navy label.
        variant: "pill",
        tone: "inverted",
        class: [
          "text-white/80 hover:bg-white/10 hover:text-white",
          "data-[state=active]:bg-white data-[state=active]:text-brand-navy data-[state=active]:font-bold data-[state=active]:shadow-sm",
        ].join(" "),
      },
    ],
    defaultVariants: { variant: "underline", tone: "default" },
  },
);

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const { variant, tone } = React.useContext(TabsStyleContext);
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(tabsTriggerVariants({ variant, tone }), className)}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    // Radix gives the panel `tabIndex={0}` so a keyboard user can reach
    // content that holds nothing focusable. That means it takes focus, so it
    // needs the ring — the global `:focus-visible` covers it, and `mt-4` keeps
    // the ring's 2px offset off the tab strip above.
    className={cn("mt-4", className)}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

export { tabsListVariants, tabsTriggerVariants };
