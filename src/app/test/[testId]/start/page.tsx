import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  BookText,
  Calculator,
  Clock,
  Info,
  KeyRound,
  ShieldAlert,
  Timer,
  Wrench,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { BeginButton } from "./begin-button";

export const metadata = { title: "Begin test" };

export default async function PreTestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;
  const session = await auth();

  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          modules: { include: { _count: { select: { moduleQuestions: true } } } },
        },
      },
    },
  });

  if (!test) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-16">
        <p className="text-sm text-muted-foreground">Test not found.</p>
      </main>
    );
  }
  if (!session?.user && !test.isPublic)
    redirect(`/login?callbackUrl=/test/${testId}/start`);

  const totalQuestions = test.sections
    .flatMap((s) => s.modules)
    .reduce((sum, m) => sum + m._count.moduleQuestions, 0);

  const emptyModules = test.sections.flatMap((s) =>
    s.modules
      .filter((m) => m._count.moduleQuestions === 0)
      .map(
        (m) =>
          `${s.type === "READING_WRITING" ? "R&W" : "Math"} Module ${m.moduleNumber}` +
          (m.difficulty === "MIXED" ? "" : ` (${m.difficulty})`),
      ),
  );
  const totalMinutes = test.sections.reduce(
    (sum, s) => sum + Math.round((s.module1TimeLimit + s.module2TimeLimit) / 60),
    0,
  );

  const displayName =
    session?.user?.name || session?.user?.email?.split("@")[0] || null;

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <header className="mt-4">
        <h1 className="text-4xl font-semibold tracking-tight">{test.title}</h1>
        {test.description && (
          <p className="mt-2 text-sm text-muted-foreground">{test.description}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant={test.mode === "ADAPTIVE" ? "info" : "muted"}>
            {test.mode}
          </Badge>
          <span className="inline-flex items-center gap-1.5">
            <BookText className="h-4 w-4" />
            {test.sections.length} section{test.sections.length === 1 ? "" : "s"}
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1.5">
            <KeyRound className="h-4 w-4" />
            {totalQuestions} question{totalQuestions === 1 ? "" : "s"}
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />~{totalMinutes} min
          </span>
        </div>
      </header>

      {/* ----- Section breakdown ----- */}
      <section className="mt-8 space-y-3">
        {test.sections.map((s) => {
          const Icon = s.type === "MATH" ? Calculator : BookText;
          const label = s.type === "MATH" ? "Math" : "Reading & Writing";
          const totalQ = s.modules.reduce(
            (sum, m) => sum + m._count.moduleQuestions,
            0,
          );
          const totalMin = Math.round(
            (s.module1TimeLimit + s.module2TimeLimit) / 60,
          );
          return (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.modules.length} modules · {totalQ} questions
                  </div>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div className="font-medium text-foreground">{totalMin} min</div>
                <div>per section</div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ----- Rules card ----- */}
      <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-base font-semibold">Before you begin</h2>
        <ul className="mt-4 space-y-3 text-sm">
          <Rule
            icon={Timer}
            label="Timer"
            description="Each module has its own timer. When it reaches zero, the module auto-submits."
          />
          <Rule
            icon={ShieldAlert}
            label="No going back"
            description="Once you submit a module, you can't return to it. Review your work before submitting."
          />
          <Rule
            icon={Wrench}
            label="Tools"
            description="Mark any question for review, eliminate answer choices, and jump between questions within the current module."
          />
          <Rule
            icon={Clock}
            label="Break"
            description="A 10-minute break separates the Reading & Writing section from the Math section. You can skip it."
          />
        </ul>
      </section>

      {/* ----- Important note ----- */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950/20 dark:text-blue-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          The test opens in <strong>fullscreen</strong>. Leaving fullscreen or
          switching tabs is logged.
        </span>
      </div>

      {/* ----- Begin button or empty-modules warning ----- */}
      {emptyModules.length > 0 ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <div className="font-medium">This test isn&apos;t ready to start.</div>
            <p className="mt-1 text-xs">The following modules have no questions yet:</p>
            <ul className="mt-2 list-disc pl-5 text-xs">
              {emptyModules.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <BeginButton testId={testId} />
          <p className="mt-3 text-xs text-muted-foreground">
            Keyboard shortcuts: A/B/C/D choose an answer,{" "}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
              ←
            </kbd>{" "}
            /{" "}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
              →
            </kbd>{" "}
            navigate,{" "}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
              M
            </kbd>{" "}
            marks for review,{" "}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
              E
            </kbd>{" "}
            toggles the answer eliminator.
          </p>
          {displayName && (
            <p className="mt-6 text-xs text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{displayName}</span>
            </p>
          )}
        </div>
      )}
    </main>
  );
}

function Rule({
  icon: Icon,
  label,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}) {
  return (
    <li className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div>
        <div className="font-medium text-foreground">{label}</div>
        <div className="text-muted-foreground">{description}</div>
      </div>
    </li>
  );
}
