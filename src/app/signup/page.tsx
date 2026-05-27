import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Sign up — SAT Practice" };

export default function SignupPage() {
  return (
    <main className="container mx-auto flex min-h-screen max-w-md flex-col justify-center py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Create an account</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Sign up to take full practice tests and track your progress.
      </p>
      <SignupForm />
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="font-medium text-foreground underline" href="/login">
          Log in
        </Link>
      </p>
    </main>
  );
}
