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
