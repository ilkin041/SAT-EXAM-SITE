import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "./signup-form";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Sign up",
  description:
    "Create an account to take full-length, timed Digital SAT practice tests and track every attempt.",
  path: "/signup",
});

export default function SignupPage() {
  return (
    <AuthShell
      panelTitle="Start practising"
      /*
       * No "free" claim and no card promise: open decision 3 is unresolved, and
       * `json-ld.ts` deliberately omits `offers` so as not to answer it in
       * Google's index. The old panel pill read "Free to use — no credit card".
       */
      panelLede="An account is what turns a practice test into a record you can look back at."
      title="Create your account"
      lede="Sign up to take full practice tests and track your progress."
      footer={
        <>
          Already have an account?{" "}
          <Link className="font-semibold text-primary hover:underline" href="/login">
            Log in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
