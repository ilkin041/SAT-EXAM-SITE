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
 * whole of what it took to light that item up, and T3.8 shipped the last two —
 * the scoring block and the tutor band — so all five items are live.
 *
 * The order is the order the sections appear on `/`. A nav that lists them in a
 * different sequence from the page they scroll within reads as five unrelated
 * destinations rather than as a map of one page.
 */
export const MARKETING_NAV: readonly MarketingNavItem[] = [
  { id: "product", label: "Product", href: "/#product" },
  { id: "how-it-works", label: "How it works", href: "/#how-it-works" },
  { id: "scoring", label: "Scoring", href: "/#scoring" },
  { id: "for-tutors", label: "For tutors", href: "/#for-tutors" },
  { id: "faq", label: "FAQ", href: "/#faq" },
];

/** Section ids `src/app/page.tsx` renders today. See the note above. */
export const LANDING_SECTIONS: readonly string[] = [
  "product",
  "how-it-works",
  "scoring",
  "for-tutors",
  "faq",
];

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
    // T3.7 gave `/faq` its own URL and T3.8 added the other three, so this
    // column is now four real pages rather than anchors back into the tour. All
    // four are in the sitemap and all four answer somebody who has not signed
    // up, which is what earns a footer slot.
    heading: "Learn",
    links: [
      { label: "The Digital SAT format", href: "/sat-format" },
      { label: "How scoring works", href: "/scoring" },
      { label: "FAQ", href: "/faq" },
      { label: "For tutors", href: "/for-tutors" },
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
