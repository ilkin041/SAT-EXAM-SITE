import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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

const PUBLIC_PATHS = ["/", "/login", "/signup", "/practice"];

const PUBLIC_PREFIXES = [
  "/api/auth",
  "/_next",
  "/favicon",
  "/uploads",
  "/practice/", // public test taking
  // The test, attempt, and results pages handle public/anonymous access in
  // the route handler itself (anonymous attempts on public tests).
  "/test/",
  "/results/",
  "/api/tests/",
  "/api/attempts/",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  // Decode the JWT session cookie. No DB, no providers — just AUTH_SECRET +
  // crypto. Returns `null` if the cookie is absent, invalid, or expired.
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    // v5 uses the same cookie name pattern as v4 for credentials/JWT sessions.
    // Auto-detected by default — left explicit here for clarity over HTTPS.
    secureCookie: process.env.NODE_ENV === "production",
  });

  // Not signed in → bounce to login with a return path.
  if (!token) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Admin-only area. Role lives on the JWT (set by the `jwt` callback in
  // src/auth.ts) so this works without a DB hit.
  const role = (token as { role?: string }).role;
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
