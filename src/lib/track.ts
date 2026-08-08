import { cookies, headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ANALYTICS_SESSION_COOKIE,
  ANALYTICS_SESSION_HEADER,
  SYSTEM_SESSION_ID,
  sanitizeProps,
  type AnalyticsEventName,
} from "@/lib/analytics-events";
import {
  deviceTypeFromUserAgent,
  normalizeViewportWidth,
  truncateUserAgent,
} from "@/lib/device";

/**
 * The event writer (T2.3).
 *
 * **This module reads `next/headers` and imports `prisma`. It is server-only —
 * never import it from a client component.** The same rule as
 * `rendered-question.ts` and `taxonomy-db.ts`; `import type` is fine.
 *
 * **`track()` never blocks and never throws.** It returns a promise that always
 * resolves, and every call site fires it with `void` rather than awaiting: an
 * analytics row is worth strictly less than the request it would delay, and a
 * failed insert must never be the reason a student's module submission 500s.
 * The promise is returned so tests can await it.
 *
 * The cost of that choice: on a platform that freezes the process the moment
 * the response is sent, a floating write can be dropped. This app runs a
 * long-lived Node server, where it is not. When the project moves to Next 15,
 * wrap the body in `after()` and the caveat goes away.
 */

/**
 * The current browser's session id.
 *
 * Prefers the header the middleware forwards, because on the request that
 * *mints* the id the `Set-Cookie` is not yet readable. Falls back to the cookie
 * on subsequent requests, and to `SYSTEM_SESSION_ID` outside a request scope —
 * which is where the cron sweeper runs.
 */
export function getAnalyticsSessionId(): string {
  try {
    const fromHeader = headers().get(ANALYTICS_SESSION_HEADER);
    if (fromHeader) return fromHeader;
  } catch {
    /* not in a request scope */
  }
  try {
    const fromCookie = cookies().get(ANALYTICS_SESSION_COOKIE)?.value;
    if (fromCookie) return fromCookie;
  } catch {
    /* not in a request scope */
  }
  return SYSTEM_SESSION_ID;
}

function requestUserAgent(): string | null {
  try {
    return truncateUserAgent(headers().get("user-agent"));
  } catch {
    return null;
  }
}

/**
 * Create the session row if it is missing, and fill in anything newly known.
 *
 * Called by every `track()`, so a browser that never does anything countable
 * leaves no row at all — the table is a record of activity, not of visits.
 *
 * The update is deliberately narrow: `deviceType` and `userAgent` are only
 * written while they are still unknown, so a later request from a different
 * client (a cron job, a curl) cannot rewrite what the browser reported first.
 */
async function ensureSession(params: {
  sessionId: string;
  userId: string | null;
  userAgent: string | null;
  viewportWidth: number | null;
}) {
  // The sentinel is one row shared by every job that ever runs, so nothing
  // browser-shaped may be written to it: a `userId` there would be whichever
  // attempt the sweeper happened to close last, and a `userAgent` would be the
  // runner's. Both would read as facts about a person. The events themselves
  // still carry their own `userId`.
  if (params.sessionId === SYSTEM_SESSION_ID) {
    await prisma.analyticsSession.upsert({
      where: { id: SYSTEM_SESSION_ID },
      create: { id: SYSTEM_SESSION_ID, deviceType: "UNKNOWN" },
      update: {},
    });
    return;
  }

  const deviceType = deviceTypeFromUserAgent(params.userAgent);
  await prisma.analyticsSession.upsert({
    where: { id: params.sessionId },
    create: {
      id: params.sessionId,
      userId: params.userId,
      deviceType,
      userAgent: params.userAgent,
      viewportWidth: params.viewportWidth,
    },
    update: {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.viewportWidth !== null ? { viewportWidth: params.viewportWidth } : {}),
      ...(params.userAgent ? { userAgent: params.userAgent } : {}),
      ...(deviceType !== "UNKNOWN" ? { deviceType } : {}),
    },
  });
}

export interface TrackOptions {
  /** Signed-in user, when there is one. Anonymous attempts pass null. */
  userId?: string | null;
  /** Scalar labels only — see `sanitizeProps`. Never PII. */
  props?: Record<string, unknown>;
  /**
   * CSS-pixel viewport width, sent by the client at attempt start. This is the
   * one thing the server cannot observe, so it arrives on the request that
   * needs it and is stored on the session, not on the event.
   */
  viewportWidth?: number | null;
  /** Override the resolved session — the cron sweeper has no browser. */
  sessionId?: string;
}

export function track(
  name: AnalyticsEventName,
  options: TrackOptions = {},
): Promise<void> {
  const sessionId = options.sessionId ?? getAnalyticsSessionId();
  const userId = options.userId ?? null;
  const userAgent = requestUserAgent();
  const viewportWidth = normalizeViewportWidth(options.viewportWidth ?? undefined);

  const { props, dropped } = sanitizeProps(options.props);
  if (dropped.length > 0) {
    // The keys are already gone by this point — this is only about making the
    // call site visible. Loud in dev so it gets fixed; a warning in production,
    // because throwing here would break the never-fails guarantee above.
    const message = `track("${name}") dropped disallowed props: ${dropped.join(", ")}`;
    if (process.env.NODE_ENV === "development") console.error(message);
    else console.warn(message);
  }

  return (async () => {
    await ensureSession({ sessionId, userId, userAgent, viewportWidth });
    await prisma.analyticsEvent.create({
      data: {
        sessionId,
        userId,
        name,
        props: (props ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  })().catch((error) => {
    // Swallowed on purpose. See the guarantee at the top of this file.
    console.error(`[analytics] ${name} failed to record:`, error);
  });
}
