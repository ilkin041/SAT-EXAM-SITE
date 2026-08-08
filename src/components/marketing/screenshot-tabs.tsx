import { ScreenshotTabsClient } from "@/components/marketing/screenshot-tabs-client";

/**
 * "See it before you sign up." — four real screens in a tabbed frame (T3.5).
 *
 * The pictures are photographs of this app, taken by `npm run gen:screenshots`
 * against a running server and the fixture `npm run db:seed-screenshot-fixture`
 * creates. Nothing here is drawn. That is the point of the sub-heading, and it
 * is why the shots are regenerated rather than retouched: a mockup drifts from
 * the product silently, and a screenshot that has been drawn over is a claim
 * the product cannot back.
 *
 * Three things this section must keep doing:
 *
 *  - **One frame, one ratio.** Every capture is 1440×900, the frame is an
 *    `aspect-[8/5]` box, and the box has its height before the image arrives.
 *    Switching tabs therefore moves nothing, which is an acceptance criterion
 *    and also the difference between this reading as a product and as a
 *    slideshow.
 *  - **Labels, not paragraphs.** Two or three per tab, each naming something
 *    visible in that shot. A callout describing a feature you cannot see in the
 *    picture is marketing copy wearing a caption's clothes.
 *  - **No gradient.** `/`'s one gradient is the rail on the hero demo panel
 *    (T3.4). This section is a flat card on the page background.
 *
 * `id="screens"` is an anchor, not a nav item — `MARKETING_NAV` is untouched,
 * for the same reason T3.4 left it alone: the demo and the screens are both
 * near the top of the page and a nav link to the top of the page is noise.
 */
export function ScreenshotTabs() {
  return (
    <section id="screens" className="scroll-mt-16">
      <div className="container mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-h2">See it before you sign up.</h2>
          <p className="mx-auto mt-3 max-w-[52ch] text-body-lg text-muted-foreground">
            These are real screens, not mockups.
          </p>
        </div>

        <ScreenshotTabsClient />
      </div>
    </section>
  );
}
