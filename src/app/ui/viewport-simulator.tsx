import * as React from "react";

/**
 * Renders a layout primitive at 360 / 768 / 1280 in real iframes, so a
 * container query, a `min-w-0` mistake or a 360px horizontal scroll shows up
 * where you are already looking instead of in a devtools session.
 *
 * Deliberately server-rendered: every frame is scaled by a constant that
 * depends only on its own width, so there is nothing to measure on the client
 * and nothing to hydrate. Each frame loads `/ui/frame`, which renders the
 * section's specimens bare, on a fixed theme, with no gallery chrome.
 */
const WIDTHS = [360, 768, 1280] as const;

/** Every frame is drawn this wide; the scale factor falls out of the ratio. */
const DISPLAY_WIDTH = 300;
/** Viewport height simulated inside the frame, before scaling. */
const FRAME_HEIGHT = 560;

export function ViewportSimulator({ section }: { section: string }) {
  return (
    <div className="mt-4 rounded-xl border border-border bg-paper-sunk p-4">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2">
        <span className="eyebrow text-muted-foreground">Viewports</span>
        <span className="text-caption text-muted-foreground/70">
          live iframes — scaled to fit, scroll inside to check overflow
        </span>
      </div>
      <div className="flex flex-wrap gap-4">
        {WIDTHS.map((width) => {
          const scale = DISPLAY_WIDTH / width;
          return (
            <figure key={width} className="m-0">
              <div
                className="overflow-hidden rounded-lg border border-border bg-background"
                style={{ width: DISPLAY_WIDTH, height: FRAME_HEIGHT * scale }}
              >
                <iframe
                  title={`${section} at ${width}px`}
                  src={`/ui/frame?section=${section}`}
                  style={{
                    width,
                    height: FRAME_HEIGHT,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    border: "0",
                  }}
                />
              </div>
              <figcaption className="mt-1.5 text-caption tabular text-muted-foreground/70">
                {width}px
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
