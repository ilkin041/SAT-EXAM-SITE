import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * `/robots.txt`.
 *
 * The disallow list mirrors the authenticated surface, and every page on it
 * also sends `robots: noindex` through `pageMetadata()`. Two mechanisms because
 * they do different jobs: `Disallow` stops the fetch, `noindex` stops the entry
 * — and a URL that is only disallowed can still be indexed from an inbound link
 * with no snippet, which is the worst of both.
 *
 * `/api/og` is deliberately *not* disallowed: it is the Open Graph image, and a
 * crawler that cannot fetch it renders every share as a blank card.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/account",
          "/admin",
          "/results",
          "/test",
          "/ui",
          "/forgot-password",
          "/reset-password",
          // Everything except the OG card, which social crawlers must reach.
          "/api/account",
          "/api/admin",
          "/api/attempts",
          "/api/auth",
          "/api/cron",
          "/api/tests",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
