import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { Features } from "@/components/marketing/features";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { LandingHeader } from "@/components/marketing/landing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { StatsBanner } from "@/components/marketing/stats-banner";
import { organizationJsonLd, webApplicationJsonLd } from "@/lib/json-ld";
import { SITE_TITLE, pageMetadata } from "@/lib/site";

/**
 * Landing page. Composition only — every section lives under
 * `src/components/marketing/`, which is what T3.4 through T3.8 edit.
 *
 * `titleAbsolute` because the root layout's template appends the site name and
 * this title already ends in it.
 */
export const metadata: Metadata = pageMetadata({
  titleAbsolute: SITE_TITLE,
  path: "/",
  og: { eyebrow: "Digital SAT" },
});

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={webApplicationJsonLd()} />

      <LandingHeader />

      <main>
        <Hero />
        <StatsBanner />
        <Features />
        <HowItWorks />
        <CtaBanner />
      </main>

      <MarketingFooter />
    </div>
  );
}
