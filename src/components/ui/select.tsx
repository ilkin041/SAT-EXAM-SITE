"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Select — the replacement for every native `<select>` in the app (T1.3).
 *
 * Wraps `@radix-ui/react-select`, which brings the keyboard contract a styled
 * native select cannot: Enter/Space to open, type-ahead, Up/Down/Home/End,
 * Esc to close, and focus returned to the trigger on close.
 *
 * Two things this wrapper adds over a thin Radix re-export:
 *
 * 1. **`value=""` works.** Radix throws on `<Select.Item value="">`, but the
 *    filter forms all want a real "All sections" row that submits an empty
 *    query param. Every value crosses a translation boundary here, so call
 *    sites keep writing `value=""` exactly as they did with `<option>`.
 *    Internally that becomes {@link EMPTY_VALUE}, which never leaves the file.
 *
 *    "Nothing selected yet" is a different state and is spelled `undefined` —
 *    omit `defaultValue` and give the trigger a `placeholder`.
 *
 * 2. **It still submits.** Radix has its own hidden-input bubbling, but it
 *    would submit the sentinel. Passing `name` renders our own mirror input
 *    holding the untranslated value, so the GET filter forms and the server
 *    actions read what they always read.
 */

/**
 * Stand-in for the empty string inside Radix. Deliberately not exported: no
 * call site should ever see it, and no submitted value ever carries it.
 */
const EMPTY_VALUE = "__select_empty__";

const toRadixValue = (value: string) => (value === "" ? EMPTY_VALUE : value);
const fromRadixValue = (value: string) => (value === EMPTY_VALUE ? "" : value);

interface SelectFieldContextValue {
  /** The call-site-facing value: `undefined` while nothing is selected. */
  value: string | undefined;
  clear: () => void;
}

const SelectFieldContext = React.createContext<SelectFieldContextValue | null>(
  null,
);

function useSelectField(component: string): SelectFieldContextValue {
  const context = React.useContext(SelectFieldContext);
  if (!context) {
    throw new Error(`<${component}> must be rendered inside a <Select>.`);
  }
  return context;
}

export interface SelectProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>,
    "value" | "defaultValue" | "onValueChange" | "name"
  > {
  /** Submits under this name. Omit for a select that only drives client state. */
  name?: string;
  /** Controlled value. `""` selects the empty item. */
  value?: string;
  /** Uncontrolled starting value. Omit to start on the placeholder. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Blocks submission while nothing is selected. Needs `name`. */
  required?: boolean;
  /** Applied to the wrapper that anchors the trigger — this is the layout box. */
  className?: string;
}

/**
 * The field root. Renders one positioned wrapper so the clear button and the
 * form mirror have something to anchor to; the listbox itself is portalled.
 */
export function Select({
  name,
  value,
  defaultValue,
  onValueChange,
  required,
  disabled,
  className,
  children,
  ...props
}: SelectProps) {
  const [uncontrolled, setUncontrolled] = React.useState<string | undefined>(
    defaultValue,
  );
  // Controlled-ness latches on the first defined `value`, and from then on the
  // prop wins outright. Without the latch a parent that clears the field back
  // to `undefined` would fall through to the internal copy and the old
  // selection would reappear.
  const everControlled = React.useRef(false);
  if (value !== undefined) everControlled.current = true;
  const current = everControlled.current ? value : uncontrolled;

  const handleChange = React.useCallback(
    (next: string | undefined) => {
      setUncontrolled(next);
      onValueChange?.(next ?? "");
    },
    [onValueChange],
  );

  const context = React.useMemo<SelectFieldContextValue>(
    () => ({ value: current, clear: () => handleChange(undefined) }),
    [current, handleChange],
  );

  return (
    <SelectFieldContext.Provider value={context}>
      <SelectPrimitive.Root
        {...props}
        disabled={disabled}
        // Always controlled, and never `undefined`: Radix reads a bare `""` as
        // "show the placeholder", which is exactly what no-selection means
        // here. The empty *item* is the sentinel, so the two cannot collide.
        value={current === undefined ? "" : toRadixValue(current)}
        onValueChange={(next) => handleChange(fromRadixValue(next))}
      >
        <span className={cn("relative block w-full", className)}>
          {name ? (
            <FormMirror name={name} value={current} required={required} />
          ) : null}
          {children}
        </span>
      </SelectPrimitive.Root>
    </SelectFieldContext.Provider>
  );
}

/**
 * Carries the value into form submission.
 *
 * `input[type=hidden]` is barred from constraint validation, so a required
 * field needs a control the browser will actually check. That branch renders a
 * transparent text input over the trigger: `pointer-events-none` leaves every
 * click to the trigger and `tabIndex={-1}` keeps it out of the tab order, but
 * it stays programmatically focusable, which is what lets the browser anchor
 * its "please fill out this field" bubble on the trigger rather than jumping
 * to the top of the page.
 */
