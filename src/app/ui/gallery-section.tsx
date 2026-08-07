import * as React from "react";
import { cn } from "@/lib/utils";
import { ViewportSimulator } from "./viewport-simulator";

/**
 * The gallery's one layout primitive. Every entry in `sections/` renders
 * exactly one of these, so adding a Phase 1 primitive is: write the specimens,
 * wrap them in a <GallerySection>, add a line to `sections/registry.tsx`.
 *
 * The children are rendered twice — once under `.light`, once under `.dark`.
 * Both classes set the full token block (see globals.css), so a nested pane
 * resolves its own theme regardless of what <html> is carrying. Keep specimens
 * free of `id` / `htmlFor`: rendering them twice would duplicate the id.
 */
export function GallerySection({
  id,
  title,
  description,
  viewports = false,
  children,
}: {
  id: string;
  title: string;
  description: string;
  /** Render the 360 / 768 / 1280 iframe strip under the panes. */
  viewports?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="text-h2 text-ink">{title}</h2>
      <p className="mt-1.5 max-w-[62ch] text-body text-muted-foreground">
        {description}
      </p>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <ThemePane theme="light">{children}</ThemePane>
        <ThemePane theme="dark">{children}</ThemePane>
      </div>

      {viewports && <ViewportSimulator section={id} />}
    </section>
  );
}

function ThemePane({
  theme,
  children,
}: {
  theme: "light" | "dark";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        theme,
        "min-w-0 overflow-hidden rounded-xl border border-border bg-background",
      )}
    >
      <div className="border-b border-border px-4 py-2">
        <span className="eyebrow text-muted-foreground">{theme}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/**
 * One labelled specimen row. `note` is for anything the swatch cannot show on
 * its own — "press Tab", "hover me".
 */
export function Row({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/60 py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2">
        <span className="eyebrow text-muted-foreground">{label}</span>
        {note && <span className="text-caption text-muted-foreground/70">{note}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/** A single specimen with a caption underneath — for grids of variants. */
export function Swatch({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      {children}
      <span className="text-caption tabular text-muted-foreground/70">{caption}</span>
    </div>
  );
}

/** Vertical stack for specimens that need full width (cards, headers, inputs). */
export function Stack({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full flex-col gap-4">{children}</div>;
}
