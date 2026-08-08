import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Terms",
  description: "The terms of use for the SAT Practice platform.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage title="Terms">
      <p>
        This page is a placeholder. The full terms of use are being written and
        will replace this text before the platform opens to the public.
      </p>
      <p>
        SAT is a trademark of the College Board, which does not administer or
        endorse this platform.
      </p>
    </LegalPage>
  );
}
