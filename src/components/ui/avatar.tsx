import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Avatar — initials in a tinted circle (T1.6).
 *
 * Replaces the gradient circle T0.6 removed from the user menu. There is no
 * image branch on purpose: `User` has no `image` column (see
 * `prisma/schema.prisma`), nothing in the app uploads one, and a remote avatar
 * host would need `next.config` `remotePatterns` before a single pixel could
 * render. When that column exists, an `src` prop belongs here — not a second
 * component.
 *
 * **The hue is derived, not stored.** Same user, same colour, on every device
 * and every render, because it is a hash of the seed rather than anything
 * session- or order-dependent. Pass the user id as `seed`: a name changes, an
 * id does not, and an avatar that changes colour when someone edits their name
 * stops being recognisable in a roster.
 *
 * **Which hues.** Six, and none of them are emerald, amber or red — those three
 * are spoken for (correct / time / incorrect), and a person is not a status.
 * The set stays in the cool half of the wheel where the product already lives,
 * so a roster reads as one surface rather than a bag of highlighters.
 *
 * The circle is decorative by default: it sits next to the name it abbreviates,
 * and a screen reader reading "A, Ada Lovelace" is noise. Pass `label` on the
 * rare avatar that stands alone.
 */

const avatarVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold uppercase leading-none",
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-eyebrow",
        sm: "h-7 w-7 text-caption",
        md: "h-9 w-9 text-caption",
        lg: "h-12 w-12 text-body",
      },
      /**
       * Indexes into the hue set. Numeric keys because the value is computed —
       * `hueIndex()` returns the variant name, and cva keeps each pairing of
       * background and foreground in one place instead of two parallel arrays.
       */
      hue: {
        0: "bg-slate-200 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200",
        1: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-200",
        2: "bg-violet-100 text-violet-700 dark:bg-violet-500/25 dark:text-violet-200",
        3: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/25 dark:text-fuchsia-200",
        4: "bg-sky-100 text-sky-700 dark:bg-sky-500/25 dark:text-sky-200",
        5: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/25 dark:text-cyan-200",
      },
    },
    defaultVariants: { size: "md", hue: 0 },
  },
);

const HUE_COUNT = 6;

export interface AvatarProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children">,
    Omit<VariantProps<typeof avatarVariants>, "hue"> {
  /** Drives the initials. */
  name?: string | null;
  /** Fallback for the initials when there is no name, and for the hue. */
  email?: string | null;
  /** What the hue is derived from. Use the user id — it never changes. */
  seed?: string | null;
  /** Announces the avatar. Omit when the name is rendered beside it. */
  label?: string;
}

export function Avatar({
  name,
  email,
  seed,
  size,
  label,
  className,
  ...props
}: AvatarProps) {
  const initials = toInitials(name, email);
  const hue = hueIndex(seed || name || email || "");

  return (
    <span
      className={cn(avatarVariants({ size, hue }), className)}
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
      {...props}
    >
      {initials}
    </span>
  );
}

/**
 * Up to two letters: first and last word of a name, the first character of an
 * email's local part otherwise. `Array.from` rather than indexing, so a name
 * starting outside the BMP yields a character instead of half a surrogate pair.
 */
function toInitials(name?: string | null, email?: string | null): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const first = firstChar(words[0]);
    const last = words.length > 1 ? firstChar(words[words.length - 1]) : "";
    return (first + last).toUpperCase();
  }
  const local = (email ?? "").split("@")[0] ?? "";
  return firstChar(local).toUpperCase() || "?";
}

function firstChar(value: string): string {
  return Array.from(value)[0] ?? "";
}

/**
 * FNV-1a, 32-bit. Any stable hash would do; what matters is that it is pure
 * arithmetic over the seed's code units, so the server and the browser agree
 * and today agrees with next month. `>>> 0` before the modulo because the
 * multiply leaves a signed 32-bit value and a negative index picks no variant.
 */
export function hueIndex(seed: string): 0 | 1 | 2 | 3 | 4 | 5 {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return ((hash >>> 0) % HUE_COUNT) as 0 | 1 | 2 | 3 | 4 | 5;
}

export { avatarVariants };
