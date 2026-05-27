import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in — SAT Practice" };

export default function LoginPage() {
  return (
    <main className="container mx-auto flex min-h-screen max-w-md flex-col justify-center py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Log in</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Welcome back. Sign in to access your dashboard.
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-sm text-muted-foreground">
        New here?{" "}
        <Link className="font-medium text-foreground underline" href="/signup">
          Create an account
        </Link>
      </p>
    </main>
  );
}
