import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * `/sitemap.xml`.
 *
 * **Only routes a logged-out visitor can actually read.** Everything behind the
 * middleware — `/dashboard`, `/account`, `/results/*`, `/test/*`, `/admin/*` —
 * answers a crawler with a 307 to `/login`, so listing it would submit a URL
 * whose response is a redirect to a page already in the sitemap.
 *
 * `/forgot-password` and `/reset-password` are public but deliberately absent:
 * they are steps in a flow reached from `/login`, and a reset page indexed on
 * its own is a dead end (its token comes from an email).
 *
 * The list is static because every public route is. There is no public
 * per-test or per-question URL to enumerate — `/practice` is one page that
 * renders whatever `Test.isPublic` currently holds. When T3.8 adds content
 * pages they go here.
 */

interface Entry {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}

const PUBLIC_ROUTES: readonly Entry[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/practice", changeFrequency: "weekly", priority: 0.9 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.7 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.6 },
  { path: "/login", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
