import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
// KaTeX's stylesheet, minus the ten @font-face blocks the question bank never
// reaches and with the rest glyph-subset. Regenerate with
// `npm run gen:katex-subset` after authoring math that uses new glyphs.
import "./katex-subset.css";
import { Providers } from "./providers";
import { ThemeScript } from "@/components/theme-script";
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_OG_SUBTITLE,
  SITE_TITLE,
  SITE_URL,
  ogImageUrl,
} from "@/lib/site";

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

/**
 * Site-wide metadata defaults (T3.1).
 *
 * `metadataBase` is what makes a page's `alternates.canonical: "/practice"`
 * resolve to an absolute URL — without it Next emits the relative path and logs
 * a build warning, and a relative canonical is ignored by most crawlers.
 *
 * The `template` is why no page writes "— SAT Practice" into its own title any
 * more. `/` opts out with `title.absolute`, since its title already ends in the
 * product name.
 */
/**
 * Next's default viewport tag already allows pinch zoom; this states it, so
 * nobody can quietly take it away. T3.5's screenshots are the reason it matters
 * on this site in particular — a 1440px-wide screen shrunk to a 360px phone is
 * legible only if the reader can zoom into it — but `maximum-scale=1` is a
 * WCAG 1.4.4 failure on every page, not just that one.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_GB",
    images: [
      {
        url: ogImageUrl({ title: SITE_TITLE, subtitle: SITE_OG_SUBTITLE }),
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: SITE_TITLE,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
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
