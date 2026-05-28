import { Suspense } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { ResetPasswordForm } from "./reset-form";

export const metadata = { title: "Reset password — SAT Practice" };

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[420px]">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <GraduationCap className="h-4 w-4" aria-hidden />
          </span>
          SAT Practice
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter a new password for your account. You&apos;ll be signed in
              automatically.
            </p>
          </div>

          <Suspense>
            <ResetPasswordForm />
          </Suspense>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link className="font-medium text-primary hover:underline" href="/login">
              Back to log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
