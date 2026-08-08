/**
 * The marketing chrome's link inventory — header nav and footer columns in one
 * place, so the desktop bar, the mobile sheet and the footer cannot drift.
 *
 * Pure data. Imported by both server and client components.
 */

export interface MarketingNavItem {
  /** Matches the `id` of the section it scrolls to. */
  id: string;
  label: string;
  href: string;
}

/**
 * Header nav, in order.
 *
 * Four entries were specified — Product · For tutors · Scoring · FAQ — but the
 * last three scrolled to sections that did not exist: the tutor band and the
 * scoring block are T3.8 and the FAQ was T3.7. A nav item that scrolls nowhere
 * is a broken link, so `MarketingHeader` renders the subset the page declares
 * through its `sections` prop and `/` declares only what it actually contains.
 * T3.7 shipped the FAQ and added `faq` to `LANDING_SECTIONS` below, which is the
 * whole of what it took to light that item up; `for-tutors` and `scoring` still
 * wait on T3.8.
 */
export const MARKETING_NAV: readonly MarketingNavItem[] = [
  { id: "product", label: "Product", href: "/#product" },
  { id: "how-it-works", label: "How it works", href: "/#how-it-works" },
  { id: "for-tutors", label: "For tutors", href: "/#for-tutors" },
  { id: "scoring", label: "Scoring", href: "/#scoring" },
  { id: "faq", label: "FAQ", href: "/#faq" },
];

/** Section ids `src/app/page.tsx` renders today. See the note above. */
export const LANDING_SECTIONS: readonly string[] = ["product", "how-it-works", "faq"];

export interface FooterColumn {
  heading: string;
  links: readonly { label: string; href: string }[];
}

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    heading: "Product",
    links: [
      { label: "Overview", href: "/#product" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Free sample test", href: "/practice" },
    ],
  },
  {
    // Mostly points at sections of `/` rather than at articles: there is still
    // no editorial content, and inventing `/blog` links that 404 is worse than a
    // column that repeats the tour. `/faq` is the first real page in here — T3.7
    // gave it its own URL because it is the one a search result should land on.
    // T3.8 gives the other two real destinations.
    heading: "Learn",
    links: [
      { label: "Adaptive modules", href: "/#product" },
      { label: "From sign-up to score", href: "/#how-it-works" },
      { label: "FAQ", href: "/faq" },
      { label: "Ask a question", href: "/contact" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Sign up", href: "/signup" },
      { label: "Reset password", href: "/forgot-password" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Contact", href: "/contact" },
    ],
  },
];
