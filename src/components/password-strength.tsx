import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Three-segment strength meter under a new-password field.
 *
 * One copy, because there were two: `signup-form.tsx` and `account-forms.tsx`
 * each carried their own `scorePassword` with the same rules and different
 * return types, and the two could drift into telling the same password two
 * different things. T1.6 merged them here while both files were being moved
 * onto `Field`.
 *
 * The colours are tokens now rather than `bg-amber-500` / `bg-green-600`:
 * amber is reserved for time and pacing, and a raw palette green is not the
 * `success` the rest of the app uses.
 *
 * **It is advice, not a gate.** The only rule the API enforces is eight
 * characters; the meter says whether a password is worth more than that.
 * The bar is decorative — the label beside it carries the meaning, so status
 * is never colour alone.
 */

export interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const strength = scorePassword(password);
  if (!strength) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex flex-1 gap-1" aria-hidden>
        {[1, 2, 3].map((segment) => (
          <div
            key={segment}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              strength.score >= segment ? strength.tone : "bg-muted",
            )}
          />
        ))}
      </div>
      <span className="text-caption text-muted-foreground">
        {strength.label} password
      </span>
    </div>
  );
}

interface Strength {
  score: 1 | 2 | 3;
  label: "Weak" | "Medium" | "Strong";
  tone: string;
}

/** `null` for an empty field — there is nothing to say about no password. */
export function scorePassword(password: string): Strength | null {
  if (password.length === 0) return null;

  let points = 0;
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)) {
    points += 1;
  }
  if (/[^A-Za-z0-9]/.test(password)) points += 1;

  const score = Math.min(3, Math.max(1, Math.floor(points / 1.5))) as 1 | 2 | 3;
  if (score === 1) return { score, label: "Weak", tone: "bg-destructive" };
  if (score === 2) return { score, label: "Medium", tone: "bg-warning" };
  return { score, label: "Strong", tone: "bg-success" };
}
