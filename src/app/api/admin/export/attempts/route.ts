import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { computeAttemptScorePoint, summarizeFocusEvents } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();

    const attempts = await prisma.testAttempt.findMany({
      where: { status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      include: {
        user: { select: { email: true, name: true } },
        test: { select: { title: true } },
        answers: {
          select: { questionId: true, response: true, isCorrect: true, timeSpent: true },
        },
        questionSnapshots: {
          select: { questionId: true, correctAnswer: true },
        },
        events: { orderBy: { occurredAt: "asc" } },
        moduleResults: {
          include: {
            module: {
              include: {
                section: { select: { type: true } },
                moduleQuestions: {
                  orderBy: { order: "asc" },
                  include: {
                    question: {
                      select: {
                        id: true,
                        type: true,
                        domain: true,
                        skill: true,
                        difficulty: true,
                        correctAnswer: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const headers = [
      "Attempt ID",
      "Student Name",
      "Student Email",
      "Test Title",
      "Date Completed",
      "Total Score",
      "Reading & Writing Score",
      "Math Score",
      "Score Fidelity",
      "Focus Event Count",
      "Tab Blur Count",
      "Fullscreen Exit Count",
      "Out of Focus Seconds",
      "Question ID",
      "Section",
      "Module",
      "Question Type",
      "Domain",
      "Skill",
      "Difficulty",
      "Student Response",
      "Answered",
      "Correct",
      "Time Spent Seconds",
      "Answer Key",
      "Answer Key Source",
    ];

    const rows = attempts.flatMap((attempt) => {
      const score = computeAttemptScorePoint(attempt);
      const focus = summarizeFocusEvents(attempt.events);
      const answerByQuestion = new Map(
        attempt.answers.map((answer) => [answer.questionId, answer]),
      );
      const keyByQuestion = new Map(
        attempt.questionSnapshots.map((snapshot) => [
          snapshot.questionId,
          snapshot.correctAnswer,
        ]),
      );
      const snapshotQuestionIds = new Set(
        attempt.questionSnapshots.map((snapshot) => snapshot.questionId),
      );
      const attemptColumns = [
        attempt.id,
        attempt.user?.name ?? "anonymous",
        attempt.user?.email ?? "",
        attempt.test.title,
        attempt.completedAt?.toISOString() ?? "",
        score?.total ?? "",
        score?.readingWriting ?? "",
        score?.math ?? "",
        score?.fidelity ?? "INCOMPLETE",
        focus.eventCount,
        focus.blurCount,
        focus.fullscreenExitCount,
        focus.outOfFocusSeconds,
      ];

      const questionRows = attempt.moduleResults.flatMap((result) =>
        result.module.moduleQuestions.map((assignment) => {
          const question = assignment.question;
          const answer = answerByQuestion.get(question.id);
          return [
            ...attemptColumns,
            question.id,
            result.module.section.type,
            result.module.moduleNumber,
            question.type,
            question.domain,
            question.skill ?? "",
            question.difficulty,
            answer?.response ?? "",
            answer?.response.trim() ? "yes" : "no",
            answer?.isCorrect ? "yes" : "no",
            answer?.timeSpent ?? 0,
            keyByQuestion.get(question.id) ?? question.correctAnswer,
            snapshotQuestionIds.has(question.id) ? "attempt snapshot" : "current question fallback",
          ];
        }),
      );

      return questionRows.length > 0
        ? questionRows
        : [[...attemptColumns, "", "", "", "", "", "", "", "", "no", "no", 0, "", ""]];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="attempt_question_export.csv"',
      },
    });
  } catch (error: unknown) {
    console.error("Export error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

function csvCell(value: string | number) {
  const escaped = String(value).replace(/"/g, '""');
  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}
