import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { pageMetadata } from "@/lib/site";

/**
 * `/contact` — rewritten in T3.8, which was not in the task's five.
 *
 * It had to be. `/privacy` sends a data-deletion request here and `/terms` sends
 * a question about the terms here, and both of those landing on "This page is a
 * placeholder" would make the two pages above them decorative. The acceptance
 * criterion is that no placeholder text ships; a policy pointing at one is the
 * same failure with an extra click.
 *
 * **It deliberately does not print an address or a form.** No support address
 * exists in the repo, and inventing one would be worse than the placeholder was.
 * What the page does instead is route each reason for getting in touch to the
 * thing that actually answers it — most of them are already answered somewhere —
 * and say plainly that a direct channel is not published yet. When there is an
 * address, it goes here and this note goes with it.
 */

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Where to take a question about a test, a score, a tutor account, or a request about your data.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <LegalPage title="Contact">
      <p className="text-foreground">
        Most questions have an answer already written down, so start here — the last item
        covers everything else.
      </p>

      <Heading>If a tutor set up your account</Heading>
      <p>
        They are the fastest route for anything about a test they assigned, a score you did
        not expect, or access to a group. They can open your attempt and see it question by
        question, which nobody else can do for you.
      </p>

      <Heading>If you have a question about the product</Heading>
      <p>
        The{" "}
        <Link
          href="/faq"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          frequently asked questions
        </Link>{" "}
        cover what this is, where the questions come from, what it costs, what runs on which
        device and what is stored about you. How a score is produced — including the
        conversion tables themselves — is on{" "}
        <Link
          href="/scoring"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          the scoring page
        </Link>
        .
      </p>

      <Heading>If you teach and want an account</Heading>
      <p>
        <Link
          href="/for-tutors"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          What tutor accounts do
        </Link>{" "}
        is written up in full, including what they do not do. Tutor accounts are set up by
        hand rather than through sign-up.
      </p>

      <Heading>If it is about your data</Heading>
      <p>
        What is stored, which cookies are set and which two services receive anything is
        described on the{" "}
        <Link
          href="/privacy"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          privacy page
        </Link>
        . Deletion is handled by hand and there is no button for it in the product.
      </p>

      <Heading>Anything else</Heading>
      <p>
        There is no published contact address for this site yet, and no contact form. Rather
        than print one that does not work: if you reached this platform through a tutor, a
        school or whoever gave you the link, that is the channel. This page will carry a
        direct address as soon as there is one to carry.
      </p>
    </LegalPage>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-6 text-h3 text-ink">{children}</h2>;
}
