import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="container mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 py-16">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">SAT Practice Platform</h1>
        <p className="mt-3 text-muted-foreground">
          Self-hosted digital-SAT-style practice testing. Take full-length, timed, adaptive practice
          tests in a distraction-free interface.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {session?.user ? (
          <>
            <Link
              href={session.user.role === "ADMIN" ? "/admin" : "/dashboard"}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Go to {session.user.role === "ADMIN" ? "admin" : "dashboard"}
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link
              href="/signup"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Sign up
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Log in
            </Link>
            <Link
              href="/practice"
              className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Try public practice
            </Link>
          </>
        )}
      </div>

      {session?.user && (
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{session.user.email}</span> —{" "}
          role: {session.user.role}
        </p>
      )}
    </main>
  );
}
