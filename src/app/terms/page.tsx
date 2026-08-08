import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { pageMetadata } from "@/lib/site";

/**
 * `/terms` — T3.8 replaces the placeholder.
 *
 * **No entity is named and there is no governing-law clause**, confirmed rather
 * than guessed: nothing in the repo names an operator, a company or a
 * jurisdiction, and a page that invented one would be a legal claim made up by a
 * developer. Both go in when there is a real answer. That is an absence, not a
 * placeholder — the page says what the rules are without pretending to know
 * which court would read them.
 *
 * Open decisions 3 and 4 both touch this page and neither is answered here:
 *
 * - **Pricing.** The page says there is no payment step in the product, which is
 *   a fact about the code, and does not say "free forever". Same line `faq.ts`
 *   takes and the same reason `json-ld.ts` omits `offers`.
 * - **Content licensing.** The bank references a published practice test, so the
 *   page does not claim ownership of every question in it. It states what a user
 *   may do with what they are shown, which is the part that is certain.
 */

export const metadata: Metadata = pageMetadata({
  title: "Terms",
  description:
    "The terms of use for this practice platform: what an account is for, what practice scores are and are not, and what you may do with the content.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage title="Terms">
      <p className="text-foreground">
        Plain terms for a practice tool. Using this site means accepting them.
      </p>

      <Heading>What this is</Heading>
      <p>
        A platform for practising the Digital SAT: timed, module-based practice tests, a
        scored report and a full answer review. It is not affiliated with, endorsed by or
        connected to the College Board, and SAT is their trademark. Nothing here is an
        official SAT, nothing you do here is reported to any institution, and no result from
        this site is an official score.
      </p>

      <Heading>Scores are estimates</Heading>
      <p>
        Every score is a practice estimate produced by a published conversion table, and the
        College Board&rsquo;s operational scoring model is not public and is not reproduced
        here.{" "}
        <Link
          href="/scoring"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          The exact rules are documented
        </Link>
        , tables included. Do not treat a number from this site as a prediction of an
        official one, and do not make a decision that matters on the strength of it alone.
      </p>

      <Heading>Your account</Heading>
      <p>
        You are responsible for what happens under your account and for keeping your password
        to yourself. Give a real email address — it is the only way a password can be reset.
        An account is for one person; sharing one means sharing a score history, which mostly
        punishes you.
      </p>
      <p>
        Tutor accounts can edit the shared question bank and can see the attempts of students
        in their groups. They are set up by hand for that reason and are not available
        through sign-up.
      </p>

      <Heading>What it costs</Heading>
      <p>
        There is no payment step anywhere in this product. No card field, no plan to choose,
        no checkout — none of it is built, so nothing here can charge you. That is a
        statement about the software as it stands rather than a promise about every future
        version of it; if that ever changes, it will change on this page first and it will
        not be applied retroactively to something you have already done.
      </p>

      <Heading>Content</Heading>
      <p>
        Questions, explanations and the practice tests built from them are for your own
        preparation. Do not scrape the site, republish its content, or redistribute questions
        as your own material. Some questions were written for this platform — the samples on
        the home page and the ones in the screenshots among them — and the platform does not
        claim ownership of every item in the bank.
      </p>
      <p>
        Anything you write while using the site — your answers, your passage notes — is
        yours. It is stored so it can be shown back to you in the review, and is described in
        full on the{" "}
        <Link
          href="/privacy"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          privacy page
        </Link>
        .
      </p>

      <Heading>Fair use of the platform</Heading>
      <p>
        Do not attempt to break into other people&rsquo;s accounts, disrupt the service for
        others, or automate requests against it at a rate a person could not produce. An
        account used that way can be suspended.
      </p>

      <Heading>No warranty</Heading>
      <p>
        The platform is provided as it is. It may be unavailable, it may contain errors in a
        question or an explanation, and a practice score may not reflect how you would perform
        on a real exam. Report anything that looks wrong and it will be looked at, but no
        guarantee is made about availability, accuracy or results.
      </p>
      <p>
        To the extent the law allows, the operator of this site is not liable for any loss
        arising from using it — including a score outcome, a missed deadline, or data lost
        through a fault or an interruption.
      </p>

      <Heading>Changes and ending</Heading>
      <p>
        These terms may change. A material change will be reflected here, and continuing to
        use the site after that means accepting the revised version. You can stop using the
        platform at any time; how to have your data removed is on the{" "}
        <Link
          href="/privacy"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          privacy page
        </Link>
        .
      </p>

      <Heading>Getting in touch</Heading>
      <p>
        Questions about these terms, a report of a broken question, or a request about your
        data all go to{" "}
        <Link
          href="/contact"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          the contact page
        </Link>
        .
      </p>
    </LegalPage>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-6 text-h3 text-ink">{children}</h2>;
}
