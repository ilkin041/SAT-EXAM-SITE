import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
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
      <main className="container mx-auto max-w-2xl py-16">
        <p className="text-sm text-muted-foreground">Test not found.</p>
      </main>
    );
  }
  if (!session?.user && !test.isPublic) redirect(`/login?callbackUrl=/test/${testId}/start`);

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

  return (
    <main className="container mx-auto max-w-2xl py-16">
      <Link href="/dashboard" className="text-xs text-muted-foreground hover:underline">
        ← Back
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{test.title}</h1>
      {test.description && (
        <p className="mt-2 text-sm text-muted-foreground">{test.description}</p>
      )}

      <div className="mt-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-medium">Before you begin</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-medium">Format:</span> {test.mode === "ADAPTIVE" ? "Adaptive" : "Linear"} —{" "}
            {test.sections.length} sections, ~{totalMinutes} minutes total, {totalQuestions} questions.
          </li>
          <li>
            <span className="font-medium">Timer:</span> Each module has its own timer. When it
            reaches zero, the module auto-submits.
          </li>
          <li>
            <span className="font-medium">No going back:</span> Once you submit a module, you can't
            return to it.
          </li>
          <li>
            <span className="font-medium">Tools:</span> Mark any question for review, eliminate
            answer choices, and jump between questions within the current module.
          </li>
          <li>
            <span className="font-medium">Break:</span> A 10-minute break separates the Reading &
            Writing section from the Math section. You can skip it.
          </li>
        </ul>
      </div>

      {emptyModules.length > 0 ? (
        <div className="mt-6 rounded-md border border-amber-400/40 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          <div className="font-medium">This test isn't ready to start.</div>
          <p className="mt-1 text-xs">
            The following modules have no questions yet:
          </p>
          <ul className="mt-2 list-disc pl-5 text-xs">
            {emptyModules.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-6">
          <BeginButton testId={testId} />
        </div>
      )}
    </main>
  );
}
