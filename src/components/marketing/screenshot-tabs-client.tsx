"use client";

import Image, { type StaticImageData } from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRODUCT_SCREENS, type ProductScreen } from "@/lib/product-screens";
import answerReview from "@/assets/screenshots/answer-review.webp";
import forTutors from "@/assets/screenshots/for-tutors.webp";
import scoreReport from "@/assets/screenshots/score-report.webp";
import testInterface from "@/assets/screenshots/test-interface.webp";

/**
 * The tab strip and the frame (T3.5). Client, because `Tabs` is — the heading
 * above it stays on the server in `screenshot-tabs.tsx`, and the copy stays in
 * `@/lib/product-screens` where a test can read it.
 *
 * Radix supplies the keyboard contract: ←/→ move between tabs, Home/End jump to
 * the ends, and only the active trigger is in the tab order. Activation is
 * automatic (the default), which is the ARIA-recommended behaviour and costs
 * nothing here — arrowing across the strip fetches at most four images of
 * ~25 kB each.
 */

/**
 * Static imports, one per screen id. They have to be literal — a template
 * string would leave webpack unable to resolve the file, and with it the
 * intrinsic dimensions and the blur placeholder that the frame depends on.
 */
const IMAGES: Record<string, StaticImageData> = {
  "test-interface": testInterface,
  "score-report": scoreReport,
  "answer-review": answerReview,
  "for-tutors": forTutors,
};

export function ScreenshotTabsClient() {
  return (
    <Tabs defaultValue={PRODUCT_SCREENS[0].id} className="mt-10">
      {/*
        A scrollable pill row on a phone: four labels do not fit 360px, and
        wrapping them onto two lines pushes the frame further down the page than
        the strip is worth. The negative margin lets the row bleed to the screen
        edge, so the last pill is visibly cut off rather than looking like the
        end of the list.
      */}
      <TabsList
        variant="pill"
        className="-mx-4 flex-nowrap justify-start overflow-x-auto px-4 md:mx-0 md:justify-center md:overflow-visible md:px-0"
        aria-label="Product screens"
      >
        {PRODUCT_SCREENS.map((screen) => (
          <TabsTrigger key={screen.id} value={screen.id}>
            {screen.tab}
          </TabsTrigger>
        ))}
      </TabsList>

      {PRODUCT_SCREENS.map((screen) => (
        <TabsContent key={screen.id} value={screen.id}>
          <figure className="m-0">
            <DeviceFrame screen={screen} />
            <figcaption className="mt-6">
              <ul className="grid gap-3 sm:grid-cols-3">
                {screen.callouts.map((callout) => (
                  <li key={callout} className="flex items-start gap-2.5">
                    <span
                      className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                    <span className="text-caption text-muted-foreground">{callout}</span>
                  </li>
                ))}
              </ul>
            </figcaption>
          </figure>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function DeviceFrame({ screen }: { screen: ProductScreen }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-elevated">
      {/* Subtle chrome: three dots and the route the shot was taken on. The
          route is not decoration — it says which screen you are looking at. */}
      <div className="flex items-center gap-3 border-b border-border bg-paper-sunk px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
        </span>
        {/* `font-mono` rather than `.eyebrow`: a path is code, not a label, and
            uppercasing it would misrepresent a case-sensitive URL. */}
        <span className="truncate font-mono text-caption text-muted-foreground">
          {screen.route}
        </span>
      </div>
      {/*
        The frame's height comes from this ratio, not from the image, so it is
        the same before the image loads, during a swap, and on all four screens
        — which is the whole of "no layout shift on tab change". 8/5 is the
        capture viewport, 1440×900.
      */}
      <div className="relative aspect-[8/5] w-full bg-paper-sunk">
        <Image
          src={IMAGES[screen.id]}
          alt={screen.alt}
          // Intrinsic dimensions come from the static import; `fill` would throw
          // them away and make `sizes` guess.
          className="h-full w-full object-cover object-top"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1120px"
          placeholder="blur"
          // Below the fold on every viewport this page supports. The blur
          // placeholder is what covers the gap on a tab switch.
          priority={false}
        />
      </div>
    </div>
  );
}
