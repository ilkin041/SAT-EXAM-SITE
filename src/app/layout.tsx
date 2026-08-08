import type { Metadata } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
// KaTeX's stylesheet, minus the ten @font-face blocks the question bank never
// reaches and with the rest glyph-subset. Regenerate with
// `npm run gen:katex-subset` after authoring math that uses new glyphs.
import "./katex-subset.css";
import { Providers } from "./providers";
import { ThemeScript } from "@/components/theme-script";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

/*
 * Every number in the product is mono (see the `.tabular` utility in
 * globals.css): timers, scores, counts, percentages, dates, table figures.
 * `latin` only and three weights — 400 for table figures, 500 for emphasised
 * counts, 600 for eyebrows and score displays. Nothing needs a mono 700, so it
 * is not loaded.
 */
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SAT Practice Platform",
  description: "Self-hosted digital SAT-style practice testing platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
