import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "./reset-form";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Reset password",
  description: "Set a new password for your SAT Practice account.",
  path: "/reset-password",
  noindex: true,
});

export default function ResetPasswordPage() {
  return (
    <AuthShell
      panelTitle="Set a new password"
      panelLede="Choose one you will remember. You will be signed in as soon as it is saved."
      title="Set a new password"
      lede="Enter a new password for your account. You'll be signed in automatically."
      footer={
        <Link className="font-semibold text-primary hover:underline" href="/login">
          Back to log in
        </Link>
      }
    >
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
