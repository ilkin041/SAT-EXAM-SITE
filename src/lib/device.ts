import type { DeviceType } from "@prisma/client";

/**
 * Coarse device classification from a User-Agent string.
 *
 * Deliberately crude and dependency-free. The question this feeds is T10.1's
 * "does mobile matter" — a three-bucket answer with a bot escape hatch. It is
 * not a device database and must never grow into one: the moment this needs
 * model-level precision it has become fingerprinting, which is the thing
 * `docs/analytics-events.md` promises we do not do.
 *
 * Order matters. `iPad` and Android tablets both contain tokens the mobile
 * branch would otherwise claim, so tablet is tested first; bots are tested
 * before everything because plenty of crawlers advertise a mobile UA.
 */
export function deviceTypeFromUserAgent(userAgent: string | null | undefined): DeviceType {
  if (!userAgent) return "UNKNOWN";
  const ua = userAgent.toLowerCase();

  if (/bot|crawler|spider|crawling|headlesschrome|lighthouse|preview|monitor|curl|wget|python-requests|axios|node-fetch/.test(ua)) {
    return "BOT";
  }

  // iPadOS 13+ reports a desktop Safari UA. `Macintosh` plus a touch hint is
  // the only signal left, and we do not get the touch hint server-side — so an
  // iPad in desktop mode counts as DESKTOP. That is a known, documented gap,
  // not something to guess around.
  if (/ipad|android(?!.*mobile)|tablet|kindle|silk|playbook/.test(ua)) return "TABLET";

  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini|windows phone/.test(ua)) {
    return "MOBILE";
  }

  if (/windows|macintosh|mac os x|linux|cros|x11/.test(ua)) return "DESKTOP";

  return "UNKNOWN";
}

/** Longest UA we keep. Real ones are well under this; the cap bounds abuse. */
export const USER_AGENT_MAX_LENGTH = 512;

export function truncateUserAgent(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const trimmed = userAgent.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, USER_AGENT_MAX_LENGTH);
}

/** Plausible CSS-pixel widths. Anything outside this is a client bug or a lie. */
export function normalizeViewportWidth(width: unknown): number | null {
  if (typeof width !== "number" || !Number.isFinite(width)) return null;
  const rounded = Math.round(width);
  if (rounded < 200 || rounded > 10_000) return null;
  return rounded;
}
