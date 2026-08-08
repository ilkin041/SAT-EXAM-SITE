import { FAQ_ITEMS, faqAnswerText } from "@/lib/faq";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

/**
 * Structured data for the marketing surface.
 *
 * Two graphs, both anchored by `@id` so the `WebApplication` can point its
 * publisher at the `Organization` instead of restating it.
 *
 * **Nothing here may claim what the product cannot back.** No `aggregateRating`
 * (there are no reviews), no `offers` (open decision 3 — paid tiers — is
 * unresolved, and a `price: 0` would answer it in Google's index before anyone
 * answers it here), no `foundingDate`, no address. A structured-data property
 * is a public assertion; an empty graph is better than a decorated one.
 */

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const APPLICATION_ID = `${SITE_URL}/#webapplication`;
const FAQ_ID = `${SITE_URL}/faq#faqpage`;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/logo.svg"),
    description: SITE_DESCRIPTION,
  };
}

export function webApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": APPLICATION_ID,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    applicationCategory: "EducationalApplication",
    // Comma-separated is the documented shape for multiple values here.
    operatingSystem: "Web browser",
    browserRequirements: "Requires JavaScript.",
    inLanguage: "en",
    publisher: { "@id": ORGANIZATION_ID },
    featureList: [
      "Full-length timed Digital SAT practice tests",
      "Adaptive second-module routing",
      "200–800 scaled section scores",
      "Per-domain performance breakdown",
      "Question-by-question answer review with explanations",
    ],
  };
}

/**
 * `FAQPage` (T3.7), generated from `FAQ_ITEMS` — never hand-written.
 *
 * Google's policy is that the marked-up answer must be the answer on the page,
 * and the failure mode is a graph that was true when it was typed. Building it
 * from the same array the accordion renders removes the opportunity:
 * `acceptedAnswer.text` is `faqAnswerText(item)`, which is exactly the
 * paragraphs `Faq` renders, and `tests/faq.test.ts` compares the two.
 *
 * Both `/` and `/faq` emit this, because both render all eight items in full —
 * an accordion counts as visible content for this purpose, since the answer is
 * in the HTML and one click away. The shared `@id` is what tells a crawler
 * those are one FAQ on two URLs rather than two competing ones, and it is
 * anchored to `/faq` because that is the canonical home.
 *
 * The same rule as the graphs above applies: nothing here claims what the
 * product cannot back. The answers were written against the codebase, and three
 * of them are narrower than the question that prompted them for exactly that
 * reason — see the note on `FAQ_ITEMS`.
 */
export function faqPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": FAQ_ID,
    url: absoluteUrl("/faq"),
    inLanguage: "en",
    publisher: { "@id": ORGANIZATION_ID },
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faqAnswerText(item),
      },
    })),
  };
}
