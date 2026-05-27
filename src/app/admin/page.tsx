import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Admin — SAT Practice" };

export default async function AdminDashboard() {
  const [testCount, studentCount, attemptCount, recentAttempts] = await Promise.all([
    prisma.test.count(),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.testAttempt.count(),
    prisma.testAttempt.findMany({
      orderBy: { startedAt: "desc" },
      take: 8,
      include: {
        user: { select: { email: true, name: true } },
        test: { select: { title: true } },
      },
    }),
  ]);

  return (
    <>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Tests" value={testCount} />
        <Stat label="Students" value={studentCount} />
        <Stat label="Attempts" value={attemptCount} />
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-medium">Recent attempts</h2>
          <Link
            href="/admin/attempts"
            className="text-xs text-muted-foreground hover:underline"
          >
            View all →
          </Link>
        </div>
        {recentAttempts.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            No attempts yet.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {recentAttempts.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/attempts/${a.id}`}
                  className="flex items-center justify-between p-4 text-sm hover:bg-accent"
                >
                  <div>
                    <div className="font-medium">{a.test.title}</div>
                    <div className="text-muted-foreground">
                      {a.user?.name ?? a.user?.email ?? "anonymous"} · {a.status}
                    </div>
                  </div>
                  <div className="text-right text-muted-foreground">
                    {a.startedAt.toLocaleString()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
    </div>
  );
}
