import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
﻿import sanitizeHtml from "sanitize-html";
import { BarChart3, Flag, Gauge } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { computeItemAnalysis, type ItemFlag } from "@/lib/analytics";
import { readTableParams, type SortDir } from "@/lib/table-params";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ItemsTable, type ItemRow } from "./_components/items-table";

export const metadata: Metadata = pageMetadata({ title: "Item analysis — Admin", path: "/admin/analytics/items", noindex: true });

const PAGE_SIZE = 50;

export default async function ItemAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = readTableParams(sp);
  const q = params.q.toLowerCase();
  const testId = typeof sp.testId === "string" && sp.testId ? sp.testId : undefined;
  const section =
    sp.section === "READING_WRITING" || sp.section === "MATH" ? sp.section : undefined;
  const flag = isItemFlag(typeof sp.flag === "string" ? sp.flag : undefined)
    ? (sp.flag as ItemFlag)
    : undefined;

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
          domain: { select: { name: true } },
          skill: { select: { name: true } },
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
      const haystack = [plainText(question.stem), question.domain.name, question.skill?.name ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .sort(comparator(params.sort, params.dir));

  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const currentPage = Math.min(params.page, totalPages);
  const pageRows = allRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
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

  const rows: ItemRow[] = pageRows.map(({ question, analysis }) => ({
    id: question.id,
    stem: plainText(question.stem).slice(0, 150),
    testTitles: [...(testTitlesByQuestion.get(question.id) ?? [])].join(", "),
    domain: question.domain.name,
    skill: question.skill?.name ?? "",
    difficulty: question.difficulty,
    exposures: analysis.exposures,
    correct: analysis.correct,
    pValuePercent: Math.round(analysis.pValue * 100),
    averageTimeSeconds: analysis.averageTimeSeconds,
    timedResponses: analysis.timedResponses,
    flags: analysis.flags.map((itemFlag) => ({
      key: itemFlag,
      label: flagLabel(itemFlag),
      severe: itemFlag === "DISTRACTOR_OUTDRAWS_KEY",
    })),
    responses: analysis.responses.map((response) => ({
      response: response.response,
      isKey: response.isKey,
      count: response.count,
      percentage: response.percentage,
    })),
  }));

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

      <div className="my-6">
        <ItemsTable
          rows={rows}
          total={allRows.length}
          pageSize={PAGE_SIZE}
          tests={tests}
          testId={testId}
          section={section}
          flag={flag}
        />
      </div>
    </>
  );
}

function plainText(html: string) {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type AnalyzedRow = {
  question: { domain: { name: string }; skill: { name: string } | null; stem: string };
  analysis: {
    pValue: number;
    exposures: number;
    averageTimeSeconds: number | null;
  };
};

/**
 * `?sort=` over the computed analysis. Sorting happens here rather than in
 * `DataTable` because p-value and mean time are derived from every completed
 * attempt — the table only ever holds one page of them, so it cannot order the
 * set it is not given.
 *
 * The default stays p-value ascending: the hardest items first is what this
 * page is for.
 */
function comparator(
  sort: string | undefined,
  dir: SortDir,
): (a: AnalyzedRow, b: AnalyzedRow) => number {
  const factor = dir === "desc" ? -1 : 1;
  const by: Record<string, (row: AnalyzedRow) => string | number> = {
    question: (row) => plainText(row.question.stem).toLowerCase(),
    taxonomy: (row) =>
      `${row.question.domain.name} ${row.question.skill?.name ?? ""}`.toLowerCase(),
    exposure: (row) => row.analysis.exposures,
    pValue: (row) => row.analysis.pValue,
    // An untimed item has no mean, and -1 keeps every one of them together at
    // one end rather than scattered through the middle as zeroes.
    time: (row) => row.analysis.averageTimeSeconds ?? -1,
  };
  // `hasOwnProperty`, not `by[sort]` — see `orderByFrom`. `?sort=constructor`
  // finds a truthy non-ordering on `Object.prototype` and `?sort=__proto__`
  // finds something that is not callable at all.
  const pick =
    sort && Object.prototype.hasOwnProperty.call(by, sort) ? by[sort] : by.pValue;
  return (a, b) => {
    const left = pick(a);
    const right = pick(b);
    if (typeof left === "number" && typeof right === "number") {
      return factor * (left - right);
    }
    return factor * String(left).localeCompare(String(right));
  };
}

function isItemFlag(value: string | undefined): value is ItemFlag {
  return value === "TOO_EASY" || value === "TOO_HARD" || value === "DISTRACTOR_OUTDRAWS_KEY";
}

function flagLabel(flag: ItemFlag) {
  if (flag === "TOO_EASY") return "Too easy";
  if (flag === "TOO_HARD") return "Too hard";
  return "Distractor outdraws key";
}
