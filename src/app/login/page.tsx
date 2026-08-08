import { Suspense } from "react";
import Link from "next/link";
import { GraduationCap, Sparkles } from "lucide-react";
import { DotLattice } from "@/components/dot-lattice";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in — SAT Practice" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen">
      {/* Left decorative panel */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        {/* T1.8: was a primary→violet wash. Flat `--primary`, so the panel and
            the form's submit button are the same blue. */}
        <div className="absolute inset-0 bg-primary" />
        <DotLattice />
        {/* Decorative orbs */}
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" aria-hidden />

        <div className="relative flex h-full flex-col items-center justify-center px-12 text-center text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur-sm">
            <GraduationCap className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="mt-6 text-h1">
            Welcome back to
            <br />
            SAT Practice
          </h2>
          <p className="mt-4 max-w-sm text-body-lg text-white/70">
            Your personalized SAT prep platform. Practice with full-length tests,
            track your scores, and improve every day.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-body font-medium backdrop-blur-sm">
            <Sparkles className="h-4 w-4" aria-hidden />
            200–800 scaled scoring
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-[420px]">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2.5 text-body font-bold text-foreground transition-colors hover:text-primary"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="h-4 w-4" aria-hidden />
            </span>
            SAT Practice
          </Link>

          <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-elevated">
            <div className="mb-6">
              <h1 className="text-h2">Welcome back</h1>
              <p className="mt-2 text-body text-muted-foreground">
                Sign in to access your dashboard.
              </p>
            </div>

            <Suspense>
              <LoginForm />
            </Suspense>

            <p className="mt-6 text-center text-body text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link className="font-semibold text-primary hover:underline" href="/signup">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
