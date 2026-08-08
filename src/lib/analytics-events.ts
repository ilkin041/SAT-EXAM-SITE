/**
 * The product event catalogue (T2.3).
 *
 * Pure and dependency-free so tests and client code can import it; the writer
 * lives in `src/lib/track.ts` and is server-only.
 *
 * Two rules govern everything here:
 *
 *  1. **First-party only.** These rows go to our own Postgres. There is no
 *     third-party analytics script anywhere in the app and adding one is not a
 *     silent decision.
 *  2. **No PII in `props`.** `props` answers "what happened", never "who".
 *     Identity is `userId` (a foreign id, nullable) and `sessionId` (a random
 *     cookie value). `sanitizeProps` below enforces this at the write.
 *
 * What we store is documented in `docs/analytics-events.md`, which is the
 * source for the `/privacy` copy in T3.8.
 */

export const ANALYTICS_EVENTS = [
  // Acquisition
  "signup_completed",
  "onboarding_completed",
  "onboarding_skipped",
  // Test taking
  "attempt_started",
  "module_completed",
  "attempt_submitted",
  "attempt_abandoned",
  // Post-test
  "results_viewed",
  "review_opened",
  // Drill
  "drill_started",
  "drill_completed",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

/**
 * The eleven in the order the funnel reads. `/admin/analytics` renders this
 * list, so a new event needs a decision about where it sits rather than
 * appearing at the bottom by accident.
 */
export const FUNNEL_STEPS: readonly {
  name: AnalyticsEventName;
  label: string;
  /** Set when the step has no call site yet — the page says so instead of showing a bare 0. */
  blockedBy?: string;
}[] = [
  { name: "signup_completed", label: "Signed up" },
  { name: "onboarding_completed", label: "Finished onboarding", blockedBy: "T4.3" },
  { name: "onboarding_skipped", label: "Skipped onboarding", blockedBy: "T4.3" },
  { name: "attempt_started", label: "Started a test" },
  { name: "module_completed", label: "Completed a module" },
  { name: "attempt_submitted", label: "Submitted a test" },
  { name: "attempt_abandoned", label: "Abandoned a test" },
  { name: "results_viewed", label: "Viewed results" },
  { name: "review_opened", label: "Opened review" },
  { name: "drill_started", label: "Started a drill", blockedBy: "T8.3" },
  { name: "drill_completed", label: "Completed a drill", blockedBy: "T8.3" },
];

/** Sentinel session for events produced by a job, not a browser — the cron sweeper. */
export const SYSTEM_SESSION_ID = "system";

/** Cookie holding the random per-browser session id. Issued by `middleware.ts`. */
export const ANALYTICS_SESSION_COOKIE = "sat_sid";

/**
 * Header the middleware forwards the id on, so a server component reading it
 * during the *same* request that minted it sees the new value — a `Set-Cookie`
 * is not readable until the next request.
 */
export const ANALYTICS_SESSION_HEADER = "x-sat-analytics-session";

export const ANALYTICS_SESSION_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

// ---------- PII guard ----------

/**
 * Key names that may not appear in `props`.
 *
 * Two lists, because substring matching on short words is a trap: `ip` is
 * inside `skipped`, and `name` is inside `domainName`. Those two are matched as
 * whole keys; everything long enough to be unambiguous is matched as a
 * substring so `respondedAnswerText` cannot slip past `answer`.
 */
const FORBIDDEN_KEY_EXACT = ["name", "email", "ip", "ipaddress", "ua"];

const FORBIDDEN_KEY_SUBSTRINGS = [
  "email",
  "password",
  "secret",
  "token",
  "useragent",
  "user_agent",
  "response",
  "answer",
  "address",
  "phone",
  "fullname",
  "username",
  "firstname",
  "lastname",
  "displayname",
];

const EMAIL_SHAPED = /[^\s@]+@[^\s@]+\.[^\s@]+/;

function keyIsForbidden(key: string): boolean {
  const folded = key.toLowerCase().replace(/[^a-z]/g, "");
  if (FORBIDDEN_KEY_EXACT.includes(folded)) return true;
  return FORBIDDEN_KEY_SUBSTRINGS.some((pattern) => folded.includes(pattern));
}

export type AnalyticsProps = Record<string, string | number | boolean | null>;

/** Anything `sanitizeProps` refused, so a test (and dev) can see why. */
export interface SanitizeResult {
  props: AnalyticsProps | null;
  dropped: string[];
}

/**
 * Strip anything that could identify a person, then flatten to scalars.
 *
 * This is a *guard*, not a cleaner: dropping a key silently in production is
 * better than writing PII, and `track()` throws on a drop in development so the
 * offending call site is fixed rather than quietly truncated.
 */
export function sanitizeProps(props: unknown): SanitizeResult {
  if (!props || typeof props !== "object" || Array.isArray(props)) {
    return { props: null, dropped: [] };
  }
  const out: AnalyticsProps = {};
  const dropped: string[] = [];

  for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
    if (value === undefined) continue;
    if (keyIsForbidden(key)) {
      dropped.push(key);
      continue;
    }
    if (value === null || typeof value === "boolean") {
      out[key] = value;
      continue;
    }
    if (typeof value === "number") {
      out[key] = Number.isFinite(value) ? value : null;
      continue;
    }
    if (typeof value === "string") {
      if (EMAIL_SHAPED.test(value)) {
        dropped.push(key);
        continue;
      }
      // A cap, because a prop is a label — free text belongs nowhere here.
      out[key] = value.slice(0, 120);
      continue;
    }
    // Objects, arrays, functions: not a label. Refused rather than serialized.
    dropped.push(key);
  }

  return { props: Object.keys(out).length > 0 ? out : null, dropped };
}
