import { Suspense } from "react";
import Link from "next/link";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { ResetPasswordForm } from "./reset-form";

export const metadata = { title: "Reset password — SAT Practice" };

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen">
      {/* Left decorative panel */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-violet-600" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden
        />
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" aria-hidden />

        <div className="relative flex h-full flex-col items-center justify-center px-12 text-center text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur-sm">
            <ShieldCheck className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight">
            Almost there!
            <br />
            Set your new password
          </h2>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/70">
            Choose a strong password and you&apos;ll be back to practicing
            in seconds.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-[420px]">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2.5 text-sm font-bold text-foreground transition-colors hover:text-primary"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
              <GraduationCap className="h-4 w-4" aria-hidden />
            </span>
            SAT Practice
          </Link>

          <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-elevated">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter a new password for your account. You&apos;ll be signed in
                automatically.
              </p>
            </div>

            <Suspense>
              <ResetPasswordForm />
            </Suspense>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link className="font-semibold text-primary hover:underline" href="/login">
                Back to log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
