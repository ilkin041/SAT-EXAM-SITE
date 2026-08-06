import {
  computeAttemptRoutes,
  computeRawScores,
  computeScaledScores,
  getScoreFidelity,
  type ScoreFidelity,
} from "@/lib/scoring";

export const ITEM_FLAG_MIN_EXPOSURES = 5;
export const TOO_EASY_THRESHOLD = 0.9;
export const TOO_HARD_THRESHOLD = 0.3;

export type ItemFlag = "TOO_EASY" | "TOO_HARD" | "DISTRACTOR_OUTDRAWS_KEY";

export interface ItemExposure {
  questionId: string;
  type: "MULTIPLE_CHOICE" | "STUDENT_PRODUCED_RESPONSE";
  correctAnswer: string;
  response: string;
  isCorrect: boolean;
  timeSpent: number;
}

export interface ResponseFrequency {
  response: string;
  count: number;
  percentage: number;
  isKey: boolean;
  isUnanswered: boolean;
}

export interface ItemAnalysis {
  questionId: string;
  exposures: number;
  correct: number;
  pValue: number;
  averageTimeSeconds: number | null;
  timedResponses: number;
  responses: ResponseFrequency[];
  flags: ItemFlag[];
}

export function computeItemAnalysis(exposures: ItemExposure[]): ItemAnalysis[] {
  const byQuestion = new Map<string, ItemExposure[]>();
  for (const exposure of exposures) {
    const bucket = byQuestion.get(exposure.questionId) ?? [];
    bucket.push(exposure);
    byQuestion.set(exposure.questionId, bucket);
  }

  return [...byQuestion.entries()].map(([questionId, rows]) => {
    const correct = rows.filter((row) => row.isCorrect).length;
    const timed = rows.filter((row) => row.timeSpent > 0);
    const counts = new Map<string, number>();
    for (const row of rows) {
      const response = row.response.trim() || "Unanswered";
      counts.set(response, (counts.get(response) ?? 0) + 1);
    }
    const key = rows[0].correctAnswer;
    const responses = [...counts.entries()]
      .map(([response, count]) => ({
        response,
        count,
        percentage: Math.round((count / rows.length) * 100),
        isKey: response === key,
        isUnanswered: response === "Unanswered",
      }))
      .sort((a, b) => b.count - a.count || a.response.localeCompare(b.response));

    const pValue = correct / rows.length;
    const flags: ItemFlag[] = [];
    if (rows.length >= ITEM_FLAG_MIN_EXPOSURES) {
      if (pValue >= TOO_EASY_THRESHOLD) flags.push("TOO_EASY");
      if (pValue <= TOO_HARD_THRESHOLD) flags.push("TOO_HARD");
      if (rows[0].type === "MULTIPLE_CHOICE") {
        const keyCount = responses.find((response) => response.isKey)?.count ?? 0;
        const wrongOutdrawsKey = responses.some(
          (response) =>
            !response.isKey && !response.isUnanswered && response.count > keyCount,
        );
        if (wrongOutdrawsKey) flags.push("DISTRACTOR_OUTDRAWS_KEY");
      }
    }

    return {
      questionId,
      exposures: rows.length,
      correct,
      pValue,
      averageTimeSeconds:
        timed.length > 0
          ? Math.round(timed.reduce((sum, row) => sum + row.timeSpent, 0) / timed.length)
          : null,
      timedResponses: timed.length,
      responses,
      flags,
    };
  });
}

export interface FocusEvent {
  type:
    | "blur"
    | "focus"
    | "fullscreen_exit"
    | "fullscreen_enter"
    | "BLUR"
    | "FOCUS"
    | "FULLSCREEN_EXIT"
    | "FULLSCREEN_ENTER";
  at: number;
}

export function summarizeFocusEvents(value: unknown) {
  const events = Array.isArray(value)
    ? value.flatMap((event) => {
        if (!event || typeof event !== "object" || !("type" in event)) return [];
        const type = typeof event.type === "string" ? event.type.toLowerCase() : "";
        if (!new Set(["blur", "focus", "fullscreen_exit", "fullscreen_enter"]).has(type)) {
          return [];
        }
        const at =
          "at" in event && typeof event.at === "number"
            ? event.at
            : "occurredAt" in event && event.occurredAt instanceof Date
              ? event.occurredAt.getTime()
              : "occurredAt" in event && typeof event.occurredAt === "string"
                ? new Date(event.occurredAt).getTime()
                : Number.NaN;
        return Number.isFinite(at) ? [{ type, at } as FocusEvent] : [];
      })
    : [];
  let lastBlur: number | null = null;
  let outOfFocusMs = 0;
  for (const event of [...events].sort((a, b) => a.at - b.at)) {
    if (event.type.toLowerCase() === "blur") lastBlur = event.at;
    if (event.type.toLowerCase() === "focus" && lastBlur !== null) {
      outOfFocusMs += Math.max(0, event.at - lastBlur);
      lastBlur = null;
    }
  }
  return {
    eventCount: events.length,
    blurCount: events.filter((event) => event.type.toLowerCase() === "blur").length,
    fullscreenExitCount: events.filter(
      (event) => event.type.toLowerCase() === "fullscreen_exit",
    ).length,
    outOfFocusSeconds: Math.round(outOfFocusMs / 1000),
  };
}

type ScoreModuleResult = {
  moduleId: string;
  routedTo: string | null;
  correctCount: number;
  totalCount: number;
  module: {
    moduleNumber: number;
    difficulty: "EASY" | "MEDIUM" | "HARD" | "MIXED";
    section: { type: "READING_WRITING" | "MATH" };
  };
};

export function computeAttemptScorePoint(attempt: {
  id: string;
  completedAt: Date | null;
  startedAt: Date;
  test: { title: string };
  moduleResults: ScoreModuleResult[];
}): {
  attemptId: string;
  date: Date;
  testTitle: string;
  total: number;
  readingWriting: number;
  math: number;
  fidelity: ScoreFidelity;
} | null {
  const results = attempt.moduleResults.map((result) => ({
    sectionType: result.module.section.type,
    correctCount: result.correctCount,
    totalCount: result.totalCount,
    moduleId: result.moduleId,
    routedTo: result.routedTo,
    moduleNumber: result.module.moduleNumber,
    difficulty: result.module.difficulty,
  }));
  const raw = computeRawScores(results);
  const fidelity = getScoreFidelity(raw);
  if (fidelity === "INCOMPLETE") return null;
  const scaled = computeScaledScores(raw, computeAttemptRoutes(results));
  return {
    attemptId: attempt.id,
    date: attempt.completedAt ?? attempt.startedAt,
    testTitle: attempt.test.title,
    total: scaled.total,
    readingWriting: scaled.readingWriting,
    math: scaled.math,
    fidelity,
  };
}
