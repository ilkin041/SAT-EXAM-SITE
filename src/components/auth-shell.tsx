import type { ReactNode } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { DotLattice } from "@/components/dot-lattice";
import { AUTH_HIGHLIGHTS } from "@/lib/auth-highlights";

/**
 * The chrome shared by `/login`, `/signup`, `/forgot-password` and
 * `/reset-password` (T4.1).
 *
 * All four had the same three problems, four times over: the brand panel was
 * `hidden lg:block`, so a phone got no brand at all; the panel held an icon, two
 * lines and a pill for half a screen; and the markup was copy-pasted, which is
 * why "fix the auth pages" has always meant "fix it four times and miss one".
 *
 * Three rules hold this together:
 *
 *  - **The panel is flat `bg-primary`, and the gradient is on the submit
 *    button.** T1.8 already flattened the panel; the page then had no gradient
 *    at all. `--gradient-primary` is reserved for the page's single primary CTA,
 *    and on an auth page that is unambiguous, so `Button variant="gradient"`
 *    takes it. Both sample the same base indigo — `--primary` is `hsl(228 …)`
 *    and the gradient's first stop is `hsl(228 …)` — which is what the panel and
 *    the old `accent` button (indigo→violet) never did.
 *  - **Below `lg` the panel becomes a 96px band, it does not disappear.** The
 *    band carries the wordmark and one line and is the link back to `/`, which
 *    is why the in-column logo link is `lg:` only: brand appears exactly once at
 *    every width, from 360px up.
 *  - **Text on the panel is full-opacity `text-primary-foreground`.** The old
 *    `text-white/70` measures **4.25:1** on `--primary` and fails AA, and in the
 *    dark theme `--primary` is a *light* indigo, where even solid white is
 *    3.62:1. The token pair is 6.83:1 light / 5.40:1 dark. Hierarchy on this
 *    panel comes from the mono eyebrow against body text, not from dimming.
 */

interface AuthShellProps {
  /** The panel and band headline. Short — it sits beside a five-item list. */
  panelTitle: ReactNode;
  /** One sentence under it, on the wide panel only. */
  panelLede: ReactNode;
  /** The card's `<h1>`. */
  title: string;
  /** One or two sentences under the `<h1>`. */
  lede: ReactNode;
  /** The form. */
  children: ReactNode;
  /** The cross-link under the card — sign up, log in, back to log in. */
  footer: ReactNode;
}

export function AuthShell({
  panelTitle,
  panelLede,
  title,
  lede,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      <AuthBrandBand />
      <AuthBrandPanel title={panelTitle} lede={panelLede} />

      <div className="flex flex-1 items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-[420px]">
          {/* Below `lg` the band above is the wordmark and the way home. */}
          <Link
            href="/"
            className="mb-8 hidden items-center gap-2.5 text-body font-bold text-foreground transition-colors hover:text-primary lg:inline-flex"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="h-4 w-4" aria-hidden />
            </span>
            SAT Practice
          </Link>

          <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-elevated">
            <div className="mb-6">
              <h1 className="text-h2">{title}</h1>
              <p className="mt-2 text-body text-muted-foreground">{lede}</p>
            </div>

            {children}

            <p className="mt-6 text-center text-body text-muted-foreground">{footer}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * The mobile brand band: 96px of solid `--primary`, the lattice, the wordmark
 * and one line. It replaces the panel below `lg` rather than the panel simply
 * vanishing, and it is a link, so the phone keeps the way back to `/` that the
 * in-column logo gives the desktop.
 */
function AuthBrandBand() {
  return (
    <Link
      href="/"
      /*
       * The focus outline is drawn *inside* the band. It is full-bleed, so the
       * default 2px offset puts three of its four edges off-screen and leaves a
       * line under the band as the only indicator. `globals.css` turns it white
       * here — `--ring` is the same indigo as `--primary` in both themes.
       */
      className="relative flex h-24 shrink-0 items-center gap-3 overflow-hidden bg-primary px-4 text-primary-foreground focus-visible:outline-offset-[-4px] sm:px-6 lg:hidden"
    >
      <DotLattice />
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <GraduationCap className="h-5 w-5" aria-hidden />
      </span>
      <span className="relative min-w-0">
        <span className="block text-body font-bold">SAT Practice</span>
        <span className="block text-caption">
          Full-length, timed Digital SAT practice
        </span>
      </span>
    </Link>
  );
}

/**
 * The wide panel. One soft bloom, not the two orbs it had — the brief is one,
 * and a blur in each corner reads as a vignette rather than as light.
 */
function AuthBrandPanel({ title, lede }: { title: ReactNode; lede: ReactNode }) {
  return (
    <div className="relative hidden w-1/2 shrink-0 overflow-hidden bg-primary text-primary-foreground lg:block">
      <DotLattice />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-[30rem] w-[30rem] rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />

      {/* `py-12` and `gap-5`, not the marketing rhythm: five items plus a
          headline at `py-16` measured 810px against a 1280x800 laptop, i.e. the
          panel put a scrollbar on a page that is one screen by construction. */}
      <div className="relative flex h-full flex-col justify-center px-12 py-12 xl:px-16">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur-sm">
          <GraduationCap className="h-6 w-6" aria-hidden />
        </span>

        <h2 className="mt-6 text-h2">{title}</h2>
        <p className="mt-3 max-w-[46ch] text-body-lg">{lede}</p>

        <dl className="mt-8 flex flex-col gap-5 border-t border-primary-foreground/25 pt-8">
          {AUTH_HIGHLIGHTS.map((highlight) => (
            <div key={highlight.id}>
              {/* `.eyebrow`, not `text-eyebrow`: the rung carries size, weight
                  and tracking, the utility adds the mono face and uppercase. */}
              <dt className="eyebrow">{highlight.label}</dt>
              <dd className="mt-1 max-w-[46ch] text-body">{highlight.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
