"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Scroll distance past which the header commits to a solid background. */
const SOLID_AT = 40;

/**
 * Landing-page header shell. Transparent over the hero, solid with a border
 * once scrolled past 40px.
 *
 * The previous `glass` treatment was translucent at every scroll position, so
 * the nav text sat over whatever hero content happened to be behind it and the
 * contrast ratio was not knowable. Going solid fixes that without costing the
 * hero its full-bleed look at rest.
 *
 * Children are server-rendered and passed straight through — this island owns
 * the scroll listener and nothing else.
 */
export function ScrolledHeader({ children }: { children: React.ReactNode }) {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > SOLID_AT);
    // Run once: a reload partway down the page must not start transparent.
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-200",
        solid
          ? "border-border bg-background shadow-sm"
          : "border-transparent bg-transparent",
      )}
    >
      {children}
    </header>
  );
}
