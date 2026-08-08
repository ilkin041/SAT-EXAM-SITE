import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "./forgot-form";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Forgot password",
  description: "Request a password reset link for your SAT Practice account.",
  path: "/forgot-password",
  noindex: true,
});

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      panelTitle="Get back in"
      panelLede="Enter your email and check your inbox. Nothing you have already done is lost."
      title="Forgot password?"
      lede="Enter the email associated with your account and we'll send you a link to reset your password."
      footer={
        <>
          Remembered it?{" "}
          <Link className="font-semibold text-primary hover:underline" href="/login">
            Back to log in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
