import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/marketing/brand-mark";
import { ScrolledHeader } from "@/components/marketing/scrolled-header";
import { MARKETING_NAV, type MarketingNavItem } from "@/lib/marketing-nav";

/** The nav items a page's section list actually has somewhere to scroll to. */
export function marketingNavItems(
  sections: readonly string[],
): MarketingNavItem[] {
  return MARKETING_NAV.filter((item) => sections.includes(item.id));
}

/**
 * Shared marketing header — sticky, transparent over the hero, solid with a
 * border once scrolled past 40px (`ScrolledHeader` owns that listener).
 *
 * **Nav links are `text-foreground`, not `text-muted-foreground`.** At rest the
 * bar sits over the hero bloom, which is `--primary` at 10% over the page
 * background; muted-foreground measures 4.1:1 against that and fails AA, while
 * against the plain background it passes at 4.7:1. A link whose contrast
 * depends on scroll position is a link that fails somewhere, so the nav takes
 * the ~14:1 reading that holds in both states and spends its de-emphasis on
 * weight instead of colour.
 *
 * **`mobileNav` is a slot, not an import, and that is a bundle decision.**
 * The sheet is a Radix Dialog. Importing it here costs every route that renders
 * this header 26 kB of client JavaScript whether or not the sheet is reachable
 * — `next/dynamic` does not help, because the client-reference manifest still
 * lists it for the route. `/privacy`, `/terms`, `/contact` and `/practice` have
 * no in-page sections and therefore no nav to open, so they pass nothing and
 * stay where they were. Only `LandingHeader` fills the slot. Same lesson as
 * `DomainBar` and `Tooltip`.
 *
 * `sections` is the list of section ids the page actually renders — see the
 * note on `MARKETING_NAV`. Items with no destination are dropped rather than
 * rendered as anchors that scroll nowhere.
 */
export async function MarketingHeader({
  sections = [],
  mobileNav,
}: {
  sections?: readonly string[];
  mobileNav?: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  const items = marketingNavItems(sections);
  const dashboardHref = user?.role === "ADMIN" ? "/admin" : "/dashboard";
  const dashboardLabel = user?.role === "ADMIN" ? "Go to admin" : "Go to dashboard";

  return (
    <ScrolledHeader>
      <div className="container mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <BrandMark />

        {items.length > 0 && (
          <nav aria-label="Main" className="hidden md:flex md:items-center md:gap-1">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-body font-medium text-foreground transition-colors hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <Button asChild size="sm">
              <Link href={dashboardHref}>{dashboardLabel}</Link>
            </Button>
          ) : (
            <>
              {/* With a sheet in play the auth pair moves into it below `sm`,
                  where the bar would otherwise wrap at 360px. With no sheet
                  there is nowhere else for them to go, so they stay. */}
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={mobileNav ? "hidden sm:inline-flex" : undefined}
              >
                <Link href="/login">Log in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className={mobileNav ? "hidden sm:inline-flex" : undefined}
              >
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}

          {mobileNav}
        </div>
      </div>
    </ScrolledHeader>
  );
}
