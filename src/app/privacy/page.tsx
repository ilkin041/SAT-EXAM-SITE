import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Privacy — SAT Practice" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy">
      <p>
        This page is a placeholder. The full privacy policy is being written and
        will replace this text before the platform opens to the public.
      </p>
      <p>
        In the meantime: the platform stores the account details you enter, the
        answers you submit during a practice attempt, and the scores computed
        from them. It does not sell data or share it with advertisers.
      </p>
    </LegalPage>
  );
}
