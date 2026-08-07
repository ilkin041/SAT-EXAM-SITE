import * as React from "react";
import { GALLERY } from "./sections/registry";

/**
 * Anchor index. Sticky in the left rail from lg up; a horizontally scrollable
 * chip row below that, which is why the two lists are separate markup rather
 * than one list restyled — a vertical nav that becomes a scroller needs a
 * different wrapper, not a different flex-direction.
 */
export function GalleryIndex() {
  return (
    <nav aria-label="Component index">
      <div className="hidden lg:sticky lg:top-8 lg:block">
        <span className="eyebrow text-muted-foreground">Primitives</span>
        <ul className="mt-3 space-y-0.5">
          {GALLERY.map((entry) => (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                className="block rounded-md px-2 py-1.5 text-body text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {entry.title}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-[24ch] text-caption text-muted-foreground/70">
          Dev only. This route calls notFound() in a production build.
        </p>
      </div>

      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        {GALLERY.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className="block whitespace-nowrap rounded-full border border-border bg-card px-3 py-1.5 text-caption text-muted-foreground transition-colors hover:text-foreground"
            >
              {entry.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
