"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Field — label, control, hint and error, wired together (T1.6).
 *
 * Every form in the app spelled this out by hand, and every one of them spelled
 * it out slightly differently: `<label>` wrapping the input in the auth forms,
 * a hint that no screen reader ever reached, an error message sitting next to
 * an input with no `aria-invalid` on it. The wiring is the whole point of the
 * component — `id`/`htmlFor`, `aria-describedby` covering *both* the hint and
 * the error, and `aria-invalid` following the error rather than being set by
 * hand at each call site.
 *
 * Two shapes, because forms come in two shapes:
 *
 *   <Field label="Email"><Input type="email" /></Field>
 *
 *   <Field label="Password" error={mismatch ? "…" : undefined}>
 *     {(control) => (
 *       <div className="relative">
 *         <Input {...control} className="pr-10" />
 *         <button …>show</button>
 *       </div>
 *     )}
 *   </Field>
 *
 * A single element child is cloned with the control props; anything with a
 * wrapper around the control takes the render-prop form and spreads them where
 * they belong. Cloning never overwrites something the child already set — a
 * child with its own `id` keeps it and the label follows it.
 *
 * **`required` is behaviour, not a marker.** No asterisk: the copy rules mark
 * the exceptions instead, so pass `optional` on the few fields that are. The
 * attribute still reaches the control, so browser validation is unchanged.
 *
 * **The error is not a live region.** Same rule as `Alert`: it is announced
 * through `aria-describedby` when focus is in the field, which is where a
 * per-keystroke validity message belongs. A message about something that just
 * happened elsewhere — a failed submit — belongs in an `<Alert live>` above the
 * form, which is what the auth forms do.
 */

/** What `Field` hands the control. Spread these onto the input itself. */
export interface FieldControlProps {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
  required: boolean | undefined;
}

export interface FieldProps {
  label: React.ReactNode;
  /** Standing help — kept visible when an error appears, since it usually
   *  states the rule the error is about ("Minimum 8 characters"). */
  hint?: React.ReactNode;
  /** Truthy switches the control to the invalid treatment. */
  error?: React.ReactNode;
  required?: boolean;
  /** Renders "(optional)" after the label. */
  optional?: boolean;
  /** Pushed to the right of the label row — "Forgot your password?". */
  action?: React.ReactNode;
  /** Override the generated id. Only needed to match an id someone else owns. */
  id?: string;
  className?: string;
  children: React.ReactNode | ((control: FieldControlProps) => React.ReactNode);
}

export function Field({
  label,
  hint,
  error,
  required,
  optional,
  action,
  id: idProp,
  className,
  children,
}: FieldProps) {
  const generated = React.useId();
  const id = idProp ?? generated;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  // Reading order follows visual order: the hint states the rule, the error
  // says which rule was broken.
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  const control: FieldControlProps = {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    required,
  };

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <LabelPrimitive.Root
          htmlFor={id}
          className="text-caption font-semibold text-foreground"
        >
          {label}
          {optional && (
            <span className="ml-1 font-normal text-muted-foreground">
              (optional)
            </span>
          )}
        </LabelPrimitive.Root>
        {action}
      </div>

      {renderControl(children, control)}

      {hint && (
        <p id={hintId} className="text-caption text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="flex items-start gap-1.5 text-caption text-destructive"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

function renderControl(
  children: FieldProps["children"],
  control: FieldControlProps,
): React.ReactNode {
  if (typeof children === "function") return children(control);
  if (!React.isValidElement(children)) return children;

  const own = children.props as Record<string, unknown>;
  return React.cloneElement(children, {
    ...control,
    // The child wins on every one of these: an id it set is an id something
    // else already points at, and a describedby it set names a node this
    // component cannot see.
    id: (own.id as string | undefined) ?? control.id,
    "aria-describedby": joinIds(
      own["aria-describedby"] as string | undefined,
      control["aria-describedby"],
    ),
    "aria-invalid": own["aria-invalid"] ?? control["aria-invalid"],
    required: (own.required as boolean | undefined) ?? control.required,
  } as Record<string, unknown>);
}

function joinIds(...ids: (string | undefined)[]): string | undefined {
  const joined = ids.filter(Boolean).join(" ");
  return joined || undefined;
}
