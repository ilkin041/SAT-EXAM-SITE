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
 * last three scroll to sections that do not exist yet: the tutor band and the
 * scoring block are T3.8 and the FAQ is T3.7. A nav item that scrolls nowhere
 * is a broken link, so `MarketingHeader` renders the subset the page declares
 * through its `sections` prop and `/` declares only what it actually contains.
 * When T3.7 and T3.8 land they add their `id` to that list and the item appears
 * — no change needed here.
 */
export const MARKETING_NAV: readonly MarketingNavItem[] = [
  { id: "product", label: "Product", href: "/#product" },
  { id: "how-it-works", label: "How it works", href: "/#how-it-works" },
  { id: "for-tutors", label: "For tutors", href: "/#for-tutors" },
  { id: "scoring", label: "Scoring", href: "/#scoring" },
  { id: "faq", label: "FAQ", href: "/#faq" },
];

/** Section ids `src/app/page.tsx` renders today. See the note above. */
export const LANDING_SECTIONS: readonly string[] = ["product", "how-it-works"];

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
    // Deliberately points at sections of `/` rather than at articles: there is
    // no editorial content yet, and inventing `/blog` links that 404 is worse
    // than a column that repeats the tour. T3.8 gives these real destinations.
    heading: "Learn",
    links: [
      { label: "Adaptive modules", href: "/#product" },
      { label: "From sign-up to score", href: "/#how-it-works" },
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
