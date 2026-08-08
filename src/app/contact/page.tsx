import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: "How to reach us about a test, a score, or access to a group.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <LegalPage title="Contact">
      <p>
        This page is a placeholder. A contact route is being set up and will
        replace this text before the platform opens to the public.
      </p>
      <p>
        If a tutor set up your account, they are the fastest way to get help
        with a test, a score, or access to a group.
      </p>
    </LegalPage>
  );
}
