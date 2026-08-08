import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/site";

/**
 * The wordmark, shared by the marketing header and footer.
 *
 * Solid, matching the `StudentNav` / `UserMenu` marks T0.6 flattened — the
 * landing page spends its one gradient on the hero CTA.
 */
export function BrandMark({
  href = "/",
  size = "md",
  className,
}: {
  href?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const tile = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const glyph = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg text-body font-bold text-foreground",
        "transition-colors hover:text-primary",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm",
          tile,
        )}
      >
        <GraduationCap className={glyph} aria-hidden />
      </span>
      {SITE_NAME}
    </Link>
  );
}
