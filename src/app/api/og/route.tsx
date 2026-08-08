import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  SITE_NAME,
  SITE_TITLE,
} from "@/lib/site";

/**
 * The one Open Graph card template, parameterised by `?title=`, `?subtitle=`
 * and `?eyebrow=`. Build a URL with `ogImageUrl()` from `@/lib/site` rather
 * than by hand — it applies the same length clamps this route re-applies below.
 *
 * Runs on the edge because satori is the whole cost of the response and the
 * route touches neither Prisma nor the session.
 *
 * **Why the colours are literals.** Satori has no stylesheet and no cascade: it
 * lays out inline styles only, so `hsl(var(--primary))` resolves to nothing and
 * the card renders black on black. The design tokens cannot reach this file,
 * which is why `.eslintrc.js` exempts it from `sat/no-raw-color` and
 * `sat/no-inline-color-style` the same way it exempts the Bluebook chrome.
 * The values below are the *dark* token set, converted to hex — a social card
 * is chrome-less and has no theme to follow, so it commits to one.
 *
 * Fonts: none are registered, so satori uses the runtime's bundled default
 * rather than fetching Plex Mono over the network on every crawl. The card is
 * six words; it does not need the brand face badly enough to add a fetch that
 * can fail and blank the image.
 */

export const runtime = "edge";

/** Mirrors `--background` / `--foreground` / `--primary` in `.dark`. */
const BACKGROUND = "#080d1a";
const SURFACE = "#0e1526";
const FOREGROUND = "#e6eaf3";
const MUTED = "#8b93a7";
const PRIMARY = "#6f8ae8";
const BORDER = "#1e2740";

const TITLE_MAX = 70;
const SUBTITLE_MAX = 110;
const EYEBROW_MAX = 32;

function clamp(value: string | null, max: number): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const title = clamp(params.get("title"), TITLE_MAX) || SITE_TITLE;
  const subtitle = clamp(params.get("subtitle"), SUBTITLE_MAX);
  const eyebrow = clamp(params.get("eyebrow"), EYEBROW_MAX);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: `linear-gradient(135deg, ${BACKGROUND} 0%, ${SURFACE} 100%)`,
          color: FOREGROUND,
        }}
      >
        {/* Accent rule, standing in for the brand gradient. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: OG_IMAGE_WIDTH,
            height: 8,
            background: `linear-gradient(90deg, ${PRIMARY} 0%, ${BORDER} 100%)`,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column" }}>
          {eyebrow ? (
            <div
              style={{
                fontSize: 24,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: PRIMARY,
                marginBottom: 24,
              }}
            >
              {eyebrow}
            </div>
          ) : null}

          <div
            style={{
              fontSize: title.length > 42 ? 68 : 82,
              lineHeight: 1.08,
              fontWeight: 700,
              letterSpacing: -2,
              maxWidth: 960,
            }}
          >
            {title}
          </div>

          {subtitle ? (
            <div
              style={{
                marginTop: 28,
                fontSize: 30,
                lineHeight: 1.4,
                color: MUTED,
                maxWidth: 900,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: 12,
              background: PRIMARY,
              color: BACKGROUND,
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            S
          </div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{SITE_NAME}</div>
        </div>
      </div>
    ),
    { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT },
  );
}
