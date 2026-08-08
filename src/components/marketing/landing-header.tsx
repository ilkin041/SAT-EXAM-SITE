import { auth } from "@/auth";
import {
  MarketingHeader,
  marketingNavItems,
} from "@/components/marketing/marketing-header";
import { MarketingMobileNav } from "@/components/marketing/marketing-mobile-nav";
import { LANDING_SECTIONS } from "@/lib/marketing-nav";

/**
 * `MarketingHeader` with the mobile nav sheet filled in — the landing page's
 * header, and the only one that pays for Radix Dialog. See the slot note on
 * `MarketingHeader` for why this is a separate module rather than a prop on
 * that one.
 *
 * It reads the session a second time (the header reads it too). That is a JWT
 * verification against `AUTH_SECRET` with no database behind it, which is
 * cheaper than threading a `user` prop through a component whose whole job is
 * to not need one.
 */
export async function LandingHeader() {
  const session = await auth();
  const items = marketingNavItems(LANDING_SECTIONS);
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <MarketingHeader
      sections={LANDING_SECTIONS}
      mobileNav={
        <MarketingMobileNav
          items={items}
          signedIn={Boolean(session?.user)}
          dashboardHref={isAdmin ? "/admin" : "/dashboard"}
          dashboardLabel={isAdmin ? "Go to admin" : "Go to dashboard"}
        />
      }
    />
  );
}
