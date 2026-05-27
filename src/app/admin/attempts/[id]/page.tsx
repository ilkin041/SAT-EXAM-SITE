import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  computeRawScores,
  computeScaledScores,
  type ScoringTable,
} from "@/lib/scoring";

export const metadata = { title: "Attempt — Admin" };

interface FocusEvent {
  type: "blur" | "focus" | "fullscreen_exit" | "fullscreen_enter";
  at: number;
}

export default async function AttemptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const attempt = await prisma.testAttempt.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true } },
      test: { select: { id: true, title: true, scoringTable: true } },
      moduleResults: {
        include: {
          module: { include: { section: { select: { type: true } } } },
        },
      },
      answers: true,
    },
  });
  if (!attempt) notFound();

  const moduleResults = attempt.moduleResults.map((r) => ({
    sectionType: r.module.section.type,
    correctCount: r.correctCount,
    totalCount: r.totalCount,
  }));
  const raw = computeRawScores(moduleResults);
  const scaled = computeScaledScores(
    raw,
    (attempt.test.scoringTable as ScoringTable | null) ?? null,
  );

  const events = ((attempt.focusEvents as FocusEvent[] | null) ?? []).slice().reverse();
  const blurs = events.filter((e) => e.type === "blur").length;
  const fullscreenExits = events.filter((e) => e.type === "fullscreen_exit").length;

  // Roughly compute time spent out of focus by pairing consecutive blur/focus events.
  let outOfFocusMs = 0;
  let lastBlur: number | null = null;
  // events is reversed; iterate chronologically
  for (const e of [...events].reverse()) {
    if (e.type === "blur") lastBlur = e.at;
    else if (e.type === "focus" && lastBlur != null) {
      outOfFocusMs += Math.max(0, e.at - lastBlur);
      lastBlur = null;
    }
  }
  const outOfFocusSec = Math.round(outOfFocusMs / 1000);

  return (
    <>
      <Link href="/admin" className="text-xs text-muted-foreground hover:underline">
        ← Admin
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Attempt</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {attempt.user?.email ?? "anonymous"} · {attempt.test.title} · {attempt.status}
      </p>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total scaled" value={scaled.total} hint="400–1600" />
        <Stat
          label="R&W"
          value={scaled.readingWriting}
          hint={`${raw.readingWriting.correct}/${raw.readingWriting.total} raw`}
        />
        <Stat
          label="Math"
          value={scaled.math}
          hint={`${raw.math.correct}/${raw.math.total} raw`}
        />
      </section>

      <section className="mt-8 rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Focus-event log</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {blurs} tab-switch{blurs === 1 ? "" : "es"} · {fullscreenExits} fullscreen exit
          {fullscreenExits === 1 ? "" : "s"} · ~{outOfFocusSec}s out of focus
        </p>
        {events.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">No events recorded.</p>
        ) : (
          <ul className="mt-3 max-h-60 space-y-1 overflow-y-auto text-xs">
            {events.map((e, i) => (
              <li key={i} className="flex justify-between font-mono">
                <span>{e.type}</span>
                <span className="text-muted-foreground">
                  {new Date(e.at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-medium">Modules served</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {attempt.moduleResults.map((r) => (
            <li key={r.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <div className="font-medium">
                  {r.module.section.type === "READING_WRITING" ? "R&W" : "Math"} · Module{" "}
                  {r.module.moduleNumber} ({r.module.difficulty})
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.correctCount}/{r.totalCount} correct
                  {r.routedTo && ` · routed to module ${r.routedTo.slice(0, 6)}…`}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <Link
          href={`/results/${attempt.id}/review`}
          className="inline-block rounded-md border border-input px-4 py-2 text-sm hover:bg-accent"
        >
          View full answer review →
        </Link>
      </section>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
