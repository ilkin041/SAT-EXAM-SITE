import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Privacy",
  description: "What SAT Practice stores about an account and an attempt, and what it does not.",
  path: "/privacy",
});

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
