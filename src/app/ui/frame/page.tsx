import * as React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findEntry } from "../sections/registry";

/**
 * The document loaded inside the gallery's viewport iframes: one primitive's
 * specimens, no chrome, no index, no theme panes. It inherits the theme from
 * <ThemeScript /> in the root layout — same origin, same localStorage key — so
 * a frame matches whatever the gallery around it is showing.
 *
 * Dev only, same as `/ui`. `searchParams` makes this dynamic, so the guard runs
 * per request rather than at prerender; it holds either way.
 */
export const metadata: Metadata = {
  title: "UI gallery frame",
  robots: { index: false, follow: false },
};

export default function UiFramePage({
  searchParams,
}: {
  searchParams: { section?: string };
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const entry = findEntry(searchParams.section);
  if (!entry) notFound();

  const { Specimens } = entry;
  return (
    <main className="min-h-screen bg-background p-4">
      <Specimens />
    </main>
  );
}
