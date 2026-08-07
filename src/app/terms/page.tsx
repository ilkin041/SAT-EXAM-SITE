import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Terms — SAT Practice" };

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
