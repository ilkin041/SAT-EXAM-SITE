/**
 * What the admin product actually does (T3.8), as data.
 *
 * One array feeds the landing page's tutor band and the whole of `/for-tutors`,
 * so the six-line summary and the page cannot drift. Same split as `faq.ts`
 * against `faq.tsx`.
 *
 * **Every entry names a route that exists**, and the `route` field is what makes
 * that checkable rather than promised: `tests/tutor-features.test.ts` asserts
 * each one is under `/admin`, and each was read before it was written —
 *
 * - `/admin/questions` — the editor, with domain/skill/difficulty, an
 *   explanation field, image upload and server-side KaTeX at save time.
 * - `/admin/tests` — sections, modules, the questions in each module, the
 *   adaptive threshold (`test-meta-form.tsx`), and the public flag.
 * - `/admin/groups` — `Group` holds users and tests; `assignTestToGroup` in
 *   `groups/actions.ts` is the assignment.
 * - `/admin/attempts` — the per-attempt view, question by question.
 * - `/api/admin/export/attempts` — the CSV, every completed attempt.
 * - `/admin/import` — a JSON tree of sections, modules and questions, dropped
 *   or pasted, previewed before it commits.
 *
 * Nothing in here is aspirational. A capability that does not have a route is
 * not in the list.
 *
 * Pure data, no imports. Icons are chosen at the call site — an icon component
 * in here would drag `lucide-react` into anything that reads the copy.
 */

export interface TutorFeature {
  id: string;
  title: string;
  /** One or two sentences. Plain claims, each checkable in the admin app. */
  description: string;
  /** The admin route it lives at. Never rendered as a link — it is proof. */
  route: string;
}

export const TUTOR_FEATURES: readonly TutorFeature[] = [
  {
    id: "question-bank",
    title: "A question bank you own",
    description:
      "Write questions in the editor, tag each one with a content domain, a skill inside it and a difficulty, and attach an explanation students see in the review. Maths is typeset when you save, not in the student's browser.",
    route: "/admin/questions",
  },
  {
    id: "test-assembly",
    title: "Assemble tests out of it",
    description:
      "Build a test section by section and module by module, choosing the questions in each. Set the routing threshold for an adaptive test, or leave it linear, and decide whether it is public or only for your students.",
    route: "/admin/tests",
  },
  {
    id: "groups",
    title: "Group your students",
    description:
      "Put students into groups, and see a group's attempts and average together rather than one student at a time.",
    route: "/admin/groups",
  },
  {
    id: "assignment",
    title: "Assign a test to a group",
    description:
      "A test assigned to a group appears for every student in it. No links to send, no codes to distribute.",
    route: "/admin/groups",
  },
  {
    id: "csv-export",
    title: "Export the lot as CSV",
    description:
      "Every completed attempt with its scores, per-domain counts and per-question detail, in one file you can open in a spreadsheet.",
    route: "/api/admin/export/attempts",
  },
  {
    id: "json-import",
    title: "Bulk import from JSON",
    description:
      "Drop or paste a JSON tree of sections, modules and questions. You see what it parsed, and what it rejected, before anything is written.",
    route: "/admin/import",
  },
  {
    id: "attempt-review",
    title: "Open any attempt",
    description:
      "Go through an attempt question by question: what was answered, what was eliminated, how long each one took, and how often the tab lost focus.",
    route: "/admin/attempts",
  },
];

/**
 * The six the landing band shows, and the order is the prompt's: bank,
 * assembly, groups, assignment, export, import. Seven items leave an orphan in
 * a three-column grid, so per-attempt review is the one that waits for
 * `/for-tutors`, where it gets a paragraph rather than a line.
 */
export const TUTOR_BAND_FEATURES: readonly TutorFeature[] = TUTOR_FEATURES.slice(0, 6);
