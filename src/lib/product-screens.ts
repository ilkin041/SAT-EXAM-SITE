/**
 * What the landing page's screenshot tabs claim, minus the pixels (T3.5).
 *
 * Pure data, no image imports — same split as `site-stats.ts` against
 * `stats-banner.tsx`. It exists so `tests/screenshot-tabs.test.ts` can hold the
 * rules that make the section work (one shot per screen, all the same size, two
 * or three callouts each) without rendering a client component or teaching
 * vitest to import a `.webp`.
 *
 * `screenshot-tabs-client.tsx` maps each `id` to the file
 * `npm run gen:screenshots` writes into `src/assets/screenshots/<id>.webp`.
 */

/** Capture viewport in CSS pixels. Files are 2× this — see `SCREENSHOT_SCALE`. */
export const SCREENSHOT_WIDTH = 1440;
export const SCREENSHOT_HEIGHT = 900;
export const SCREENSHOT_SCALE = 2;

/** Must match `VIEWPORT` in `scripts/capture-screenshots.ts`. */
export const SCREENSHOT_DIR = "src/assets/screenshots";

export interface ProductScreen {
  /** Also the basename of its `.webp`. */
  id: string;
  /** Tab label. Short: four of them share a 360px row. */
  tab: string;
  /** The route it was photographed on, shown in the frame's chrome bar. */
  route: string;
  alt: string;
  /**
   * Two or three, each naming something **visible in that shot**. A callout for
   * a feature the picture does not show is marketing copy in a caption's
   * clothes, and the test caps the count so this cannot grow into a paragraph.
   */
  callouts: string[];
}

export const PRODUCT_SCREENS: readonly ProductScreen[] = [
  {
    id: "test-interface",
    tab: "Test interface",
    route: "/test/attempt",
    alt:
      "The test interface on a Reading and Writing question. A phrase in the passage is " +
      "highlighted yellow, choice D is struck through by the eliminator, and the module " +
      "timer runs in the header.",
    callouts: [
      "Highlight and annotate any passage",
      "Answer eliminator, same as Bluebook",
      "Timer anchored to the server clock",
    ],
  },
  {
    id: "score-report",
    tab: "Score report",
    route: "/results",
    alt:
      "A score report: a total out of 1600 in a ring, scaled scores for Reading and " +
      "Writing and for Math out of 800 each, and the start of a per-domain breakdown.",
    callouts: [
      "200–800 for each section",
      "Every domain scored separately",
      "Short tests labelled as estimates",
    ],
  },
  {
    id: "answer-review",
    tab: "Answer review",
    route: "/results/…/review",
    alt:
      "The answer review: the passage on the left, the four choices on the right with the " +
      "correct answer marked green and the student's answer marked red, and a written " +
      "explanation underneath.",
    callouts: [
      "Your answer against the key",
      "A written explanation on every question",
      "Passage and question side by side",
    ],
  },
  {
    id: "for-tutors",
    tab: "For tutors",
    route: "/admin/questions",
    alt:
      "The question editor: HTML and LaTeX source on the left, a live student-view preview " +
      "with typeset maths on the right, and domain and skill selectors above.",
    callouts: [
      "Write in HTML and LaTeX",
      "Preview exactly what a student sees",
      "College Board domains and skills",
    ],
  },
];
