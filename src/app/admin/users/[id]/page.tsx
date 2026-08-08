import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, ShieldCheck, User as UserIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format-date";
import { AdminResetPasswordModal } from "@/components/admin-reset-password-modal";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { ScoreTrend } from "@/components/score-trend";
import { computeAttemptScorePoint } from "@/lib/analytics";
import {
  computeAttemptRoutes,
  computeRawScores,
  computeScaledScores,
  getScoreFidelity,
} from "@/lib/scoring";
import {
  UserAttemptsTable,
  type UserAttemptRow,
} from "./_components/user-attempts-table";

export const metadata = { title: "User detail — Admin" };

const STATUS_LABELS = {
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  EXPIRED: "Expired",
  ABANDONED: "Abandoned",
} as const;

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
          test: { select: { title: true } },
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
  const scorePoints = user.attempts
    .filter((attempt) => attempt.status === "COMPLETED")
    .map(computeAttemptScorePoint)
    .filter((point): point is NonNullable<typeof point> => point !== null)
    .filter((point) => point.fidelity === "FULL_LENGTH");

  const attemptRows: UserAttemptRow[] = user.attempts.map((attempt) => {
    const liveResults = attempt.moduleResults.filter((r) => r.module && r.module.section);
    const moduleResults = liveResults.map((r) => ({
      sectionType: r.module.section.type,
      correctCount: r.correctCount,
      totalCount: r.totalCount,
      moduleId: r.moduleId,
      routedTo: r.routedTo,
      moduleNumber: r.module.moduleNumber,
      difficulty: r.module.difficulty,
    }));
    const raw = computeRawScores(moduleResults);
    const scaled = computeScaledScores(raw, computeAttemptRoutes(moduleResults));
    const scoreFidelity = getScoreFidelity(raw);
    const scored = attempt.status === "COMPLETED" && scoreFidelity !== "INCOMPLETE";

    return {
      id: attempt.id,
      testTitle: attempt.test.title,
      status: attempt.status,
      statusLabel: STATUS_LABELS[attempt.status],
      total: scored ? scaled.total : null,
      estimated: scoreFidelity === "ESTIMATE",
      started: formatDate(attempt.startedAt),
      startedAtMs: attempt.startedAt.getTime(),
    };
  });

  return (
    <>
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-caption text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to users
      </Link>
      <header className="mt-2 mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-h3 text-primary-foreground">
            {(user.name?.[0] ?? user.email[0]).toUpperCase()}
          </div>
          <div>
            <h1 className="text-h2">{display}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
              <Badge variant={user.role === "ADMIN" ? "info" : "muted"}>
                {user.role}
              </Badge>
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user.email}
              </span>
              <span>· joined {formatDate(user.createdAt)}</span>
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

      <section className="mt-10">
        <ScoreTrend points={scorePoints} admin />
      </section>

      {/* ----- Recent attempts ----- */}
      <section className="mt-10">
        <h2 className="mb-3 text-h3">Recent attempts</h2>
        <UserAttemptsTable rows={attemptRows} />
      </section>

      {/* ----- Danger zone ----- */}
      <section className="mt-12">
        <h2 className="mb-3 text-h3 text-destructive">Danger zone</h2>
        <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-body font-semibold">Reset password</div>
            <p className="mt-0.5 text-caption text-muted-foreground">
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

