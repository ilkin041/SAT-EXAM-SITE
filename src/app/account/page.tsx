import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { StudentNav } from "@/components/student-nav";
import { ChangeNameForm, ChangePasswordForm } from "./account-forms";

export const metadata = { title: "Account settings — SAT Practice" };

export default async function AccountPage() {
  const sessionUser = await requireUser();
  if (!sessionUser.id) redirect("/login");

  // Re-fetch from DB so the page is the source of truth for the current
  // name (session may lag if the user just updated it from another tab).
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, email: true },
  });
  if (!user) redirect("/login");

  return (
    <>
      <StudentNav />
      <main className="container mx-auto max-w-2xl px-4 py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <header className="mt-4">
          <h1 className="text-3xl font-semibold tracking-tight">Account settings</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage your profile information and password.
          </p>
        </header>

        <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Profile</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </p>
          <div className="mt-5">
            <ChangeNameForm initialName={user.name ?? ""} />
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-base font-semibold">Change password</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a strong password you don&apos;t use anywhere else.
          </p>
          <div className="mt-5">
            <ChangePasswordForm />
          </div>
        </section>
      </main>
    </>
  );
}
