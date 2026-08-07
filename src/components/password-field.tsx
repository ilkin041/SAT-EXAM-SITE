"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordStrength } from "@/components/password-strength";

/**
 * A `Field` wrapping a password input and its show/hide toggle.
 *
 * Not a `ui/` primitive — it is one composition of two of them, and it exists
 * because the same twenty lines of relative-positioned eye button were copied
 * into four forms (login, signup, reset, account) with four slightly different
 * class lists. T1.6 collapsed them while moving those forms onto `Field`.
 *
 * **Each field owns its own toggle.** The signup form used to flip its confirm
 * field's type from the password field's button, which meant a control that
 * changed under you and a confirm field you could not reveal on its own.
 */
export interface PasswordFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  required?: boolean;
  minLength?: number;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Right side of the label row — the "Forgot your password?" link. */
  action?: React.ReactNode;
  /** Renders the strength meter under the input. New passwords only. */
  strength?: boolean;
}

export function PasswordField({
  label,
  value,
  onValueChange,
  autoComplete,
  required,
  minLength,
  hint,
  error,
  action,
  strength,
}: PasswordFieldProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <Field label={label} hint={hint} error={error} action={action} required={required}>
      {(control) => (
        <>
          <div className="relative">
            <Input
              {...control}
              type={visible ? "text" : "password"}
              autoComplete={autoComplete}
              minLength={minLength}
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setVisible((current) => !current)}
              aria-label={visible ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground"
            >
              {visible ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
          {strength && <PasswordStrength password={value} className="mt-2" />}
        </>
      )}
    </Field>
  );
}
