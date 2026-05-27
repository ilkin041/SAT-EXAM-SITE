import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Tests — Admin" };

export default async function TestsPage() {
  const tests = await prisma.test.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { attempts: true } },
      sections: {
        include: {
          modules: { include: { _count: { select: { moduleQuestions: true } } } },
        },
      },
    },
  });

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Tests</h1>
        <Link
          href="/admin/tests/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          New test
        </Link>
      </div>

      {tests.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          No tests yet. Create one to get started.
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
                  <Link
                    href={`/admin/tests/${t.id}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {t.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <Badge>{t.mode}</Badge>
                    {t.isPublic && <Badge tone="green">Public</Badge>}
                    <span>{totalQ} questions</span>
                    <span>{t._count.attempts} attempts</span>
                    <span>{t.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
                <Link
                  href={`/admin/tests/${t.id}`}
                  className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
                >
                  Open
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: "green" }) {
  return (
    <span
      className={
        tone === "green"
          ? "rounded-full border border-green-500/40 bg-green-50 px-2 py-0.5 text-green-700 dark:bg-green-950/30 dark:text-green-300"
          : "rounded-full border border-border bg-muted px-2 py-0.5"
      }
    >
      {children}
    </span>
  );
}
