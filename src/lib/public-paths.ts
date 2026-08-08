/**
 * Which paths resolve without a session.
 *
 * Lifted out of `middleware.ts` in T3.7 so a test can read it. The bug that
 * prompted it: `/faq` shipped in the footer and the sitemap but not in this
 * list, so it answered a logged-out visitor — the only kind it exists for —
 * with a 307 to `/login`. Nothing catches that. `tsc` cannot, the build cannot,
 * and the page renders perfectly for whoever is signed in while writing it.
 * `tests/site-metadata.test.ts` now asserts every sitemap entry appears here.
 *
 * Pure data, no imports, so importing it costs the Edge bundle two arrays and
 * a test nothing. Everything about *how* it is used stays in the middleware.
 */

export const PUBLIC_PATHS: readonly string[] = [
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
  // T3.7. In the footer and the sitemap, and the whole point of it is to answer
  // someone who has not signed up.
  "/faq",
  // T3.8. Same category: the scoring policy, the format guide and the tutor
  // page all exist to answer somebody who has no account, and `/sat-format` is
  // the one written to be found from a search rather than from this site.
  "/scoring",
  "/sat-format",
  "/for-tutors",
  // Dev-only component gallery. `notFound()`s in a production build, so
  // whitelisting it here cannot expose anything — but without the entry it
  // redirects to /login in dev, which is the one place it needs to work.
  "/ui",
  // T3.1. The matcher in `middleware.ts` exempts static *files*, but these three
  // are routes — Next generates them from `sitemap.ts`, `robots.ts` and the OG
  // handler. Without the entries a crawler asking for /robots.txt gets a 307 to
  // /login, which is both a useless robots file and an indexed login redirect.
  "/sitemap.xml",
  "/robots.txt",
  "/api/og",
];

export const PUBLIC_PREFIXES: readonly string[] = [
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
  // T3.3. The landing demo grades answers for logged-out visitors, so the
  // handler has to resolve without a session. It rate-limits by IP and will
  // only ever read a question carrying `publicDemo`.
  "/api/demo/",
  // The gallery's viewport-simulator iframes live under /ui/frame.
  "/ui/",
];

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
