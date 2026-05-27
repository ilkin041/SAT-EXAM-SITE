import { Suspense } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in — SAT Practice" };

export default function LoginPage() {
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
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to access your dashboard.
            </p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link className="font-medium text-primary hover:underline" href="/signup">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
