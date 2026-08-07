import * as React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GalleryIndex } from "./gallery-index";
import { GALLERY } from "./sections/registry";

/**
 * Dev-only component gallery (T1.2).
 *
 * Every primitive, every variant, every state, in both themes at once. It is a
 * working surface, not a product route: `middleware.ts` whitelists `/ui` so it
 * loads without auth, and this guard removes it from any production build. The
 * guard runs at module scope in the sense that matters — `next build` sets
 * NODE_ENV to "production", so the route prerenders as a 404 and the page body
 * never reaches the bundle's render path.
 *
 * The gradient budget in CLAUDE.md is one gradient element per viewport. This
 * page is the deliberate exception: EmptyState carries its own gradient surface
 * and the gallery shows four of them twice over. Budget is a rule about product
 * routes, and a catalogue of components is not one.
 */
export const metadata: Metadata = {
  title: "UI gallery",
  robots: { index: false, follow: false },
};

export default function UiGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <span className="eyebrow text-muted-foreground">Design system</span>
        <h1 className="mt-2 text-h1 text-ink">UI gallery</h1>
        <p className="mt-3 max-w-[62ch] text-body-lg text-muted-foreground">
          Every primitive in <code className="font-mono">src/components/ui/</code>,
          rendered in light and dark side by side. Tab through a section to check
          focus rings; hover to check lifts; use the viewport strip under the
          layout primitives to check 360px.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[9rem_minmax(0,1fr)] lg:gap-10">
        {/* `min-w-0` is load-bearing: a grid item defaults to `min-width: auto`,
            which lets the chip row's content width win over its own
            `overflow-x-auto` and pushes the page to ~550px at 360. */}
        <div className="sticky top-0 z-10 -mt-2 min-w-0 bg-background pt-2 lg:static lg:z-auto lg:mt-0 lg:bg-transparent lg:pt-0">
          <GalleryIndex />
        </div>

        <div className="min-w-0 space-y-14">
          {GALLERY.map(({ id, Section }) => (
            <Section key={id} />
          ))}
        </div>
      </div>
    </main>
  );
}
