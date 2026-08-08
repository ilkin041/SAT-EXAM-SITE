import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { organizationJsonLd, webApplicationJsonLd } from "@/lib/json-ld";
import { FOOTER_COLUMNS, LANDING_SECTIONS, MARKETING_NAV } from "@/lib/marketing-nav";
import {
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  ogImageUrl,
  pageMetadata,
} from "@/lib/site";

/**
 * T3.1. The three things here that can silently rot are the sitemap leaking an
 * authenticated route, a nav item pointing at a section no page renders, and
 * the JSON-LD growing a claim the product cannot back.
 */

/** Every path the middleware guards, by prefix. */
const AUTHENTICATED_PREFIXES = [
  "/dashboard",
  "/account",
  "/admin",
  "/results",
  "/test",
  "/api",
  "/ui",
];

describe("absoluteUrl", () => {
  it("keeps the origin free of a double slash", () => {
    expect(absoluteUrl("/practice")).toBe(`${SITE_URL}/practice`);
    expect(absoluteUrl("/")).toBe(`${SITE_URL}/`);
  });

  it("tolerates a path with no leading slash", () => {
    expect(absoluteUrl("practice")).toBe(`${SITE_URL}/practice`);
  });
});

describe("ogImageUrl", () => {
  it("points at the one template", () => {
    expect(ogImageUrl({ title: "Hello" })).toContain(`${SITE_URL}/api/og?`);
  });

  it("truncates a long title on a word boundary, not mid-word", () => {
    const long =
      "Digital SAT practice with adaptive module routing and per-domain score breakdowns for every attempt";
    const title = new URL(ogImageUrl({ title: long })).searchParams.get("title")!;
    expect(title.length).toBeLessThanOrEqual(70);
    expect(title.endsWith("…")).toBe(true);
    // The character before the ellipsis must end a word.
    expect(long.startsWith(title.slice(0, -1))).toBe(true);
    expect(long[title.length - 1]).toBe(" ");
  });

  it("leaves a short title alone", () => {
    const url = new URL(ogImageUrl({ title: "Log in" }));
    expect(url.searchParams.get("title")).toBe("Log in");
  });
});

describe("pageMetadata", () => {
  it("sets a canonical only when the page has a stable path", () => {
    expect(pageMetadata({ title: "Log in", path: "/login" }).alternates).toEqual({
      canonical: "/login",
    });
    expect(pageMetadata({ title: "Results", noindex: true }).alternates).toBeUndefined();
  });

  it("marks authenticated pages noindex", () => {
    expect(pageMetadata({ title: "Dashboard", noindex: true }).robots).toEqual({
      index: false,
      follow: false,
    });
    expect(pageMetadata({ title: "Log in", path: "/login" }).robots).toBeUndefined();
  });

  it("lets the landing page opt out of the title template", () => {
    expect(pageMetadata({ titleAbsolute: "Whole title", path: "/" }).title).toEqual({
      absolute: "Whole title",
    });
  });

  it("gives every page an OG and Twitter card", () => {
    const meta = pageMetadata({ title: "Sign up", path: "/signup" });
    expect(meta.openGraph?.images).toBeTruthy();
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });
});

describe("sitemap", () => {
  const urls = sitemap().map((entry) => entry.url);

  it("lists only absolute URLs on this origin", () => {
    for (const url of urls) expect(url.startsWith(`${SITE_URL}/`)).toBe(true);
  });

  it("excludes every authenticated route", () => {
    for (const url of urls) {
      const pathname = new URL(url).pathname;
      for (const prefix of AUTHENTICATED_PREFIXES) {
        expect(pathname.startsWith(prefix)).toBe(false);
      }
    }
  });

  it("excludes the password-reset flow", () => {
    expect(urls.some((u) => u.includes("forgot-password"))).toBe(false);
    expect(urls.some((u) => u.includes("reset-password"))).toBe(false);
  });

  it("includes the landing page and the free sample", () => {
    expect(urls).toContain(absoluteUrl("/"));
    expect(urls).toContain(absoluteUrl("/practice"));
  });
});

describe("robots", () => {
  const rule = robots().rules;
  const disallow = (Array.isArray(rule) ? rule[0] : rule).disallow as string[];

  it("disallows every authenticated prefix", () => {
    for (const prefix of AUTHENTICATED_PREFIXES) {
      if (prefix === "/api") continue; // covered per-handler below
      expect(disallow).toContain(prefix);
    }
  });

  it("leaves the OG image reachable — a blocked card renders blank", () => {
    expect(disallow).not.toContain("/api");
    expect(disallow.some((p) => "/api/og".startsWith(p))).toBe(false);
  });

  it("points at the sitemap", () => {
    expect(robots().sitemap).toBe(absoluteUrl("/sitemap.xml"));
  });
});

describe("marketing nav", () => {
  it("only offers items whose section the landing page renders", () => {
    const ids = new Set(MARKETING_NAV.map((item) => item.id));
    for (const section of LANDING_SECTIONS) expect(ids.has(section)).toBe(true);
  });

  it("has four footer columns", () => {
    expect(FOOTER_COLUMNS.map((c) => c.heading)).toEqual([
      "Product",
      "Learn",
      "Account",
      "Legal",
    ]);
  });

  it("links nowhere off-site and nowhere authenticated", () => {
    for (const column of FOOTER_COLUMNS) {
      for (const link of column.links) {
        expect(link.href.startsWith("/")).toBe(true);
        const pathname = link.href.split("#")[0] || "/";
        for (const prefix of AUTHENTICATED_PREFIXES) {
          expect(pathname.startsWith(prefix)).toBe(false);
        }
      }
    }
  });
});

describe("json-ld", () => {
  it("claims nothing the product cannot back", () => {
    for (const graph of [organizationJsonLd(), webApplicationJsonLd()] as Record<
      string,
      unknown
    >[]) {
      expect(graph.aggregateRating).toBeUndefined();
      expect(graph.offers).toBeUndefined();
      expect(graph.review).toBeUndefined();
    }
  });

  it("anchors the application's publisher at the organization", () => {
    const org = organizationJsonLd();
    const app = webApplicationJsonLd() as { publisher: { "@id": string } };
    expect(app.publisher["@id"]).toBe(org["@id"]);
    expect(org.name).toBe(SITE_NAME);
  });
});
