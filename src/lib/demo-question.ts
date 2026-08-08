/**
 * The landing page's three-question demo, as data and rules (T3.3).
 *
 * Pure — no Prisma, no React, no `next/*`. It is imported by the server
 * component that runs the query, by the grading route handler, and by the
 * client island, which is the reason it holds no I/O: the island would
 * otherwise drag Prisma's types (and `readRenderedQuestion`'s KaTeX import)
 * toward the browser bundle the demo is size-budgeted against.
 *
 * What the demo deliberately is *not*: an attempt. No `TestAttempt` row, no
 * `AttemptQuestionSnapshot`, no anonymous-attempt cookie. Progress lives in
 * `sessionStorage` and is gone when the tab closes, and nothing is migrated on
 * signup. `/practice` is the real unauthenticated path — this is its front
 * door, not a competitor to it.
 */

/** How many questions the demo shows. Three: one R&W, two Math. */
export const DEMO_QUESTION_COUNT = 3;

/** `sessionStorage` key. Versioned so a shape change cannot resurrect a stale blob. */
export const DEMO_STORAGE_KEY = "sat_demo_v1";

/**
 * Cache tag for the served-questions query.
 *
 * Lives here rather than in the server component so `admin/questions/actions.ts`
 * can invalidate it without importing a module that pulls Prisma and KaTeX into
 * an already-large server action file.
 */
export const DEMO_QUESTIONS_TAG = "landing-demo-questions";

/** A question as the browser is allowed to see it: no key, no explanation. */
export interface DemoQuestion {
  id: string;
  sectionType: "READING_WRITING" | "MATH";
  /** Already rendered and sanitized on the server — see `RichHtml`. */
  stemHtml: string;
  passageHtml: string | null;
  choices: { label: DemoChoiceLabel; html: string }[];
}

export type DemoChoiceLabel = "A" | "B" | "C" | "D";

export const DEMO_CHOICE_LABELS: DemoChoiceLabel[] = ["A", "B", "C", "D"];

/** What `/api/demo/answer` returns once a choice is submitted. */
export interface DemoVerdict {
  correct: boolean;
  correctAnswer: DemoChoiceLabel;
  /** The authored explanation, rendered. Null when the question has none. */
  explanationHtml: string | null;
}

/** One answered question, as held in `sessionStorage`. */
export interface DemoAnswerRecord {
  questionId: string;
  response: DemoChoiceLabel;
  correct: boolean;
  /** Time on that question, from first interaction with it to submit. */
  elapsedMs: number;
}

/**
 * The module eyebrow, matching the real test interface's chrome exactly —
 * `MODULE 1 · MATH`. The demo is one module by construction, so the number is
 * a literal rather than something to thread through.
 */
export function demoModuleLabel(sectionType: DemoQuestion["sectionType"]): string {
  return sectionType === "MATH" ? "Module 1 · Math" : "Module 1 · Reading and Writing";
}

/**
 * `1m 12s`, `48s`, `0s`.
 *
 * Never `01:12`: a colon-separated figure reads as a countdown, and this one
 * counts up and carries no deadline. Seconds are floored, so the demo never
 * claims more time than the visitor spent.
 */
export function formatDemoDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export interface DemoSummary {
  correctCount: number;
  totalCount: number;
  /** `2 of 3` — the whole claim. */
  scoreText: string;
  /** `1m 12s`. */
  durationText: string;
}

/**
 * The end-of-demo summary.
 *
 * Three questions cannot support a score projection and the summary must not
 * invent one — "you're on track for 1350" from three items is exactly the
 * fabricated number the copy rules forbid. It reports what happened: how many
 * were right, and how long it took.
 */
export function buildDemoSummary(answers: DemoAnswerRecord[]): DemoSummary {
  const correctCount = answers.filter((a) => a.correct).length;
  const totalMs = answers.reduce((sum, a) => sum + Math.max(0, a.elapsedMs), 0);
  return {
    correctCount,
    totalCount: answers.length,
    scoreText: `${correctCount} of ${answers.length}`,
    durationText: formatDemoDuration(totalMs),
  };
}

/**
 * Toggle a choice in the eliminated list.
 *
 * Eliminating the choice that is currently selected does not deselect it — the
 * real interface behaves the same way, because striking a choice out is a note
 * to yourself and clearing your answer is not.
 */
export function toggleEliminated(
  current: DemoChoiceLabel[],
  label: DemoChoiceLabel,
): DemoChoiceLabel[] {
  return current.includes(label)
    ? current.filter((l) => l !== label)
    : [...current, label];
}

/** Shape held in `sessionStorage`. Anything unrecognised is discarded, not repaired. */
export interface DemoProgress {
  index: number;
  answers: DemoAnswerRecord[];
}

/**
 * Read persisted progress defensively.
 *
 * A visitor can hand-edit `sessionStorage`, and a stale blob can outlive a
 * deploy that changed which questions the demo serves. Both are the same case:
 * anything that does not parse, or that names a question no longer being
 * served, drops back to a fresh demo rather than throwing in a hydration pass.
 */
export function parseDemoProgress(raw: string | null, servedIds: string[]): DemoProgress {
  const empty: DemoProgress = { index: 0, answers: [] };
  if (!raw) return empty;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (!parsed || typeof parsed !== "object") return empty;

  const { answers } = parsed as { answers?: unknown };
  if (!Array.isArray(answers)) return empty;

  const clean: DemoAnswerRecord[] = [];
  for (const entry of answers) {
    if (!entry || typeof entry !== "object") return empty;
    const { questionId, response, correct, elapsedMs } = entry as Record<string, unknown>;
    if (typeof questionId !== "string" || !servedIds.includes(questionId)) return empty;
    if (typeof response !== "string" || !DEMO_CHOICE_LABELS.includes(response as DemoChoiceLabel)) {
      return empty;
    }
    if (typeof correct !== "boolean" || typeof elapsedMs !== "number") return empty;
    clean.push({
      questionId,
      response: response as DemoChoiceLabel,
      correct,
      elapsedMs: Math.max(0, elapsedMs),
    });
  }

  // Answers are recorded in order, so the count *is* the position. A stored
  // index is a second source of truth that can disagree with the array.
  if (clean.length > servedIds.length) return empty;
  return { index: clean.length, answers: clean };
}