function FormMirror({
  name,
  value,
  required,
}: {
  name: string;
  value: string | undefined;
  required?: boolean;
}) {
  if (!required) {
    return <input type="hidden" name={name} value={value ?? ""} />;
  }
  return (
    <input
      name={name}
      value={value ?? ""}
      required
      onChange={() => {}}
      tabIndex={-1}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
    />
  );
}

/**
 * Height, radius, border, inner shadow and focus treatment are copied from
 * `Input` on purpose — the two sit side by side in every filter bar, and a
 * one-pixel difference in either reads as a bug. Like `Input`, the trigger does
 * not set `outline-none`: the border swap plus a 20%-opacity ring is not a 3:1
 * indicator on its own, so it keeps the global `:focus-visible` outline and
 * layers this underneath.
 */
const selectTriggerVariants = cva(
  [
    "flex w-full items-center gap-2 rounded-lg border border-input bg-card text-card-foreground text-sm shadow-inner-sm",
    "transition-all duration-200",
    "data-[placeholder]:text-muted-foreground/60",
    "hover:border-ring/40",
    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "h-9 px-3",
        default: "h-10 px-3.5 py-2",
      },
      // Disabled is not a variant: it is the `disabled` attribute, which Radix
      // needs anyway to stop the listbox opening. Styling it here as well would
      // be a second source of truth that can disagree with the behaviour.
      state: {
        default: "",
        error:
          "border-destructive hover:border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25",
      },
    },
    defaultVariants: { size: "default", state: "default" },
  },
);

export interface SelectTriggerProps
  extends Omit<
      React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>,
      "children"
    >,
    VariantProps<typeof selectTriggerVariants> {
  /** Shown while nothing is selected. */
  placeholder?: string;
  /** Decorative leading glyph, e.g. `<Filter className="h-4 w-4" />`. */
  icon?: React.ReactNode;
  /**
   * Adds a button that returns the field to its placeholder and emits `""`.
   * Meant for optional filters that start empty — do not combine it with an
   * explicit `value=""` item, since the two mean the same thing to a reader
   * and only one of them is reachable from the keyboard.
   */
  clearable?: boolean;
  /** Accessible name for the clear button. */
  clearLabel?: string;
  /** Custom value rendering. Defaults to the selected item's text. */
  children?: React.ReactNode;
}

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(
  (
    {
      className,
      size,
      state,
      placeholder,
      icon,
      clearable,
      clearLabel = "Clear selection",
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const field = useSelectField("SelectTrigger");
    const showClear = !!clearable && field.value !== undefined && !disabled;

    return (
      <>
        <SelectPrimitive.Trigger
          ref={ref}
          disabled={disabled}
          className={cn(
            selectTriggerVariants({ size, state }),
            showClear && "pr-14",
            className,
          )}
          {...props}
        >
          {icon ? (
            <span className="shrink-0 text-muted-foreground" aria-hidden>
              {icon}
            </span>
          ) : null}
          <span className="min-w-0 flex-1 truncate text-left">
            {children ?? <SelectPrimitive.Value placeholder={placeholder} />}
          </span>
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        {showClear && (
          <button
            type="button"
            onClick={field.clear}
            aria-label={clearLabel}
            className="absolute right-9 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </>
    );
  },
);
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, position = "popper", children, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={4}
      className={cn(
        "relative z-50 max-h-[var(--radix-select-content-available-height)] min-w-[8rem] overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-elevated",
        // Enter only. Radix wraps Content in `Presence`, which holds the
        // listbox mounted until a closing animation reports `animationend` —
        // and a tab that is not compositing frames never fires one, so an exit
        // animation can strand an open listbox in the DOM. There is nothing to
        // wait for without it.
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
        // Match the trigger's width so a long option list never reflows the
        // row it sits in.
        position === "popper" &&
          "w-[var(--radix-select-trigger-width)] data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
        className,
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport className="p-1">
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, value, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    value={toRadixValue(value)}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none",
      "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5" aria-hidden />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";

export const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("eyebrow px-2 py-1.5 text-muted-foreground", className)}
    {...props}
  />
));
SelectLabel.displayName = "SelectLabel";

export const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
));
SelectSeparator.displayName = "SelectSeparator";

function SelectScrollUpButton() {
  return (
    <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1 text-muted-foreground">
      <ChevronUp className="h-4 w-4" aria-hidden />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton() {
  return (
    <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1 text-muted-foreground">
      <ChevronDown className="h-4 w-4" aria-hidden />
    </SelectPrimitive.ScrollDownButton>
  );
}

export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;
export { selectTriggerVariants };
