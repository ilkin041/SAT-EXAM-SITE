import type { Metadata } from "next";

/**
 * Site-level identity and the one place a page's `metadata` is assembled.
 *
 * Every route in the app exports `metadata`, and before T3.1 each one wrote a
 * bare `{ title: "Log in — SAT Practice" }`. That hand-repeated suffix is now
 * the root layout's `title.template`, and everything else a page needs — the
 * canonical URL, the Open Graph card, whether a crawler should index it at all
 * — comes from `pageMetadata()` below.
 *
 * This module is pure: no `next/headers`, no Prisma. It is safe to import from
 * a client component, though nothing currently needs to.
 */

export const SITE_NAME = "SAT Practice";

export const SITE_TITLE = "Digital SAT Practice — Bluebook-style practice tests";

export const SITE_DESCRIPTION =
  "Full-length, timed Digital SAT practice tests with adaptive module routing, " +
  "200–800 scaled scoring, per-domain breakdowns and a full answer review.";

/**
 * Absolute origin, no trailing slash.
 *
 * Resolution order matters. `NEXT_PUBLIC_SITE_URL` is the deliberate answer and
 * wins outright. `VERCEL_URL` is the per-deployment hostname, which is right for
 * a preview and wrong for production — production sets the explicit variable.
 * `NEXTAUTH_URL` is the existing origin the app already trusts for callbacks, so
 * it is a better guess than localhost when nothing else is set.
 */
function resolveSiteUrl(): string {
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  return candidate.replace(/\/+$/, "");
}

export const SITE_URL = resolveSiteUrl();

/** Joins a root-relative path onto `SITE_URL`. `absoluteUrl("/")` → the origin. */
export function absoluteUrl(path: string): string {
  if (path === "/") return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * The card's default supporting line. `SITE_DESCRIPTION` is written for a SERP
 * snippet and runs past the template's box — clamping it lands mid-clause. This
 * is the same claim in one line.
 */
export const SITE_OG_SUBTITLE =
  "Full-length, timed practice with adaptive modules and 200–800 scaled scoring.";

/**
 * Longest title the OG template lays out without overflowing its box. Enforced
 * here rather than in the route so a caller sees the truncation in its own
 * metadata, and so the route's own clamp is a second line of defence against a
 * hand-typed query string rather than the only one.
 */
const OG_TITLE_MAX = 70;
const OG_SUBTITLE_MAX = 110;

/** Truncates on a word boundary, so a long title ends in a word, not a stub. */
function clampWords(value: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export interface OgImageParams {
  /** Headline on the card. Falls back to the site title. */
  title?: string;
  /** One supporting line under it. Falls back to nothing. */
  subtitle?: string;
  /** Small mono label above the headline — the section the page belongs to. */
  eyebrow?: string;
}

/** URL of the dynamic card for a page. One template, parameterised. */
export function ogImageUrl({ title, subtitle, eyebrow }: OgImageParams = {}): string {
  const params = new URLSearchParams();
  if (title) params.set("title", clampWords(title, OG_TITLE_MAX));
  if (subtitle) params.set("subtitle", clampWords(subtitle, OG_SUBTITLE_MAX));
  if (eyebrow) params.set("eyebrow", clampWords(eyebrow, 32));

  const query = params.toString();
  return `${SITE_URL}/api/og${query ? `?${query}` : ""}`;
}

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export interface PageMetadataInput {
  /**
   * Page title, without the site name — the root layout's template appends it.
   * Pass `titleAbsolute` instead for a page that owns its whole title tag.
   */
  title?: string;
  /** Replaces the template entirely. The landing page is the only user. */
  titleAbsolute?: string;
  description?: string;
  /**
   * Root-relative path of the page, used for the canonical link and the OG
   * `url`. Omit on a route whose URL contains an id — a self-referential
   * canonical to a page only its owner can load tells a crawler nothing, and
   * those routes are `noindex` anyway.
   */
  path?: string;
  /**
   * Keeps the page out of the index. Every authenticated surface passes this:
   * a crawler that follows a link to `/dashboard` gets the login page, and an
   * indexed login redirect is worse than no entry at all.
   */
  noindex?: boolean;
  /** Overrides for the OG card, when the page title makes a poor headline. */
  og?: OgImageParams;
}

/**
 * Builds a page's `metadata`. Canonical, Open Graph and Twitter come out
 * consistent because no page assembles them by hand.
 */
export function pageMetadata({
  title,
  titleAbsolute,
  description,
  path,
  noindex,
  og,
}: PageMetadataInput): Metadata {
  const resolvedTitle = titleAbsolute ?? title ?? SITE_TITLE;
  const resolvedDescription = description ?? SITE_DESCRIPTION;

  // The card's headline is the page title; its subtitle is the site's one-liner
  // unless the caller has something more specific. A page title on the card and
  // the site's claim beneath it reads as a page *of* the product — a page title
  // alone reads as a broken template.
  const image = ogImageUrl({
    title: og?.title ?? title ?? SITE_TITLE,
    subtitle: og?.subtitle ?? SITE_OG_SUBTITLE,
    eyebrow: og?.eyebrow,
  });

  const metadata: Metadata = {
    title: titleAbsolute ? { absolute: titleAbsolute } : title,
    description: resolvedDescription,
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_GB",
      ...(path ? { url: absoluteUrl(path) } : {}),
      images: [
        {
          url: image,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: resolvedTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription,
      images: [image],
    },
  };

  if (path) metadata.alternates = { canonical: path };
  if (noindex) metadata.robots = { index: false, follow: false };

  return metadata;
}
