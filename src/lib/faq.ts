/**
 * The FAQ, as data (T3.7).
 *
 * **One array feeds the accordion, the `/faq` page and the `FAQPage` JSON-LD.**
 * That is the whole reason this module exists: Google's structured-data policy
 * requires the marked-up answer to be the answer a visitor actually reads, and
 * the way that breaks in practice is somebody editing the visible copy months
 * later without touching a hand-written graph. Here there is nothing to forget
 * — `faqPageJsonLd()` reads this file, and `tests/faq.test.ts` asserts the
 * emitted text equals the rendered text character for character.
 *
 * **An answer is plain paragraphs, and it carries no links or markup.** That is
 * the constraint that keeps the two representations equal: `acceptedAnswer.text`
 * is a string, so anything the page renders that is not in that string is drift.
 * Where an answer needs to point somewhere it names the destination in words
 * ("the contact page"), and the section puts real links *outside* the accordion,
 * below it, where they are nobody's structured data.
 *
 * The task prompt asked for a `/scoring` link on the score question. There is no
 * `/scoring` route and no `#scoring` section — both arrive with T3.8 — so item
 * `scoring` answers in full from `docs/scoring-policy.md` instead and links
 * nowhere. An anchor to a page that does not exist is a broken link, not a
 * placeholder; same rule `MARKETING_NAV` already follows.
 *
 * Pure data, no imports. Safe on either side of the server/client line.
 */

export interface FaqItem {
  /** Stable slug. Used as the accordion value and the `#` target on `/faq`. */
  id: string;
  question: string;
  /** Paragraphs, rendered one `<p>` each and joined by a blank line in JSON-LD. */
  answer: readonly string[];
}

/**
 * Eight items, in the order a sceptical visitor asks them: what is this, where
 * did it come from, is the number real, what does it cost, will it run, how does
 * it work, can I teach with it, what do you keep.
 *
 * **Every claim here is checked against the codebase, not against ambition.**
 * Three of them are deliberately narrower than the prompt's phrasing, because
 * the decisions behind them are open (see CLAUDE.md "Open decisions"):
 *
 * - `questions` does not say who owns the bank. Open decision 4 (content
 *   licensing) is unresolved and the bank references "Official SAT Practice
 *   Test 4", so the answer describes how a question is tagged and explained,
 *   and states the one provenance fact that is certainly true — nothing here is
 *   a live exam question.
 * - `cost` says there is no payment step in the product, which is a fact about
 *   the code (there is no billing, checkout or card field anywhere in `src/`).
 *   It does not say "free forever": open decision 3 is unresolved, and
 *   `json-ld.ts` deliberately omits `offers` so as not to answer it in Google's
 *   index. Answering it in prose here would be the same mistake with better
 *   typography.
 * - `devices` describes the interface's size, not a warning. Open decision 7
 *   blocks T7.4 and **no phone warning is implemented today**, so promising one
 *   would be describing a plan.
 */
