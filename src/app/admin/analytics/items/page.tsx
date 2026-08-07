import Link from "next/link";
import sanitizeHtml from "sanitize-html";
import { BarChart3, Clock, Flag, Gauge } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { computeItemAnalysis, type ItemFlag } from "@/lib/analytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

export const metadata = { title: "Item analysis — Admin" };

const PAGE_SIZE = 50;

export default async function ItemAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    testId?: string;
    section?: string;
    flag?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const testId = sp.testId || undefined;
  const section =
    sp.section === "READING_WRITING" || sp.section === "MATH" ? sp.section : undefined;
  const flag = isItemFlag(sp.flag) ? sp.flag : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const [attempts, tests] = await Promise.all([
    prisma.testAttempt.findMany({
      where: { status: "COMPLETED", ...(testId ? { testId } : {}) },
      select: {
        id: true,
        test: { select: { title: true } },
        questionSnapshots: {
          select: { questionId: true, questionType: true, correctAnswer: true },
        },
        moduleResults: {
          select: {
            module: {
              select: {
                moduleQuestions: { select: { questionId: true } },
              },
            },
          },
        },
        answers: {
          select: { questionId: true, response: true, isCorrect: true, timeSpent: true },
        },
      },
    }),
    prisma.test.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  const questionIds = [...new Set(attempts.flatMap((attempt) =>
    attempt.questionSnapshots.length > 0
      ? attempt.questionSnapshots.map((snapshot) => snapshot.questionId)
      : attempt.moduleResults.flatMap((result) =>
          result.module.moduleQuestions.map((assignment) => assignment.questionId),
        ),
  ))];
  const questions = questionIds.length
    ? await prisma.question.findMany({
        where: { id: { in: questionIds }, ...(section ? { sectionType: section } : {}) },
        select: {
          id: true,
          sectionType: true,
          type: true,
          domain: true,
          skill: true,
          difficulty: true,
          stem: true,
          correctAnswer: true,
        },
      })
    : [];
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const testTitlesByQuestion = new Map<string, Set<string>>();

  const exposures = attempts.flatMap((attempt) => {
    const answerByQuestion = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
    const served = attempt.questionSnapshots.length > 0
      ? attempt.questionSnapshots
      : [...new Set(attempt.moduleResults.flatMap((result) =>
          result.module.moduleQuestions.map((assignment) => assignment.questionId),
        ))].flatMap((questionId) => {
          const question = questionById.get(questionId);
          return question
            ? [{ questionId, questionType: question.type, correctAnswer: question.correctAnswer }]
            : [];
        });
    return served.flatMap((snapshot) => {
      if (!questionById.has(snapshot.questionId)) return [];
      const answer = answerByQuestion.get(snapshot.questionId);
      const titles = testTitlesByQuestion.get(snapshot.questionId) ?? new Set<string>();
      titles.add(attempt.test.title);
      testTitlesByQuestion.set(snapshot.questionId, titles);
      return [{
        questionId: snapshot.questionId,
        type: snapshot.questionType,
        correctAnswer: snapshot.correctAnswer,
        response: answer?.response ?? "",
        isCorrect: answer?.isCorrect ?? false,
        timeSpent: answer?.timeSpent ?? 0,
      }];
    });
  });

  const analysisById = new Map(
    computeItemAnalysis(exposures).map((analysis) => [analysis.questionId, analysis]),
  );
  const allRows = questions
    .flatMap((question) => {
      const analysis = analysisById.get(question.id);
      if (!analysis) return [];
      return [{ question, analysis }];
    })
    .filter(({ question, analysis }) => {
      if (flag && !analysis.flags.includes(flag)) return false;
      if (!q) return true;
      const haystack = [plainText(question.stem), question.domain, question.skill ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => a.analysis.pValue - b.analysis.pValue);

  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = allRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const flaggedCount = allRows.filter((row) => row.analysis.flags.length > 0).length;
  const legacyAttemptCount = attempts.filter(
    (attempt) => attempt.questionSnapshots.length === 0,
  ).length;
  const averageP = allRows.length
    ? Math.round((allRows.reduce((sum, row) => sum + row.analysis.pValue, 0) / allRows.length) * 100)
    : 0;
  const timed = allRows.filter((row) => row.analysis.averageTimeSeconds !== null);
  const averageTime = timed.length
    ? Math.round(timed.reduce((sum, row) => sum + (row.analysis.averageTimeSeconds ?? 0), 0) / timed.length)
    : 0;

  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (testId) params.set("testId", testId);
    if (section) params.set("section", section);
    if (flag) params.set("flag", flag);
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return `/admin/analytics/items${query ? `?${query}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Item analysis"
        description="Completed-attempt p-values, response frequencies, and timing. Unanswered served items remain in the denominator."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Analyzed items" value={allRows.length} icon={BarChart3} accentColor="blue" />
        <StatCard label="Flagged items" value={flaggedCount} icon={Flag} accentColor="amber" hint="Minimum 5 exposures" />
        <StatCard label="Average p-value" value={`${averageP}%`} icon={Gauge} accentColor="violet" hint={averageTime ? `Mean item time ${averageTime}s` : "No timing yet"} />
      </div>

      {legacyAttemptCount > 0 && (
        <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-50/60 px-4 py-3 text-caption text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          {legacyAttemptCount} historical completed attempt{legacyAttemptCount === 1 ? "" : "s"} predate immutable question snapshots. Their exposure denominator uses the recorded modules served; correctness still comes from the saved Answer row. New attempts use snapshots throughout.
        </p>
      )}

      <form method="get" className="my-6 grid gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm md:grid-cols-[1fr_auto_auto_auto_auto]">
        <Input name="q" defaultValue={sp.q ?? ""} placeholder="Search stem, domain, or skill" />
        <select name="testId" defaultValue={testId ?? ""} className={selectClass}>
          <option value="">All tests</option>
          {tests.map((test) => <option key={test.id} value={test.id}>{test.title}</option>)}
        </select>
        <select name="section" defaultValue={section ?? ""} className={selectClass}>
          <option value="">All sections</option>
          <option value="READING_WRITING">R&amp;W</option>
          <option value="MATH">Math</option>
        </select>
        <select name="flag" defaultValue={flag ?? ""} className={selectClass}>
          <option value="">All flags</option>
          <option value="TOO_EASY">Too easy</option>
          <option value="TOO_HARD">Too hard</option>
          <option value="DISTRACTOR_OUTDRAWS_KEY">Distractor outdraws key</option>
        </select>
        <Button type="submit">Filter</Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState icon={BarChart3} title="No analyzable items" description="Complete attempts or broaden the current filters." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
          <table className="w-full min-w-[980px] text-body">
            <thead className="border-b border-border bg-muted/40 text-left text-caption uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Taxonomy</th>
                <th className="px-4 py-3 text-center">Exposure</th>
                <th className="px-4 py-3 text-center">p-value</th>
                <th className="px-4 py-3 text-center">Avg. time</th>
                <th className="px-4 py-3">Flags / responses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map(({ question, analysis }) => (
                <tr key={question.id} className="align-top hover:bg-muted/20">
                  <td className="max-w-md px-4 py-4">
                    <Link href={`/admin/questions/${question.id}`} className="font-semibold text-primary hover:underline">
                      {plainText(question.stem).slice(0, 150) || "Untitled question"}
                    </Link>
                    <div className="mt-1 text-caption text-muted-foreground">
                      {[...(testTitlesByQuestion.get(question.id) ?? [])].join(", ")}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-caption">
                    <div className="font-medium">{question.domain}</div>
                    <div className="text-muted-foreground">{question.skill || "No skill"} · {question.difficulty}</div>
                  </td>
                  <td className="px-4 py-4 text-center tabular">{analysis.exposures}</td>
                  <td className="px-4 py-4 text-center">
                    <div className="font-bold tabular">{Math.round(analysis.pValue * 100)}%</div>
                    <div className="text-caption text-muted-foreground">{analysis.correct}/{analysis.exposures}</div>
                  </td>
                  <td className="px-4 py-4 text-center tabular">
                    {analysis.averageTimeSeconds === null ? "—" : `${analysis.averageTimeSeconds}s`}
                    <div className="text-caption text-muted-foreground">{analysis.timedResponses} timed</div>
                  </td>
                  <td className="max-w-sm px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {analysis.flags.length === 0 ? <Badge variant="muted">No flag</Badge> : analysis.flags.map((itemFlag) => (
                        <Badge key={itemFlag} variant={itemFlag === "DISTRACTOR_OUTDRAWS_KEY" ? "destructive" : "warning"}>
                          {flagLabel(itemFlag)}
                        </Badge>
                      ))}
                    </div>
                    <details className="mt-2 text-caption">
                      <summary className="cursor-pointer font-semibold text-primary">Response frequencies</summary>
                      <div className="mt-2 space-y-1">
                        {analysis.responses.map((response) => (
                          <div key={response.response} className="flex justify-between gap-4">
                            <span className={response.isKey ? "font-bold text-emerald-700" : "text-muted-foreground"}>
                              {response.response}{response.isKey ? " (key)" : ""}
                            </span>
                            <span className="tabular">{response.count} · {response.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          {currentPage <= 1 ? (
            <Button variant="secondary" size="sm" disabled>Previous</Button>
          ) : (
            <Button asChild variant="secondary" size="sm">
              <Link href={pageHref(currentPage - 1)}>Previous</Link>
            </Button>
          )}
          <span className="text-caption text-muted-foreground">Page {currentPage} of {totalPages}</span>
          {currentPage >= totalPages ? (
            <Button variant="secondary" size="sm" disabled>Next</Button>
          ) : (
            <Button asChild variant="secondary" size="sm">
              <Link href={pageHref(currentPage + 1)}>Next</Link>
            </Button>
          )}
        </div>
      )}

      <p className="mt-6 flex items-center gap-2 text-caption text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> Flags require at least five completed-attempt exposures: p ≥ 0.90 is too easy; p ≤ 0.30 is too hard.
      </p>
    </>
  );
}

const selectClass = "h-10 rounded-xl border border-input bg-card px-3 text-body";

function plainText(html: string) {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isItemFlag(value: string | undefined): value is ItemFlag {
  return value === "TOO_EASY" || value === "TOO_HARD" || value === "DISTRACTOR_OUTDRAWS_KEY";
}

function flagLabel(flag: ItemFlag) {
  if (flag === "TOO_EASY") return "Too easy";
  if (flag === "TOO_HARD") return "Too hard";
  return "Distractor outdraws key";
}
