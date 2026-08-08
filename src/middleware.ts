import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  ANALYTICS_SESSION_COOKIE,
  ANALYTICS_SESSION_HEADER,
  ANALYTICS_SESSION_MAX_AGE_SECONDS,
} from "@/lib/analytics-events";

/**
 * Edge middleware — kept deliberately thin to stay under Vercel's 1 MB limit.
 *
 * Reads the session cookie via `getToken`, which is a JWT-only helper. It does
 * NOT import anything from `@/auth`, `@prisma/client`, or `bcryptjs` — those
 * would pull the full Auth.js config tree (providers, adapters, db client) into
 * the Edge bundle and blow past the limit.
 *
 * All authorization decisions here are based on the JWT payload we set in the
 * `jwt` callback in src/auth.ts (`id` and `role`). The role is trustworthy
 * because the JWT is signed with AUTH_SECRET.
 */

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/practice",
  "/forgot-password",
  "/reset-password",
  // Linked from the marketing footer, so they must resolve logged out.
  "/privacy",
  "/terms",
  "/contact",
  // Dev-only component gallery. `notFound()`s in a production build, so
  // whitelisting it here cannot expose anything — but without the entry it
  // redirects to /login in dev, which is the one place it needs to work.
  "/ui",
];

const PUBLIC_PREFIXES = [
  "/api/auth",
  "/_next",
  "/favicon",
  "/practice/", // public test taking
  // The test, attempt, and results pages handle public/anonymous access in
  // the route handler itself (anonymous attempts on public tests).
  "/test/",
  "/results/",
  "/api/tests/",
  "/api/attempts/",
  // Cron handlers authenticate their own Vercel bearer token.
  "/api/cron/",
  // The gallery's viewport-simulator iframes live under /ui/frame.
  "/ui/",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * The T2.3 analytics session id.
 *
 * A random opaque value, httpOnly so page scripts cannot read it, and carrying
 * nothing about the person — it exists to join a signup to the attempt that
 * followed it, and for no other purpose. See `docs/analytics-events.md`.
 *
 * Minted here rather than in a route handler because a Server Component cannot
 * set a cookie, and `results_viewed` is a Server Component. The id is forwarded
 * on a request header as well as set as a cookie: on the request that mints it
 * the `Set-Cookie` is not yet readable by the app, so without the header the
 * first event of every session would land on a different id than the second.
 */
function withAnalyticsSession(
  req: NextRequest,
  build: (requestHeaders: Headers) => NextResponse,
): NextResponse {
  const existing = req.cookies.get(ANALYTICS_SESSION_COOKIE)?.value;
  const sessionId = existing || crypto.randomUUID();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(ANALYTICS_SESSION_HEADER, sessionId);

  const res = build(requestHeaders);
  if (!existing) {
    res.cookies.set(ANALYTICS_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ANALYTICS_SESSION_MAX_AGE_SECONDS,
    });
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) {
    return withAnalyticsSession(req, (headers) =>
      NextResponse.next({ request: { headers } }),
    );
  }

  // Decode the JWT session cookie. No DB, no providers — just AUTH_SECRET +
  // crypto. Returns `null` if the cookie is absent, invalid, or expired.
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    // v5 uses the same cookie name pattern as v4 for credentials/JWT sessions.
    // Auto-detected by default — left explicit here for clarity over HTTPS.
    secureCookie: process.env.NODE_ENV === "production",
  });

  // Not signed in → bounce to login with a return path. The redirect still
  // carries the cookie: a visitor who signs up next should keep the session id
  // they arrived with, or the funnel loses its own first step.
  if (!token) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return withAnalyticsSession(req, () => NextResponse.redirect(url));
  }

  // Admin-only area. Role lives on the JWT (set by the `jwt` callback in
  // src/auth.ts) so this works without a DB hit.
  const role = (token as { role?: string }).role;
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return withAnalyticsSession(req, () =>
      NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin)),
    );
  }

  return withAnalyticsSession(req, (headers) =>
    NextResponse.next({ request: { headers } }),
  );
}

export const config = {
  // Run on everything except static assets.
  //
  // Fonts are in this list because `/katex/fonts/*.woff2` is requested by the
  // stylesheet on every page, including the logged-out ones. Without the
  // exemption each font 307s to /login and math renders in a fallback serif
  // for exactly the visitors — anonymous test takers on /practice — who have
  // no way to notice it is wrong.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|otf)$).*)",
  ],
};
