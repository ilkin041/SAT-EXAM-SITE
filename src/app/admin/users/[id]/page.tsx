import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, ShieldCheck, User as UserIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AdminResetPasswordModal } from "@/components/admin-reset-password-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import {
  computeRawScores,
  computeScaledScores,
  type ScoringTable,
} from "@/lib/scoring";

export const metadata = { title: "User detail — Admin" };

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      attempts: {
        orderBy: { startedAt: "desc" },
        take: 20,
        include: {
          test: { select: { title: true, scoringTable: true } },
          moduleResults: {
            include: {
              module: { include: { section: { select: { type: true } } } },
            },
          },
        },
      },
    },
  });
  if (!user) notFound();

  const display = user.name || user.email;
  const totalAttempts = user.attempts.length;
  const completedAttempts = user.attempts.filter((a) => a.status === "COMPLETED").length;

  return (
    <>
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to users
      </Link>
      <header className="mt-2 mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
            {(user.name?.[0] ?? user.email[0]).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{display}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={user.role === "ADMIN" ? "info" : "muted"}>
                {user.role}
              </Badge>
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user.email}
              </span>
              <span>· joined {user.createdAt.toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total attempts"
          value={totalAttempts}
          icon={UserIcon}
        />
        <StatCard
          label="Completed"
          value={completedAttempts}
          icon={ShieldCheck}
        />
        <StatCard
          label="In progress"
          value={user.attempts.filter((a) => a.status === "IN_PROGRESS").length}
        />
      </section>

      {/* ----- Recent attempts ----- */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Recent attempts</h2>
        {user.attempts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
            This user hasn&apos;t started any attempts yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Test</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Score</th>
                  <th className="px-4 py-2.5 font-medium">Started</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {user.attempts.map((a) => {
                  const liveResults = a.moduleResults.filter(
                    (r) => r.module && r.module.section,
                  );
                  const moduleResults = liveResults.map((r) => ({
                    sectionType: r.module.section.type,
                    correctCount: r.correctCount,
                    totalCount: r.totalCount,
                  }));
                  const raw = computeRawScores(moduleResults);
                  const scaled = computeScaledScores(
                    raw,
                    (a.test.scoringTable as ScoringTable | null) ?? null,
                  );
                  const isDone = a.status === "COMPLETED";
                  return (
                    <tr key={a.id} className="transition-colors hover:bg-accent/40">
                      <td className="px-4 py-3 font-medium">{a.test.title}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            a.status === "COMPLETED"
                              ? "success"
                              : a.status === "IN_PROGRESS"
                                ? "warning"
                                : "muted"
                          }
                        >
                          {a.status === "IN_PROGRESS"
                            ? "In progress"
                            : isDone
                              ? "Completed"
                              : "Abandoned"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {isDone ? (
                          <span className="font-semibold">{scaled.total}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {a.startedAt.toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild variant="secondary" size="sm">
                          <Link href={`/admin/attempts/${a.id}`}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ----- Danger zone ----- */}
      <section className="mt-12">
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-destructive">
          Danger zone
        </h2>
        <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold">Reset password</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Generate a one-time temporary password you can share with this
              student. Any existing password reset links are invalidated.
            </p>
          </div>
          <AdminResetPasswordModal userId={user.id} userName={display} />
        </div>
      </section>
    </>
  );
}
