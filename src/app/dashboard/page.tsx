import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DarkModeToggle } from "@/components/dark-mode-toggle";

export const metadata = { title: "Dashboard — SAT Practice" };

export default async function DashboardPage() {
  const user = await requireUser();

  const [tests, attempts] = await Promise.all([
    prisma.test.findMany({
      where: { OR: [{ isPublic: true }, { createdById: user.id }] },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        sections: {
          include: {
            modules: { include: { _count: { select: { moduleQuestions: true } } } },
          },
        },
      },
    }),
    prisma.testAttempt.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      take: 10,
      include: { test: { select: { title: true } } },
    }),
  ]);

  return (
    <main className="container mx-auto max-w-4xl py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {user.email} ({user.role})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DarkModeToggle />
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
            >
              Admin panel
            </Link>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium">Available tests</h2>
        {tests.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            No tests available yet.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {tests.map((t) => {
              const totalQ = t.sections
                .flatMap((s) => s.modules)
                .reduce((sum, m) => sum + m._count.moduleQuestions, 0);
              return (
                <li key={t.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{t.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {t.mode} · {totalQ} questions · {t.sections.length} sections
                    </div>
                  </div>
                  <Link
                    href={`/test/${t.id}/start`}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Start test
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Past attempts</h2>
        {attempts.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            No attempts yet.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {attempts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <div className="font-medium">{a.test.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.status} · started {a.startedAt.toLocaleString()}
                  </div>
                </div>
                <Link
                  href={
                    a.status === "COMPLETED"
                      ? `/results/${a.id}`
                      : `/test/attempt/${a.id}`
                  }
                  className="rounded-md border border-input px-3 py-1.5 hover:bg-accent"
                >
                  {a.status === "COMPLETED" ? "View results" : "Resume"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
