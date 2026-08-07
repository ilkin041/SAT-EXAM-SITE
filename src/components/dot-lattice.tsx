import { cn } from "@/lib/utils";

/**
 * Decorative dot grid over the auth pages' brand panel.
 *
 * The pattern itself is the `.dot-lattice` utility in `globals.css` — keeping
 * the white there is what lets all four auth pages drop the `no-raw-color`
 * suppression they used to carry for a copy-pasted `rgba(255,255,255,0.8)`.
 *
 * Always `aria-hidden`: it is texture, not content.
 */
export function DotLattice({ className }: { className?: string }) {
  return (
    <div
      className={cn("dot-lattice absolute inset-0 opacity-10", className)}
      aria-hidden
    />
  );
}