export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: "is-this-the-real-sat",
    question: "Is this the real SAT?",
    answer: [
      "No. This is practice, built to the format of the Digital SAT: the same two sections, the same two modules inside each one, the same on-screen tools and the same clock.",
      "It is not affiliated with, endorsed by, or connected to the College Board, and SAT is their trademark. No score from this site is an official score, and nothing you do here is reported to anyone.",
    ],
  },
  {
    id: "questions",
    question: "Where do the questions come from?",
    answer: [
      "Every question lives in this platform's own bank and is tagged before it can be used: one of the content domains the College Board publishes, one skill inside that domain, and a difficulty. Each one also carries a written explanation, and you see the explanation on every question in the review — including the ones you answered correctly.",
      "Nothing here is a live exam question. Live SAT content is undisclosed and stays that way, so anyone who claims to have it is either wrong or selling you something.",
      "The sample questions on the home page and the ones shown in the screenshots were written specifically for this site.",
    ],
  },
  {
    id: "scoring",
    question: "How is the 200–800 score calculated?",
    answer: [
      "Each section's raw score — how many questions you got right — is converted to a scaled score from 200 to 800 through a fixed lookup table: 55 entries for Reading and Writing raw scores 0 to 54, and 45 entries for Math raw scores 0 to 44. The values come from the released Digital SAT practice-test scoring guides. The two section scores add up to a total out of 1600.",
      "If the second module you were served in a section was the easier one, that section's score is capped at 600. The lookup runs first and the cap is applied after. A harder or mixed second module is not capped. That 600 is a deliberately conservative calibration by this platform, not an official curve — the College Board does not publish a reusable table for the lower route.",
      "A score needs at least one scored question in both Reading and Writing and Math. Only a test with exactly 54 Reading and Writing questions and 44 Math questions is labelled full length; any other length is shown as a short-test estimate, with the proportional lookup but no performance tier attached to it.",
      "These are practice estimates. The College Board's operational scoring model is not published, and this does not reproduce it.",
    ],
  },
  {
    id: "cost",
    question: "Is it really free? Do I need a card?",
    answer: [
      "There is no payment step anywhere in this product. No card field, no plan to pick, no checkout — none of it is built, so there is nothing that could charge you.",
      "You do not need an account either. A public practice test can be started, timed, scored and reviewed straight from the practice page; the attempt is held against your browser by a signed cookie. An account is what makes your history follow you to another device.",
    ],
  },
  {
    id: "devices",
    question: "Does it work on an iPad or a Chromebook?",
    answer: [
      "Yes, and there is nothing to install. The whole thing runs in the browser — Safari or Chrome on an iPad, Chrome on a Chromebook — including the graphing calculator and the reference sheet.",
      "The test interface is built tablet-first, which is the screen size the real exam is sat on. A phone will load it, but the reading passages and the tools are cramped at that width; the score report and the answer review are comfortable on any screen.",
    ],
  },
  {
    id: "adaptive",
    question: "What is the difference between adaptive and linear mode?",
    answer: [
      "The real Digital SAT is section-adaptive: everyone gets the same first module, and how you do on it decides which second module you get. Do well enough and you get the harder set, which is the only route to the top of the scale. Fall short and you get the easier set, and that section is capped at 600.",
      "An adaptive test here does exactly that, routing on a threshold set on the test itself. A linear test serves everyone the same second module and applies no cap, which makes it the better shape for drilling a fixed set of questions rather than estimating a score.",
      "Each test on the practice page is labelled with the mode it will run in, so you know which one you are starting before you start it.",
    ],
  },
  {
    id: "tutors",
    question: "Can I use this with my students?",
    answer: [
      "Yes. A tutor account manages the question bank, assembles tests out of it, groups students, and opens any attempt to see it question by question — what was answered, what was eliminated, how long it took, and where the time went.",
      "Tutor accounts are set up by hand rather than through sign-up. Ask on the contact page and say roughly how many students you teach.",
    ],
  },
  {
    id: "data",
    question: "What happens to my data?",
    answer: [
      "It stays here. Everything is stored in this platform's own database: the account details you enter, the answers you submit during an attempt, and the scores computed from them. There is no third-party analytics script anywhere in the app — no pixel, no tag manager, nothing that reports to another company.",
      "Product usage is counted as events, and an event holds only ids, labels and numbers — which test was started, which module was completed, whether the attempt was anonymous. It never holds your answers, your notes or your highlights, and no IP address is recorded anywhere.",
      "One cookie does the counting. It holds a random id, cannot be read by page scripts, lasts 180 days, and is there so a sign-up can be joined to the attempt that came before it. It is not used for advertising, and nothing here is sold or shared with advertisers.",
    ],
  },
];

/** The rendered text of one answer, and the exact string the JSON-LD carries. */
export function faqAnswerText(item: FaqItem): string {
  return item.answer.join("\n\n");
}
