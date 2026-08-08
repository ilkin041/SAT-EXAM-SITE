import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Log in",
  description:
    "Log in to take timed Digital SAT practice tests and review your scored attempts.",
  path: "/login",
});

export default function LoginPage() {
  return (
    <AuthShell
      panelTitle="Welcome back"
      panelLede="Your dashboard holds every attempt you have taken, and any test you left unfinished is still there to continue."
      title="Welcome back"
      lede="Sign in to access your dashboard."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link className="font-semibold text-primary hover:underline" href="/signup">
            Sign up
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
